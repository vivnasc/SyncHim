import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { generateImage } from '@/lib/admin/replicate';
import { findReusableImage, type SlideLayout, type SlotCategoria } from '@/lib/admin/image-pool';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/admin/generate-images
 * Body: { itemId: string, model?: string, reuseStrategy?: 'prefer-existing' | 'always-new' }
 *
 * Para cada slide do item que tenha design.imagePrompt mas nao imageUrl:
 *   1. Se reuseStrategy='prefer-existing' (default), procura na biblioteca
 *      uma imagem compativel (mesmo layout + categoria). Se encontrar, reusa
 *      (sem chamar Replicate).
 *   2. Senao, gera nova via Replicate.
 *
 * Devolve contagens: { generated, reused, failed, skipped, errors }.
 */
export async function POST(req: NextRequest) {
  if (!getAdminEmailFromRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    itemId?: string;
    model?: string;
    reuseStrategy?: 'prefer-existing' | 'always-new';
  } | null;

  if (!body?.itemId) {
    return NextResponse.json({ error: 'itemId em falta' }, { status: 400 });
  }

  const reuse = (body.reuseStrategy ?? 'prefer-existing') !== 'always-new';

  // Carrega o item para saber categoria
  const supabase = createSupabaseAdmin();
  const { data: item, error: itemErr } = await supabase
    .from('content_items')
    .select('id, categoria')
    .eq('id', body.itemId)
    .single();
  if (itemErr || !item) {
    return NextResponse.json({ error: `item nao encontrado: ${itemErr?.message}` }, { status: 404 });
  }

  const { data: slides, error: loadErr } = await supabase
    .from('content_slides')
    .select('id, item_id, idx, layout, design')
    .eq('item_id', body.itemId)
    .order('idx', { ascending: true });

  if (loadErr) {
    return NextResponse.json({ error: `falha a ler slides: ${loadErr.message}` }, { status: 500 });
  }
  if (!slides?.length) {
    return NextResponse.json({ error: 'item sem slides' }, { status: 404 });
  }

  const pending = slides.filter(
    (s: any) => s.design?.imagePrompt && !s.design?.imageUrl,
  );
  if (!pending.length) {
    return NextResponse.json({
      itemId: body.itemId, generated: 0, reused: 0, failed: 0, skipped: slides.length,
    });
  }

  // Replicate so e chamado se reuse falhar — paraleliza apenas as geracoes
  // novas. O reuso e sequencial e barato (1 SELECT cada) para evitar pickar
  // o mesmo URL repetidamente.
  const usedInThisRun = new Set<string>();
  const reuseResults: Array<{ idx: number; url: string }> = [];
  const generateTasks: Array<{ slide: any }> = [];

  if (reuse) {
    for (const s of pending as any[]) {
      const url = await findReusableImage(
        s.layout as SlideLayout,
        item.categoria as SlotCategoria,
        usedInThisRun,
      );
      if (url) {
        usedInThisRun.add(url);
        reuseResults.push({ idx: s.idx, url });
      } else {
        generateTasks.push({ slide: s });
      }
    }
  } else {
    for (const s of pending as any[]) generateTasks.push({ slide: s });
  }

  // Aplica reusos primeiro (DB-only, rapido)
  await Promise.all(
    reuseResults.map(async ({ idx, url }) => {
      const slide = pending.find((s: any) => s.idx === idx);
      if (!slide) return;
      const newDesign = { ...slide.design, imageUrl: url, reused: true };
      await supabase.from('content_slides').update({ design: newDesign }).eq('id', slide.id);
    }),
  );

  // Gera novas em paralelo via Replicate
  const genResults = await Promise.allSettled(
    generateTasks.map(async ({ slide }) => {
      const path = `carrosseis/${body.itemId}/slide-${String(slide.idx + 1).padStart(2, '0')}.png`;
      const img = await generateImage(slide.design.imagePrompt as string, {
        aspectRatio: '4:5',
        storagePath: path,
        model: body.model,
      });
      const newDesign = { ...slide.design, imageUrl: img.url };
      const { error: updErr } = await supabase
        .from('content_slides')
        .update({ design: newDesign })
        .eq('id', slide.id);
      if (updErr) throw new Error(`update slide ${slide.idx + 1}: ${updErr.message}`);
      return { idx: slide.idx, url: img.url, latencyMs: img.latencyMs };
    }),
  );

  const generated = genResults.filter((r) => r.status === 'fulfilled').length;
  const errors = genResults
    .map((r, i) =>
      r.status === 'rejected'
        ? { idx: generateTasks[i].slide.idx, error: (r.reason as Error)?.message ?? String(r.reason) }
        : null,
    )
    .filter(Boolean);

  return NextResponse.json({
    itemId: body.itemId,
    generated,
    reused: reuseResults.length,
    failed: errors.length,
    skipped: slides.length - pending.length,
    errors,
  });
}
