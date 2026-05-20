import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!getAdminEmailFromRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null) as { title?: string; categoria?: string; slideCount?: number } | null;
  if (!body?.title) return NextResponse.json({ error: 'title em falta' }, { status: 400 });

  const slug = slugify(body.title);
  const supabase = createSupabaseAdmin();

  const nextCode = await nextCarouselCode(supabase, body.categoria);

  const { data: item, error } = await supabase
    .from('content_items')
    .insert({
      type: 'carousel',
      title: body.title,
      slug,
      categoria: body.categoria,
      code: nextCode,
      status: 'draft',
      platforms: ['ig', 'tiktok']
    })
    .select()
    .single();
  if (error || !item) return NextResponse.json({ error: error?.message || 'insert failed' }, { status: 500 });

  const count = Math.max(3, Math.min(10, body.slideCount ?? 8));
  const rows = Array.from({ length: count }, (_, i) => ({
    item_id: item.id,
    idx: i,
    layout: i === 0 ? 'capa' : i === count - 1 ? 'cta' : 'conteudo',
    body: '',
    design: {}
  }));
  await supabase.from('content_slides').insert(rows);

  return NextResponse.json({ id: item.id });
}

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);
}

async function nextCarouselCode(supabase: any, categoria?: string): Promise<string> {
  // Mantém SC-001 ... SC-060 já em uso e atribui o próximo.
  const { data } = await supabase
    .from('content_items')
    .select('code')
    .like('code', 'SC-%')
    .order('code', { ascending: false })
    .limit(1);
  const last = data?.[0]?.code as string | undefined;
  const num = last ? parseInt(last.split('-')[1], 10) + 1 : 1;
  return `SC-${String(num).padStart(3, '0')}`;
}
