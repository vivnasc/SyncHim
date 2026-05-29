import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/items/find-duplicates
 * Body: { autoArchiveExcess?: boolean, confirm?: boolean }
 *
 * Detecta carrosseis duplicados — items com mesmo scheduled_at e mesma
 * categoria (= mesmo slot na mesma data). Mantem o mais antigo (lowest
 * code), marca o resto como excess.
 *
 * Devolve { groups: [{ scheduledAt, categoria, keep: {code, id},
 *           archive: [{code, id}] }] }
 *
 * Se autoArchiveExcess + confirm: arquiva os excess directamente.
 */
export async function POST(req: NextRequest) {
  if (!getAdminEmailFromRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    autoArchiveExcess?: boolean;
    confirm?: boolean;
  } | null;

  const supabase = createSupabaseAdmin();
  const { data: rawItems, error } = await supabase
    .from('content_items')
    .select('id, code, title, type, categoria, status, scheduled_at, metadata, created_at')
    .eq('type', 'carousel')
    .not('scheduled_at', 'is', null)
    .order('code', { ascending: true })
    .limit(5000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filtra arquivados
  const items = (rawItems ?? []).filter((i: any) => {
    if ((i.metadata as any)?.archived === true) return false;
    if (!i.scheduled_at) return false;
    return new Date(i.scheduled_at) < new Date('2099-01-01');
  });

  // Agrupa por (scheduled_at, categoria)
  const byKey = new Map<string, any[]>();
  items.forEach((i: any) => {
    const key = `${i.scheduled_at}|${i.categoria}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(i);
  });

  // So grupos com >1
  const groups = Array.from(byKey.entries())
    .filter(([_, arr]) => arr.length > 1)
    .map(([key, arr]) => {
      // Ordena por code asc — mantem o primeiro (menor code = primeiro criado)
      arr.sort((a: any, b: any) => a.code.localeCompare(b.code));
      const [keep, ...rest] = arr;
      return {
        scheduledAt: keep.scheduled_at,
        categoria: keep.categoria,
        keep: { id: keep.id, code: keep.code, title: keep.title },
        archive: rest.map((r: any) => ({ id: r.id, code: r.code, title: r.title })),
      };
    });

  const totalExcess = groups.reduce((s, g) => s + g.archive.length, 0);

  if (!body?.autoArchiveExcess || !body?.confirm) {
    return NextResponse.json({
      dryRun: true,
      duplicateGroups: groups.length,
      totalExcess,
      groups: groups.slice(0, 50),
    });
  }

  // Arquiva excess: scheduled_at -> 2099-12-31, metadata.archived=true
  const ARCHIVE_DATE = '2099-12-31T00:00:00Z';
  const idsToArchive = groups.flatMap((g) => g.archive.map((a: any) => a.id));
  if (!idsToArchive.length) {
    return NextResponse.json({ archived: 0 });
  }

  // Actualiza em lote
  for (const id of idsToArchive) {
    const item = items.find((i: any) => i.id === id);
    await supabase
      .from('content_items')
      .update({
        scheduled_at: ARCHIVE_DATE,
        metadata: { ...(item?.metadata ?? {}), archived: true, archivedAt: new Date().toISOString(), archivedReason: 'duplicate' },
      })
      .eq('id', id);
  }

  return NextResponse.json({
    archived: idsToArchive.length,
    groups: groups.length,
  });
}
