import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminEmailFromRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null) as { item?: any; slides?: any[] } | null;
  if (!body) return NextResponse.json({ error: 'bad body' }, { status: 400 });
  const supabase = createSupabaseAdmin();

  if (body.item) {
    const allowed = ['title', 'categoria', 'target', 'caption', 'hashtags', 'platforms', 'scheduled_at', 'status'];
    const patch: any = {};
    for (const k of allowed) if (k in body.item) patch[k] = body.item[k];
    if (Object.keys(patch).length > 0) {
      await supabase.from('content_items').update(patch).eq('id', params.id);
    }
  }

  if (Array.isArray(body.slides)) {
    // Replace strategy: apaga existentes e re-insere. Simples e robusto
    // para volumes pequenos (8-10 slides por carrossel).
    await supabase.from('content_slides').delete().eq('item_id', params.id);
    const rows = body.slides.map((s, i) => ({
      item_id: params.id,
      idx: i,
      layout: s.layout || 'conteudo',
      body: s.body || '',
      design: s.design || {}
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
