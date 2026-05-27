import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { WEEK_PLAN, knotForSlot } from '@/lib/admin/calendar-plan';
import { generateCarousel } from '@/lib/admin/content-generator';

export const runtime = 'nodejs';

/**
 * POST /api/admin/plan-week
 * Body: { startDate: 'YYYY-MM-DD' }  (segunda-feira da semana a planear)
 *
 * Gera 14 carrosséis (7 manhãs + 7 noites) via Claude API,
 * cria content_items + content_slides no Supabase, tudo em draft.
 */
export async function POST(req: NextRequest) {
  if (!getAdminEmailFromRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Verificação imediata antes de perder tempo
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY não configurado em Vercel. Settings → Environment Variables.' },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => null) as { startDate?: string } | null;
  if (!body?.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(body.startDate)) {
    return NextResponse.json(
      { error: 'startDate em falta ou formato invalido (YYYY-MM-DD)' },
      { status: 400 },
    );
  }

  const startDate = new Date(body.startDate + 'T00:00:00Z');
  if (isNaN(startDate.getTime())) {
    return NextResponse.json({ error: 'data invalida' }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const created: Array<{ id: string; code: string; title: string; scheduledAt: string }> = [];
  const errors: string[] = [];

  // Sequencial para evitar rate limits do Claude API
  for (let i = 0; i < WEEK_PLAN.length; i++) {
    const slot = WEEK_PLAN[i];
    const knot = knotForSlot(i);

    // Calcula scheduled_at
    const scheduled = new Date(startDate);
    scheduled.setUTCDate(scheduled.getUTCDate() + slot.dayOfWeek);
    const [h, m] = slot.time.split(':').map(Number);
    scheduled.setUTCHours(h, m, 0, 0);
    const scheduledAt = scheduled.toISOString();

    // Gera conteúdo via Claude
    let carousel;
    try {
      carousel = await generateCarousel(slot.type, knot, slot.dayOfWeek);
    } catch (err: any) {
      const msg = `Slot ${i + 1} (${slot.type}): ${err?.message ?? String(err)}`;
      errors.push(msg);
      // Se o PRIMEIRO slot falhar, é provavelmente uma config issue.
      // Devolve erro imediato para não esperar 14 falhas silenciosas.
      if (i === 0) {
        return NextResponse.json(
          { error: `Claude API falhou no primeiro slot. Verifica ANTHROPIC_API_KEY. Detalhe: ${err?.message}`, errors: [msg] },
          { status: 500 },
        );
      }
      continue;
    }

    // Próximo código SC-XXX
    const code = await nextCarouselCode(supabase);

    // Cria content_item
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
      console.error(`[plan-week] Erro ao criar item ${code}:`, itemErr?.message);
      continue;
    }

    // Cria slides
    const slideRows = carousel.slides.map((s, idx) => ({
      item_id: item.id,
      idx,
      layout: s.layout,
      body: s.body,
      design: {
        imagePrompt: s.imagePrompt,
      },
    }));
    const { error: slideErr } = await supabase.from('content_slides').insert(slideRows);
    if (slideErr) {
      console.error(`[plan-week] Erro ao criar slides de ${code}:`, slideErr.message);
    }

    created.push({
      id: item.id,
      code,
      title: carousel.title,
      scheduledAt,
    });

    console.log(`[plan-week] Criado: ${code} "${carousel.title}" (${carousel.slides.length} slides)`);
  }

  return NextResponse.json({ created: created.length, items: created, errors });
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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
