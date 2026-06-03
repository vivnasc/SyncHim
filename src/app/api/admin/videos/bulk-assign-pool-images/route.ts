import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Distribui imagens do pool da Biblioteca pelas cenas de reels em draft
 * que ainda não têm imagem. NÃO chama Replicate — usa só imagens que já
 * existem em content_slides (campanha inteira: carrosseis + vídeos).
 *
 * Estratégia: ordena imagens do pool pelas MENOS usadas primeiro (para
 * espalhar o reuso). Atribui ciclicamente: cena 1 → img mais rara, cena
 * 2 → próxima, etc. Marca design.reused = true.
 *
 * Body (opcional): { itemIds?: string[] } — restringir a reels específicos.
 *                  Senão, processa todos os drafts video sem imagens.
 */
export async function POST(req: NextRequest) {
  if (!getAdminEmailFromRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null) as { itemIds?: string[] } | null;

  const supabase = createSupabaseAdmin();

  // 1. Constrói pool de imagens com contagem de uso
  const { data: allSlides } = await supabase
    .from('content_slides')
    .select('design')
    .limit(10000);
  const useCount = new Map<string, number>();
  (allSlides ?? []).forEach((s: any) => {
    const url = s.design?.imageUrl;
    if (!url) return;
    useCount.set(url, (useCount.get(url) ?? 0) + 1);
  });
  const pool = Array.from(useCount.entries())
    .sort((a, b) => a[1] - b[1]) // menos usadas primeiro
    .map(([url]) => url);

  if (pool.length === 0) {
    return NextResponse.json({ error: 'pool vazio — não há imagens em content_slides' }, { status: 400 });
  }

  // 2. Resolve reels alvo
  let videoIds: string[] = body?.itemIds ?? [];
  if (!videoIds.length) {
    const { data: drafts } = await supabase
      .from('content_items')
      .select('id')
      .eq('type', 'video')
      .eq('status', 'draft');
    videoIds = (drafts ?? []).map((d: any) => d.id);
  }

  // 3. Carrega cenas sem imagem desses reels
  const { data: scenes } = await supabase
    .from('content_slides')
    .select('id, item_id, idx, design')
    .in('item_id', videoIds);

  const scenesWithoutImg = (scenes ?? []).filter((s: any) => !s.design?.imageUrl);

  // 4. Atribui ciclicamente. Avança pelo pool a cada cena para espalhar.
  let cursor = 0;
  let assigned = 0;
  const updates: { id: string; design: any }[] = [];
  for (const s of scenesWithoutImg) {
    const url = pool[cursor % pool.length];
    cursor++;
    updates.push({
      id: s.id,
      design: { ...(s.design ?? {}), imageUrl: url, reused: true },
    });
    assigned++;
  }

  // 5. Aplica em batch — Supabase não tem updateMany, então em paralelo limitado
  const BATCH = 20;
  for (let i = 0; i < updates.length; i += BATCH) {
    const slice = updates.slice(i, i + BATCH);
    await Promise.all(slice.map((u) =>
      supabase.from('content_slides').update({ design: u.design }).eq('id', u.id)
    ));
  }

  // 6. Contagem por reel
  const byReel = new Map<string, number>();
  scenesWithoutImg.forEach((s: any) => {
    byReel.set(s.item_id, (byReel.get(s.item_id) ?? 0) + 1);
  });

  return NextResponse.json({
    ok: true,
    poolSize: pool.length,
    reelsTouched: byReel.size,
    scenesAssigned: assigned,
  });
}
