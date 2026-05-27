import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * GET /api/admin/prompts-sheet
 *
 * Devolve todos os content_items em draft cujos slides tenham imagePrompt
 * preenchido mas imageUrl em falta. Agrupados por item, ordenados por
 * scheduled_at. Serve de "folha de prompts" para gerar imagens no MJ.
 */
export async function GET(req: NextRequest) {
  if (!getAdminEmailFromRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();

  // Busca items draft do tipo carousel, com slides
  const { data: items, error: itemsErr } = await supabase
    .from('content_items')
    .select('id, code, title, scheduled_at')
    .eq('type', 'carousel')
    .eq('status', 'draft')
    .order('scheduled_at', { ascending: true });

  if (itemsErr) {
    return NextResponse.json({ error: itemsErr.message }, { status: 500 });
  }

  if (!items || items.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const itemIds = items.map((i) => i.id);

  // Busca slides desses items que tenham imagePrompt no design mas sem imageUrl
  const { data: slides, error: slidesErr } = await supabase
    .from('content_slides')
    .select('id, item_id, idx, design')
    .in('item_id', itemIds)
    .order('idx', { ascending: true });

  if (slidesErr) {
    return NextResponse.json({ error: slidesErr.message }, { status: 500 });
  }

  // Filtra slides com imagePrompt mas sem imageUrl
  const pendingSlides = (slides ?? []).filter((s: any) => {
    const d = s.design as Record<string, any> | null;
    return d?.imagePrompt && !d?.imageUrl;
  });

  // Agrupa por item_id
  const slidesByItem = new Map<string, Array<{ idx: number; imagePrompt: string }>>();
  for (const s of pendingSlides) {
    const d = s.design as Record<string, any>;
    if (!slidesByItem.has(s.item_id)) slidesByItem.set(s.item_id, []);
    slidesByItem.get(s.item_id)!.push({
      idx: s.idx,
      imagePrompt: d.imagePrompt,
    });
  }

  // Monta resultado final, filtrando items sem slides pendentes
  const result = items
    .filter((i) => slidesByItem.has(i.id))
    .map((i) => ({
      id: i.id,
      code: i.code,
      title: i.title,
      scheduledAt: i.scheduled_at,
      slides: slidesByItem.get(i.id)!,
    }));

  return NextResponse.json({ items: result });
}
