import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { readJson } from '@/lib/admin/storage';

export const runtime = 'nodejs';

/**
 * Lê o estado de um render job. Verdade vive no result.json em Supabase
 * Storage (escrito pelo runner do GitHub Actions); espelhamos para a
 * tabela render_jobs para queries rápidas no painel.
 */
export async function GET(req: NextRequest) {
  if (!getAdminEmailFromRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const jobId = req.nextUrl.searchParams.get('jobId');
  if (!jobId) return NextResponse.json({ error: 'jobId em falta' }, { status: 400 });

  const supabase = createSupabaseAdmin();
  const { data: job } = await supabase.from('render_jobs').select('*').eq('job_id', jobId).maybeSingle();
  if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const live = await readJson<any>(`render-jobs/${jobId}-result.json`).catch(() => null);
  if (live) {
    const patch: any = {
      status: live.status ?? job.status,
      progress: live.progress ?? job.progress,
      message: live.message ?? job.message,
      output: live.output ?? job.output
    };
    // Espelha estado.
    if (patch.status !== job.status || patch.progress !== job.progress) {
      await supabase.from('render_jobs').update(patch).eq('job_id', jobId);
      if (patch.status === 'done') {
        await supabase
          .from('content_items')
          .update({ status: 'rendered', output_urls: patch.output })
          .eq('id', job.item_id);
      } else if (patch.status === 'failed') {
        await supabase
          .from('content_items')
          .update({ status: 'failed' })
          .eq('id', job.item_id);
      }
    }
    return NextResponse.json({ ...job, ...patch });
  }

  return NextResponse.json(job);
}
