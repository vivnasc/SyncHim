import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { generateImage } from '@/lib/admin/replicate';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/admin/generate-images
 * Body: { itemId: string }
 *
 * Para cada slide do item que tenha design.imagePrompt mas nao imageUrl,
 * gera imagem via Replicate (em paralelo, com Promise.allSettled para nao
 * deixar 1 falha bloquear o resto), sobe para Supabase, escreve imageUrl.
 */
export async function POST(req: NextRequest) {
  if (!getAdminEmailFromRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json(
      { error: 'REPLICATE_API_TOKEN nao configurado em Vercel.' },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    itemId?: string;
    model?: string;
  } | null;
  if (!body?.itemId) {
    return NextResponse.json({ error: 'itemId em falta' }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const { data: slides, error: loadErr } = await supabase
    .from('content_slides')
    .select('id, item_id, idx, design')
    .eq('item_id', body.itemId)
    .order('idx', { ascending: true });

  if (loadErr) {
    return NextResponse.json(
      { error: `falha a ler slides: ${loadErr.message}` },
      { status: 500 },
    );
  }
  if (!slides?.length) {
    return NextResponse.json({ error: 'item sem slides' }, { status: 404 });
  }

  const pending = slides.filter(
    (s: any) => s.design?.imagePrompt && !s.design?.imageUrl,
  );
  if (!pending.length) {
    return NextResponse.json({ itemId: body.itemId, generated: 0, skipped: slides.length });
  }

  const results = await Promise.allSettled(
    pending.map(async (s: any) => {
      const path = `carrosseis/${body.itemId}/slide-${String(s.idx + 1).padStart(2, '0')}.png`;
      const img = await generateImage(s.design.imagePrompt as string, {
        aspectRatio: '4:5',
        storagePath: path,
        model: body.model,
      });
      const newDesign = { ...s.design, imageUrl: img.url };
      const { error: updErr } = await supabase
        .from('content_slides')
        .update({ design: newDesign })
        .eq('id', s.id);
      if (updErr) throw new Error(`update slide ${s.idx + 1}: ${updErr.message}`);
      return { idx: s.idx, url: img.url, latencyMs: img.latencyMs };
    }),
  );

  const ok = results.filter((r) => r.status === 'fulfilled').length;
  const errors = results
    .map((r, i) =>
      r.status === 'rejected'
        ? { idx: pending[i].idx, error: (r.reason as Error)?.message ?? String(r.reason) }
        : null,
    )
    .filter(Boolean);

  return NextResponse.json({
    itemId: body.itemId,
    generated: ok,
    failed: errors.length,
    skipped: slides.length - pending.length,
    errors,
  });
}
