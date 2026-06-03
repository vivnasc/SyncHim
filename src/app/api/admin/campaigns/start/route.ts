import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { dispatchWorkflow } from '@/lib/admin/dispatch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/campaigns/start
 * Body: { startDate, weeksCount, autoImages?, model?, reuseStrategy? }
 *
 * Cria campaign_jobs row e dispara workflow plan-campaign.yml no GitHub
 * Actions. O workflow corre no runner (sem time limit do Vercel) e chama
 * /api/admin/campaigns/process-slot para cada slot.
 *
 * Devolve { jobId } — UI redirecciona para /admin/campaign-jobs/{jobId}.
 */
export async function POST(req: NextRequest) {
  if (!getAdminEmailFromRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!process.env.CAMPAIGN_WORKER_TOKEN) {
    return NextResponse.json(
      { error: 'CAMPAIGN_WORKER_TOKEN nao configurado em Vercel' },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    startDate?: string;
    weeksCount?: number;
    autoImages?: boolean;
    model?: string;
    reuseStrategy?: 'prefer-existing' | 'always-new' | 'reuse-only';
    kindFilter?: Array<'carousel' | 'reel'>;
  } | null;

  if (!body?.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(body.startDate)) {
    return NextResponse.json({ error: 'startDate em falta (YYYY-MM-DD)' }, { status: 400 });
  }
  const weeksCount = Math.max(1, Math.min(body.weeksCount ?? 1, 8));
  // Calcula slots por semana segundo o kindFilter (default 21 = todos)
  const slotsPerWeek = body.kindFilter
    ? body.kindFilter.reduce((s, k) => s + (k === 'carousel' ? 14 : 7), 0)
    : 21;
  const totalSlots = weeksCount * slotsPerWeek;

  const jobId = `campaign-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const settings = {
    startDate: body.startDate,
    weeksCount,
    autoImages: body.autoImages ?? true,
    model: body.model ?? 'black-forest-labs/flux-1.1-pro',
    reuseStrategy: body.reuseStrategy ?? 'always-new',
    kindFilter: body.kindFilter,
  };

  const supabase = createSupabaseAdmin();
  const { error: insertErr } = await supabase
    .from('campaign_jobs')
    .insert({
      job_id: jobId,
      status: 'queued',
      progress: 0,
      current_slot: 0,
      total_slots: totalSlots,
      settings,
      message: 'queued by /admin',
    });
  if (insertErr) {
    return NextResponse.json({ error: `BD: ${insertErr.message}` }, { status: 500 });
  }

  const rawSite = process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
    || (req.headers.get('host') ? `https://${req.headers.get('host')}` : '');
  const siteUrl = rawSite.replace(/\/$/, '');
  if (!siteUrl) {
    return NextResponse.json({ error: 'não consegui resolver URL pública' }, { status: 500 });
  }

  try {
    await dispatchWorkflow({
      workflowFile: 'plan-campaign.yml',
      inputs: {
        jobId,
        siteUrl,
        startDate: settings.startDate,
        weeksCount: String(weeksCount),
        totalSlots: String(totalSlots),
        autoImages: String(settings.autoImages),
        model: settings.model,
        reuseStrategy: settings.reuseStrategy,
      },
    });
  } catch (e: any) {
    await supabase
      .from('campaign_jobs')
      .update({ status: 'failed', error: `dispatch falhou: ${e.message}` })
      .eq('job_id', jobId);
    return NextResponse.json({ error: `dispatch: ${e.message}` }, { status: 500 });
  }

  return NextResponse.json({ jobId, totalSlots, settings });
}
