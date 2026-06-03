import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { dispatchWorkflow } from '@/lib/admin/dispatch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/videos/bulk-pipeline/start
 * Body: { status?: 'draft', codeFrom?: 'SV-', codeTo? }
 *
 * Dispara workflow process-reels.yml que processa N reels end-to-end:
 * backfill imagePrompts -> generate-images -> process-all (voices +
 * tema musica + render dispatch).
 *
 * Browser pode fechar. Status em /admin/campaign-jobs/{jobId}.
 */
export async function POST(req: NextRequest) {
  if (!getAdminEmailFromRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!process.env.CAMPAIGN_WORKER_TOKEN) {
    return NextResponse.json({ error: 'CAMPAIGN_WORKER_TOKEN nao configurado' }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as {
    status?: string;
    codeFrom?: string;
    codeTo?: string;
    dryRun?: boolean;
  } | null;

  const status = body?.status ?? 'draft';
  const supabase = createSupabaseAdmin();
  let q = supabase
    .from('content_items')
    .select('id, code')
    .eq('type', 'video')
    .eq('status', status)
    .order('code', { ascending: true });
  if (body?.codeFrom) q = q.gte('code', body.codeFrom);
  if (body?.codeTo) q = q.lte('code', body.codeTo);

  const { data: items, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!items?.length) return NextResponse.json({ error: 'nenhum reel para processar' }, { status: 400 });

  // Dry-run: devolve quantos vai processar e custo real baseado no estado actual
  if (body?.dryRun) {
    const ids = items.map((i: any) => i.id);

    // Cenas dos reels-alvo: contar quantas precisam de imagem / voz
    const { data: scenes } = await supabase
      .from('content_slides')
      .select('item_id, design, voice_url, body')
      .in('item_id', ids);
    let scenesWithoutImage = 0;
    let scenesWithoutVoice = 0;
    (scenes ?? []).forEach((s: any) => {
      if (!s.design?.imageUrl) scenesWithoutImage++;
      if (!s.voice_url && s.body?.trim()) scenesWithoutVoice++;
    });

    // Tema musical configurado?
    const { data: themeRow } = await supabase
      .from('settings').select('value').eq('key', 'theme-music').maybeSingle();
    const hasTheme = !!(themeRow?.value as any)?.musicUrl;

    // Reels sem música própria nem tema → precisariam de Suno
    const { data: itemsFull } = await supabase
      .from('content_items').select('id, metadata').in('id', ids);
    const reelsNeedingSuno = hasTheme ? 0
      : (itemsFull ?? []).filter((i: any) => !i.metadata?.musicUrl).length;

    const costReplicate = scenesWithoutImage * 0.04;
    const costElevenLabs = scenesWithoutVoice * 0.05;
    const costSuno = reelsNeedingSuno * 0.20; // estimativa apibox

    return NextResponse.json({
      dryRun: true,
      totalReels: items.length,
      scenesWithoutImage,
      scenesWithoutVoice,
      hasTheme,
      reelsNeedingSuno,
      cost: {
        replicate: costReplicate,
        elevenlabs: costElevenLabs,
        suno: costSuno,
        total: costReplicate + costElevenLabs + costSuno,
      },
    });
  }

  const jobId = `reels-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const itemIds = items.map((i: any) => i.id).join(',');

  await supabase.from('campaign_jobs').insert({
    job_id: jobId,
    status: 'queued',
    progress: 0,
    current_slot: 0,
    total_slots: items.length,
    settings: { kind: 'reels-pipeline', status, codeFrom: body?.codeFrom, codeTo: body?.codeTo },
    message: `queued: ${items.length} reels para pipeline completo`,
  });

  // Resolve URL pública: host header (sempre certo) > VERCEL_URL > NEXT_PUBLIC_SITE_URL
  // O host header reflecte o domínio real onde estás (synchim.viviannedossantos.com
  // ou sync-him.vercel.app), evitando depender de env mal configurada.
  const host = req.headers.get('host');
  const rawSite = (host ? `https://${host}` : '')
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
    || process.env.NEXT_PUBLIC_SITE_URL
    || '';
  const siteUrl = rawSite.replace(/\/$/, '');
  if (!siteUrl) return NextResponse.json({ error: 'não consegui resolver URL pública' }, { status: 500 });

  // Sanity check: rejeita URLs que claramente não são o admin Next.js
  if (siteUrl.includes('supabase.co') || siteUrl.includes('supabase.in')) {
    return NextResponse.json({ error: `siteUrl mal resolvido (${siteUrl}) — aponta para Supabase, não para o admin` }, { status: 500 });
  }

  try {
    await dispatchWorkflow({
      workflowFile: 'process-reels.yml',
      inputs: { jobId, siteUrl, itemIds },
    });
  } catch (e: any) {
    await supabase.from('campaign_jobs')
      .update({ status: 'failed', error: `dispatch: ${e.message}` })
      .eq('job_id', jobId);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  return NextResponse.json({ jobId, totalReels: items.length });
}
