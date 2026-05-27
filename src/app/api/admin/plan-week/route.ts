import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { WEEK_PLAN, knotForSlot } from '@/lib/admin/calendar-plan';
import { generateCarousel } from '@/lib/admin/content-generator';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/admin/plan-week
 * Body: { startDate: 'YYYY-MM-DD', slotIndex: number }
 *
 * Gera UM carrossel para o slot indicado. O frontend chama 14 vezes
 * sequencialmente (0..13), mostrando progresso entre cada chamada.
 * Assim cada request dura ~5-8s, dentro do timeout de qualquer plano Vercel.
 */
export async function POST(req: NextRequest) {
  if (!getAdminEmailFromRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY não configurado em Vercel.' },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => null) as {
    startDate?: string; slotIndex?: number
  } | null;

  if (!body?.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(body.startDate)) {
    return NextResponse.json({ error: 'startDate em falta (YYYY-MM-DD)' }, { status: 400 });
  }
  const slotIndex = body.slotIndex ?? 0;
  if (slotIndex < 0 || slotIndex >= WEEK_PLAN.length) {
    return NextResponse.json({ error: `slotIndex ${slotIndex} fora de range (0-${WEEK_PLAN.length - 1})` }, { status: 400 });
  }

  const startDate = new Date(body.startDate + 'T00:00:00Z');
  if (isNaN(startDate.getTime())) {
    return NextResponse.json({ error: 'data invalida' }, { status: 400 });
  }

  const slot = WEEK_PLAN[slotIndex];
  const knot = knotForSlot(slotIndex);

  const scheduled = new Date(startDate);
  scheduled.setUTCDate(scheduled.getUTCDate() + slot.dayOfWeek);
  const [h, m] = slot.time.split(':').map(Number);
  scheduled.setUTCHours(h, m, 0, 0);
  const scheduledAt = scheduled.toISOString();

  let carousel;
  try {
    carousel = await generateCarousel(slot.type, knot, slot.dayOfWeek);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Claude falhou no slot ${slotIndex + 1}: ${err?.message}` },
      { status: 500 },
    );
  }

  const supabase = createSupabaseAdmin();
  const code = await nextCarouselCode(supabase);
  const slug = slugify(carousel.title);

  const { data: item, error: itemErr } = await supabase
    .from('content_items')
    .insert({
      type: 'carousel',
      title: carousel.title,
      slug,
      categoria: slot.type,
      code,
      target: 'ambos',
      status: 'draft',
      platforms: ['ig', 'tiktok'],
      scheduled_at: scheduledAt,
      caption: carousel.caption,
      hashtags: carousel.hashtags,
    })
    .select()
    .single();

  if (itemErr || !item) {
    return NextResponse.json(
      { error: `Supabase insert falhou: ${itemErr?.message}` },
      { status: 500 },
    );
  }

  const slideRows = carousel.slides.map((s, idx) => ({
    item_id: item.id,
    idx,
    layout: s.layout,
    body: s.body,
    design: { imagePrompt: s.imagePrompt },
  }));
  await supabase.from('content_slides').insert(slideRows);

  return NextResponse.json({
    slotIndex,
    totalSlots: WEEK_PLAN.length,
    item: { id: item.id, code, title: carousel.title, scheduledAt }
  });
}

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);
}

async function nextCarouselCode(supabase: any): Promise<string> {
  const { data } = await supabase.from('content_items').select('code')
    .like('code', 'SC-%').order('code', { ascending: false }).limit(1);
  const last = data?.[0]?.code as string | undefined;
  const num = last ? parseInt(last.split('-')[1], 10) + 1 : 1;
  return `SC-${String(num).padStart(3, '0')}`;
}
