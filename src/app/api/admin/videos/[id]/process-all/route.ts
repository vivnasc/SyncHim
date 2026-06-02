import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { uploadJson, publicUrl } from '@/lib/admin/storage';
import { dispatchWorkflow } from '@/lib/admin/dispatch';
import { BRAND, FORMATO_VIDEO } from '@/lib/admin/brand';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/admin/videos/{id}/process-all
 * Body opcional: { skipRender?: boolean }
 *
 * Pipeline completo por reel:
 *   1. Para cada cena sem voice_url, gera narracao via ElevenLabs
 *   2. Se nao tiver musicUrl em metadata e existir theme-music settings,
 *      aplica o tema (sem chamar Suno)
 *   3. Dispara render-video.yml no GH Actions
 *
 * Pode falhar em qualquer passo e devolve detalhe sobre onde parou.
 * Idempotente: pula passos ja feitos.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminEmailFromRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { skipRender?: boolean } | null;

  const supabase = createSupabaseAdmin();
  const { data: item } = await supabase
    .from('content_items').select('*').eq('id', params.id).eq('type', 'video').maybeSingle();
  if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const { data: scenes } = await supabase
    .from('content_slides').select('*').eq('item_id', item.id).order('idx', { ascending: true });
  if (!scenes?.length) return NextResponse.json({ error: 'sem cenas' }, { status: 400 });

  const result: any = { code: item.code, voiceGenerated: 0, voiceSkipped: 0, musicApplied: false, rendered: false };

  // 1. Vozes em falta — chamada interna ao /voice
  for (const scene of scenes) {
    if (scene.voice_url) { result.voiceSkipped++; continue; }
    if (!scene.body?.trim()) continue;
    try {
      const apiKey = process.env.ELEVENLABS_API_KEY;
      const voiceId = process.env.ELEVENLABS_VOICE_ID;
      const model = process.env.ELEVENLABS_TTS_MODEL || 'eleven_multilingual_v2';
      if (!apiKey || !voiceId) {
        return NextResponse.json({ error: 'ELEVENLABS env em falta', step: 'voice', ...result }, { status: 503 });
      }
      const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: scene.body,
          model_id: model,
          voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.15 },
        }),
      });
      if (!ttsRes.ok) {
        const err = await ttsRes.text().catch(() => '');
        return NextResponse.json({ error: `ElevenLabs HTTP ${ttsRes.status}: ${err.slice(0, 200)}`, step: 'voice', scene: scene.idx, ...result }, { status: 500 });
      }
      const audioBuf = new Uint8Array(await ttsRes.arrayBuffer());
      const audioPath = `videos/${item.id}/voice/cena-${String(scene.idx + 1).padStart(2, '0')}.mp3`;
      const { error: upErr } = await supabase.storage.from(process.env.SUPABASE_STORAGE_BUCKET || 'synchim-assets')
        .upload(audioPath, audioBuf, { contentType: 'audio/mpeg', upsert: true });
      if (upErr) {
        return NextResponse.json({ error: `Storage upload: ${upErr.message}`, step: 'voice', ...result }, { status: 500 });
      }
      const audioUrl = publicUrl(audioPath);
      const durationSec = audioBuf.length / 16000; // estimativa @ 128kbps
      await supabase.from('content_slides').update({ voice_url: audioUrl, duration_sec: durationSec }).eq('id', scene.id);
      result.voiceGenerated++;
    } catch (e: any) {
      return NextResponse.json({ error: `voice cena ${scene.idx + 1}: ${e.message}`, step: 'voice', ...result }, { status: 500 });
    }
  }

  // 2. Musica — aplica tema se ja existe, senao deixa por gerar manualmente
  let musicUrl = item.metadata?.musicUrl as string | undefined;
  let musicPrompt = item.metadata?.musicPrompt as string | undefined;
  if (!musicUrl) {
    const { data: themeSetting } = await supabase.from('settings').select('value').eq('key', 'theme-music').maybeSingle();
    const theme = themeSetting?.value as { musicUrl?: string; musicPrompt?: string } | undefined;
    if (theme?.musicUrl) {
      musicUrl = theme.musicUrl;
      musicPrompt = theme.musicPrompt;
      await supabase.from('content_items').update({
        metadata: { ...(item.metadata ?? {}), musicUrl, musicPrompt }
      }).eq('id', item.id);
      result.musicApplied = true;
    } else {
      return NextResponse.json({
        error: 'Sem música nem tema configurado. Gera uma e marca como tema antes de bulk.',
        step: 'music', ...result,
      }, { status: 400 });
    }
  }

  // 3. Render (se nao skipRender)
  if (!body?.skipRender) {
    const { data: freshScenes } = await supabase
      .from('content_slides').select('*').eq('item_id', item.id).order('idx', { ascending: true });

    const jobId = `video-${item.slug}-${Date.now()}`;
    const manifestPath = `render-jobs/${jobId}.json`;
    const resultPath = `render-jobs/${jobId}-result.json`;
    const manifest = {
      jobId, kind: 'video', subtype: item.subtype,
      createdAt: new Date().toISOString(),
      itemId: item.id, code: item.code, title: item.title, slug: item.slug,
      width: FORMATO_VIDEO.width, height: FORMATO_VIDEO.height, fps: FORMATO_VIDEO.fps,
      brand: BRAND,
      music: musicUrl ? { url: musicUrl, volume: 0.18 } : null,
      storage: {
        bucket: process.env.SUPABASE_STORAGE_BUCKET || 'synchim-assets',
        outputPrefix: `videos/${item.slug}/${jobId}`,
        resultPath,
      },
      scenes: (freshScenes ?? []).map((s: any) => ({
        idx: s.idx, layout: s.layout, body: s.body, design: s.design ?? {},
        voiceUrl: s.voice_url, durationSec: s.duration_sec,
      })),
    };
    await uploadJson(manifestPath, manifest);
    await uploadJson(resultPath, { jobId, status: 'queued', progress: 0, message: 'queued by process-all', updatedAt: new Date().toISOString() });
    await supabase.from('render_jobs').insert({
      job_id: jobId, item_id: item.id, kind: 'video', status: 'queued', progress: 0,
      manifest_url: publicUrl(manifestPath), result_url: publicUrl(resultPath),
    });
    await supabase.from('content_items').update({ status: 'rendering', last_job_id: jobId }).eq('id', item.id);
    try {
      await dispatchWorkflow({
        workflowFile: 'render-video.yml',
        inputs: { jobId, manifestUrl: publicUrl(manifestPath) },
      });
      result.rendered = true;
      result.jobId = jobId;
    } catch (e: any) {
      await supabase.from('render_jobs').update({ status: 'failed', message: e.message }).eq('job_id', jobId);
      await supabase.from('content_items').update({ status: 'failed' }).eq('id', item.id);
      return NextResponse.json({ error: `dispatch: ${e.message}`, step: 'render', ...result }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, ...result });
}
