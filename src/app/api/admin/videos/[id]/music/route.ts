import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { publicUrl, storageBucket } from '@/lib/admin/storage';
import { generateMusic, PROMPT_PRESETS } from '@/lib/admin/suno';

export const runtime = 'nodejs';
export const maxDuration = 300; // até 5min para a geração completar

/**
 * Gera música ambiente para um vídeo via Suno API.
 *
 * Body:
 *   { prompt?: string, preset?: 'pergaminho'|'velas'|'silencio'|'travessia',
 *     durationSec?: number }
 *
 * Fluxo:
 *   1. Resolve o prompt (custom ou preset).
 *   2. Chama Suno → recebe URL pública do MP3.
 *   3. Faz fetch do MP3 e persiste em Supabase Storage
 *      videos/<itemId>/music/ambient.mp3
 *   4. Guarda o URL em metadata.musicUrl no content_item.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminEmailFromRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null) as {
    prompt?: string; preset?: string; durationSec?: number
  } | null;

  if (!process.env.SUNO_API_URL || !process.env.SUNO_API_KEY) {
    return NextResponse.json({ error: 'SUNO_API_URL/SUNO_API_KEY não configurados em Vercel' }, { status: 503 });
  }

  let prompt = body?.prompt?.trim();
  if (!prompt && body?.preset && PROMPT_PRESETS[body.preset]) {
    prompt = PROMPT_PRESETS[body.preset].prompt;
  }
  if (!prompt) return NextResponse.json({ error: 'prompt ou preset em falta' }, { status: 400 });

  try {
    const result = await generateMusic({
      prompt,
      durationSec: body?.durationSec ?? 90,
      instrumental: true
    });

    // Descarrega o MP3 e persiste localmente em Supabase Storage para
    // que o runner FFmpeg o use sem depender da disponibilidade da URL Suno.
    const mp3Res = await fetch(result.audioUrl);
    if (!mp3Res.ok) throw new Error(`fetch Suno mp3 ${mp3Res.status}`);
    const mp3 = new Uint8Array(await mp3Res.arrayBuffer());

    const supabase = createSupabaseAdmin();
    const remotePath = `videos/${params.id}/music/ambient.mp3`;
    const { error: upErr } = await supabase.storage
      .from(storageBucket())
      .upload(remotePath, mp3, { contentType: 'audio/mpeg', upsert: true });
    if (upErr) throw new Error(`storage upload: ${upErr.message}`);

    const musicUrl = publicUrl(remotePath);

    // Persiste em metadata do item
    const { data: item } = await supabase
      .from('content_items')
      .select('metadata')
      .eq('id', params.id)
      .maybeSingle();
    const metadata = { ...(item?.metadata ?? {}), musicUrl, musicPrompt: prompt };
    await supabase.from('content_items').update({ metadata }).eq('id', params.id);

    return NextResponse.json({ ok: true, musicUrl, durationSec: result.durationSec });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    presets: Object.entries(PROMPT_PRESETS).map(([key, v]) => ({ key, label: v.label, prompt: v.prompt }))
  });
}
