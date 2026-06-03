import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * Marca como failed jobs que ficaram em queued/running ha mais de 5 minutos
 * sem update — tipicamente porque o workflow do GitHub Actions falhou antes
 * de conseguir chamar a callback /touch.
 */
export async function POST(req: NextRequest) {
  if (!getAdminEmailFromRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const supabase = createSupabaseAdmin();
  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('campaign_jobs')
    .update({ status: 'failed', error: 'stuck > 5min sem update do worker (provavelmente workflow falhou no arranque)', finished_at: new Date().toISOString() })
    .in('status', ['queued', 'running'])
    .lt('updated_at', cutoff)
    .select('job_id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ marked: data?.length ?? 0, jobs: data?.map((d: any) => d.job_id) });
}
