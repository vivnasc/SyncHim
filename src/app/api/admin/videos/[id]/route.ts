import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminEmailFromRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null) as { item?: any; scenes?: any[] } | null;
  if (!body) return NextResponse.json({ error: 'bad body' }, { status: 400 });
  const supabase = createSupabaseAdmin();

  if (body.item) {
    const allowed = ['title', 'subtype', 'caption', 'hashtags', 'platforms', 'scheduled_at', 'status'];
    const patch: any = {};
    for (const k of allowed) if (k in body.item) patch[k] = body.item[k];
    if (Object.keys(patch).length > 0) await supabase.from('content_items').update(patch).eq('id', params.id);
  }

  if (Array.isArray(body.scenes)) {
    // Update por idx em vez de replace, para preservar voice_url existente
    // se o front-end mandar uma lista compatível.
    const { data: existing } = await supabase.from('content_slides').select('id, idx').eq('item_id', params.id);
    const byIdx = new Map<number, string>();
    (existing ?? []).forEach((r) => byIdx.set(r.idx, r.id));

    await supabase.from('content_slides').delete().eq('item_id', params.id);
    const rows = body.scenes.map((s, i) => ({
      item_id: params.id, idx: i,
      layout: s.layout || 'kinetic-line', body: s.body || '',
      design: s.design || {}, voice_url: s.voice_url ?? null,
      duration_sec: s.duration_sec ?? null
    }));
    if (rows.length > 0) await supabase.from('content_slides').insert(rows);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminEmailFromRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const supabase = createSupabaseAdmin();
  await supabase.from('content_items').delete().eq('id', params.id);
  return NextResponse.json({ ok: true });
}
