import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/items/bulk-delete
 * Body: { status?: 'draft' | ..., codeFrom?: 'SC-061', codeTo?: 'SC-200',
 *         scheduledAfter?: 'YYYY-MM-DD', confirm: true }
 *
 * Apaga em massa carrosseis/videos que correspondam ao filtro. Apaga em
 * cascata os slides (FK on delete cascade) e ficheiros associados ficam
 * orfaos no Supabase Storage — limpeza manual no painel se necessario.
 *
 * Defaults seguros: nada e apagado sem confirm=true e sem pelo menos um
 * filtro (status, codeFrom, codeTo ou scheduledAfter).
 */
export async function POST(req: NextRequest) {
  if (!getAdminEmailFromRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    status?: string;
    codeFrom?: string;
    codeTo?: string;
    scheduledAfter?: string;
    dryRun?: boolean;
    confirm?: boolean;
  } | null;

  if (!body) return NextResponse.json({ error: 'body invalido' }, { status: 400 });

  const hasFilter =
    body.status || body.codeFrom || body.codeTo || body.scheduledAfter;
  if (!hasFilter) {
    return NextResponse.json(
      { error: 'nenhum filtro definido — recusado por seguranca' },
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdmin();
  let q = supabase
    .from('content_items')
    .select('id, code, title, status, scheduled_at');
  if (body.status) q = q.eq('status', body.status);
  if (body.codeFrom) q = q.gte('code', body.codeFrom);
  if (body.codeTo) q = q.lte('code', body.codeTo);
  if (body.scheduledAfter) q = q.gte('scheduled_at', body.scheduledAfter);

  const { data: items, error: qErr } = await q;
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  const preview = (items ?? []).map((i: any) => ({
    id: i.id,
    code: i.code,
    title: i.title,
    status: i.status,
    scheduled_at: i.scheduled_at,
  }));

  if (body.dryRun || !body.confirm) {
    return NextResponse.json({
      dryRun: true,
      wouldDelete: preview.length,
      items: preview.slice(0, 50),
      message: 'Confirma com { confirm: true } para apagar.',
    });
  }

  if (!preview.length) {
    return NextResponse.json({ deleted: 0, items: [] });
  }

  const ids = preview.map((i) => i.id);
  const { error: delErr } = await supabase
    .from('content_items')
    .delete()
    .in('id', ids);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: preview.length, items: preview });
}
