import { NextRequest, NextResponse } from 'next/server';
import { isWorkerAuthenticated } from '@/lib/admin/worker-auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * POST /api/admin/campaigns/process-slot/touch
 * Auth: X-Worker-Token
 * Body: { jobId, current, total, finished?, failed?, message? }
 *
 * Worker calla isto entre passos para actualizar campaign_jobs progress.
 * Quando finished=true, marca status=done (ou failed se algum falhou).
 */
export async function POST(req: NextRequest) {
  if (!isWorkerAuthenticated(req)) {
    return NextResponse.json({ error: 'unauthorized worker' }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as {
    jobId?: string;
    current?: number;
    total?: number;
    finished?: boolean;
    failed?: number;
    message?: string;
  } | null;
  if (!body?.jobId) return NextResponse.json({ error: 'jobId em falta' }, { status: 400 });

  const supabase = createSupabaseAdmin();
  const progress = body.total ? Math.round((body.current ?? 0) / body.total * 100) : 0;
  const update: any = {
    progress,
    current_slot: body.current ?? 0,
    message: body.message ?? null,
    status: body.finished
      ? ((body.failed ?? 0) > 0 ? 'failed' : 'done')
      : 'running',
  };
  if (body.finished) update.finished_at = new Date().toISOString();
  await supabase.from('campaign_jobs').update(update).eq('job_id', body.jobId);
  return NextResponse.json({ ok: true });
}
