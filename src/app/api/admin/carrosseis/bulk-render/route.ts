import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { dispatchCarouselRender } from '@/lib/admin/render-dispatch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/admin/carrosseis/bulk-render
 * Body: { codeFrom?, codeTo?, status?, dryRun?, confirm? }
 *
 * Dispara render para todos os carrosseis que correspondam ao filtro.
 * Cada render dispatch e um POST ao GitHub Actions — async, returns
 * rapidamente. Os jobs correm em paralelo no GH (max 20 concorrentes
 * no Hobby).
 *
 * Defaults: status='draft', sem code range (dispara todos draft). Para
 * a campanha tipica: { codeFrom: 'SC-115', confirm: true }.
 */
export async function POST(req: NextRequest) {
  if (!getAdminEmailFromRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    codeFrom?: string;
    codeTo?: string;
    status?: string;
    dryRun?: boolean;
    confirm?: boolean;
  } | null;

  const status = body?.status ?? 'draft';
  const supabase = createSupabaseAdmin();

  let q = supabase
    .from('content_items')
    .select('id, code, title, status')
    .eq('type', 'carousel')
    .eq('status', status);
  if (body?.codeFrom) q = q.gte('code', body.codeFrom);
  if (body?.codeTo) q = q.lte('code', body.codeTo);

  const { data: items, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const targets = items ?? [];
  if (body?.dryRun || !body?.confirm) {
    return NextResponse.json({
      dryRun: true,
      wouldDispatch: targets.length,
      sample: targets.slice(0, 20).map((i) => ({ code: i.code, title: i.title })),
    });
  }

  if (!targets.length) return NextResponse.json({ dispatched: 0, jobs: [] });

  // Sequencial em loop para nao spammar a GH dispatch API; cada chamada
  // ~200-500ms. 14 items = ~7s total.
  const jobs: any[] = [];
  const errors: any[] = [];
  for (const it of targets) {
    try {
      const r = await dispatchCarouselRender(it.id);
      jobs.push(r);
    } catch (e: any) {
      errors.push({ code: it.code, error: e.message });
    }
  }

  return NextResponse.json({
    dispatched: jobs.length,
    failed: errors.length,
    jobs: jobs.map((j) => ({ code: j.code, jobId: j.jobId })),
    errors,
  });
}
