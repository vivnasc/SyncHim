import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { readJson } from '@/lib/admin/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/admin/render-status/sync-all
 *
 * Varre todos os render_jobs em estados nao-finais (queued/running) e le
 * o result.json correspondente no Supabase Storage. Se o runner ja
 * escreveu done/failed, espelha no render_jobs e marca content_items
 * com o estado final + output_urls.
 *
 * Resolve o caso 'GH Actions terminou mas a UI continua em rendering'
 * — acontece quando ninguem teve o editor aberto para fazer polling.
 *
 * Devolve { checked, updated, failed, items: [{ code, beforeStatus, afterStatus }] }
 */
export async function POST(req: NextRequest) {
  if (!getAdminEmailFromRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();
  const { data: jobs, error } = await supabase
    .from('render_jobs')
    .select('job_id, item_id, status, progress, message, output')
    .in('status', ['queued', 'running'])
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const log: any[] = [];
  let updated = 0;
  let failedCount = 0;

  for (const job of jobs ?? []) {
    const live = await readJson<any>(`render-jobs/${job.job_id}-result.json`).catch(() => null);
    if (!live) {
      log.push({ jobId: job.job_id, status: 'no-result-json' });
      continue;
    }
    if (live.status === 'queued' || live.status === 'running') continue;
    if (live.status === job.status) continue;

    const patch: any = {
      status: live.status ?? job.status,
      progress: live.progress ?? job.progress ?? 100,
      message: live.message ?? job.message,
      output: live.output ?? job.output,
    };
    await supabase.from('render_jobs').update(patch).eq('job_id', job.job_id);

    if (patch.status === 'done') {
      await supabase
        .from('content_items')
        .update({ status: 'rendered', output_urls: patch.output })
        .eq('id', job.item_id);
      updated++;
    } else if (patch.status === 'failed') {
      await supabase
        .from('content_items')
        .update({ status: 'failed' })
        .eq('id', job.item_id);
      failedCount++;
    }

    const { data: item } = await supabase
      .from('content_items')
      .select('code')
      .eq('id', job.item_id)
      .maybeSingle();
    log.push({ jobId: job.job_id, code: item?.code, before: job.status, after: patch.status });
  }

  return NextResponse.json({
    checked: jobs?.length ?? 0,
    updated,
    failed: failedCount,
    items: log,
  });
}
