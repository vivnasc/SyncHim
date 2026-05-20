import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!getAdminEmailFromRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null) as { title?: string; subtype?: string; sceneCount?: number } | null;
  if (!body?.title || !body?.subtype) return NextResponse.json({ error: 'campos em falta' }, { status: 400 });

  const supabase = createSupabaseAdmin();

  const { data: lastCode } = await supabase
    .from('content_items').select('code').like('code', 'SV-%').order('code', { ascending: false }).limit(1);
  const num = lastCode?.[0]?.code ? parseInt(lastCode[0].code.split('-')[1], 10) + 1 : 1;
  const code = `SV-${String(num).padStart(3, '0')}`;
  const slug = body.title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);

  const { data: item, error } = await supabase
    .from('content_items')
    .insert({
      type: 'video', subtype: body.subtype, code, title: body.title, slug,
      status: 'draft', platforms: ['ig', 'tiktok', 'youtube']
    })
    .select().single();
  if (error || !item) return NextResponse.json({ error: error?.message || 'insert' }, { status: 500 });

  const count = Math.max(3, Math.min(12, body.sceneCount ?? 6));
  const rows = Array.from({ length: count }, (_, i) => ({
    item_id: item.id, idx: i, layout: 'kinetic-line', body: '', design: {}
  }));
  await supabase.from('content_slides').insert(rows);

  return NextResponse.json({ id: item.id });
}
