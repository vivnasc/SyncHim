import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { buildCampaignPlan, knotForSlot } from '@/lib/admin/calendar-plan';
import { generateCarousel } from '@/lib/admin/content-generator';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/admin/plan-week
 * Body: { startDate: 'YYYY-MM-DD', slotIndex: number, weeksCount?: number }
 *
 * Gera UM carrossel para o slot indicado (0..N*14-1, onde N=weeksCount).
 * O frontend chama N*14 vezes sequencialmente, mostrando progresso.
 * Assim cada request dura ~5-15s, dentro do timeout Vercel.
 *
 * weeksCount: 1 (default) | 2 | 4 (28 dias) | 5 (35 dias = campanha 30 dias)
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

  const body = (await req.json().catch(() => null)) as {
    startDate?: string;
    slotIndex?: number;
    weeksCount?: number;
  } | null;

  if (!body?.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(body.startDate)) {
    return NextResponse.json({ error: 'startDate em falta (YYYY-MM-DD)' }, { status: 400 });
  }

  const weeksCount = Math.max(1, Math.min(body.weeksCount ?? 1, 8));
  const plan = buildCampaignPlan(weeksCount);

  const slotIndex = body.slotIndex ?? 0;
  if (slotIndex < 0 || slotIndex >= plan.length) {
    return NextResponse.json(
      { error: `slotIndex ${slotIndex} fora de range (0-${plan.length - 1})` },
      { status: 400 },
    );
  }

  const startDate = new Date(body.startDate + 'T00:00:00Z');
  if (isNaN(startDate.getTime())) {
    return NextResponse.json({ error: 'data invalida' }, { status: 400 });
  }

  const slot = plan[slotIndex];
  const knot = knotForSlot(slotIndex);

  const scheduled = new Date(startDate);
  scheduled.setUTCDate(scheduled.getUTCDate() + slot.dayOffset);
  const [h, m] = slot.time.split(':').map(Number);
  scheduled.setUTCHours(h, m, 0, 0);
  const scheduledAt = scheduled.toISOString();

  // Tenta 1 retry quando a Claude viola a regra de cobertura de imagens
  // (capa + cta + 2 conteudo). Outros erros propagam imediatamente.
  let carousel;
  try {
    carousel = await generateCarousel(slot.type, knot, slot.dayOfWeek);
  } catch (err: any) {
    if (err?.code === 'IMAGE_COVERAGE') {
      try {
        carousel = await generateCarousel(slot.type, knot, slot.dayOfWeek);
      } catch (err2: any) {
        return NextResponse.json(
          {
            error: `Claude falhou cobertura de imagens 2x no slot ${slotIndex + 1}: ${err2?.message}`,
            slot: slotIndex,
            type: slot.type,
            knot,
            cause: 'image_coverage',
          },
          { status: 500 },
        );
      }
    } else {
      return NextResponse.json(
        {
          error: `Claude falhou no slot ${slotIndex + 1}: ${err?.message}`,
          slot: slotIndex,
          type: slot.type,
          knot,
          cause: err?.error?.type ?? err?.name ?? null,
        },
        { status: 500 },
      );
    }
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
      metadata: { campaignWeek: slot.weekIndex, campaignWeeks: weeksCount },
    })
    .select()
    .single();

  if (itemErr || !item) {
    return NextResponse.json(
      { error: `Supabase insert falhou: ${itemErr?.message}` },
      { status: 500 },
    );
  }

  const slideRows = carousel.slides.map((s, idx) => {
    const prompt = (s.imagePrompt ?? '').trim();
    return {
      item_id: item.id,
      idx,
      layout: s.layout,
      body: s.body,
      // imagePrompt so e guardado quando Claude decidiu que o slide pede
      // imagem; slides puramente editoriais ficam com design={} e ficam
      // automaticamente fora do generate-images / prompts MJ.
      design: prompt ? { imagePrompt: prompt } : {},
    };
  });
  await supabase.from('content_slides').insert(slideRows);

  return NextResponse.json({
    slotIndex,
    totalSlots: plan.length,
    weeksCount,
    item: { id: item.id, code, title: carousel.title, scheduledAt },
  });
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

async function nextCarouselCode(supabase: any): Promise<string> {
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
