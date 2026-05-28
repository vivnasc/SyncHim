import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ARCHIVE_DATE = '2099-12-31T00:00:00Z';

/**
 * POST /api/admin/items/bulk-archive
 * Body: { status?, codeFrom?, codeTo?, scheduledBefore?, dryRun?, confirm? }
 *
 * Em vez de apagar (que destrói a associacao slide<->imagem), reagenda
 * os items para 2099-12-31 e marca metadata.archived = true. Saem do
 * calendario activo mas as imagens continuam linkadas aos slides e
 * acessiveis via /admin/biblioteca.
 *
 * Para apagar mesmo, ha o endpoint bulk-delete separado.
 */
export async function POST(req: NextRequest) {
  if (!getAdminEmailFromRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    status?: string;
    codeFrom?: string;
    codeTo?: string;
    scheduledBefore?: string;
    dryRun?: boolean;
    confirm?: boolean;
  } | null;

  if (!body) return NextResponse.json({ error: 'body invalido' }, { status: 400 });

  const hasFilter =
    body.status || body.codeFrom || body.codeTo || body.scheduledBefore;
  if (!hasFilter) {
    return NextResponse.json(
      { error: 'nenhum filtro definido — recusado por seguranca' },
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdmin();
  let q = supabase
    .from('content_items')
    .select('id, code, title, status, scheduled_at, metadata');
  if (body.status) q = q.eq('status', body.status);
  if (body.codeFrom) q = q.gte('code', body.codeFrom);
  if (body.codeTo) q = q.lte('code', body.codeTo);
  if (body.scheduledBefore) q = q.lt('scheduled_at', body.scheduledBefore);

  const { data: items, error: qErr } = await q;
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  // Ja arquivados (scheduled_at >= 2099) sao saltados
  const pending = (items ?? []).filter(
    (i: any) => !i.scheduled_at || new Date(i.scheduled_at) < new Date('2099-01-01'),
  );

  const preview = pending.map((i: any) => ({
    id: i.id,
    code: i.code,
    title: i.title,
    scheduled_at: i.scheduled_at,
  }));

  if (body.dryRun || !body.confirm) {
    return NextResponse.json({
      dryRun: true,
      wouldArchive: preview.length,
      items: preview.slice(0, 50),
    });
  }

  if (!preview.length) {
    return NextResponse.json({ archived: 0, items: [] });
  }

  const updates = pending.map((i: any) =>
    supabase
      .from('content_items')
      .update({
        scheduled_at: ARCHIVE_DATE,
        metadata: { ...(i.metadata ?? {}), archived: true, archivedAt: new Date().toISOString() },
      })
      .eq('id', i.id),
  );
  await Promise.all(updates);

  return NextResponse.json({ archived: preview.length, items: preview });
}
