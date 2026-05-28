import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/items/shift-time
 * Body: { codeFrom: 'SC-115', codeTo?: 'SC-200', hours: -2, dryRun?, confirm? }
 *
 * Desloca scheduled_at de items por N horas. Util para corrigir items que
 * foram criados antes do fix de timezone (UTC -> CAT em 2026-05-28).
 *
 * Defaults seguros: requer pelo menos codeFrom + hours, dry-run sem confirm.
 */
export async function POST(req: NextRequest) {
  if (!getAdminEmailFromRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    codeFrom?: string;
    codeTo?: string;
    hours?: number;
    dryRun?: boolean;
    confirm?: boolean;
  } | null;

  if (!body?.codeFrom || typeof body.hours !== 'number') {
    return NextResponse.json(
      { error: 'codeFrom e hours obrigatorios' },
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdmin();
  let q = supabase
    .from('content_items')
    .select('id, code, scheduled_at')
    .gte('code', body.codeFrom)
    .not('scheduled_at', 'is', null);
  if (body.codeTo) q = q.lte('code', body.codeTo);

  const { data: items, error: qErr } = await q;
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  const shiftMs = body.hours * 60 * 60 * 1000;
  const changes = (items ?? []).map((i: any) => {
    const before = new Date(i.scheduled_at);
    const after = new Date(before.getTime() + shiftMs);
    return { id: i.id, code: i.code, before: before.toISOString(), after: after.toISOString() };
  });

  if (body.dryRun || !body.confirm) {
    return NextResponse.json({
      dryRun: true,
      wouldShift: changes.length,
      hours: body.hours,
      sample: changes.slice(0, 10),
    });
  }

  if (!changes.length) return NextResponse.json({ shifted: 0 });

  await Promise.all(
    changes.map((c) =>
      supabase
        .from('content_items')
        .update({ scheduled_at: c.after })
        .eq('id', c.id),
    ),
  );

  return NextResponse.json({ shifted: changes.length, hours: body.hours });
}
