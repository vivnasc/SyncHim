/**
 * SyncHim · pool de imagens reusaveis.
 *
 * Antes de pagar a Replicate por uma imagem nova, tenta encontrar uma ja
 * gerada que sirva o mesmo papel editorial. Match por layout + categoria
 * (with grouping: todos os didaticos partilham pool).
 *
 * Retorna URL para reuso ou null para gerar nova.
 */

import { createSupabaseAdmin } from '@/lib/supabase/admin';

export type SlotCategoria =
  | 'didatico-A' | 'didatico-B' | 'didatico-C' | 'didatico-D'
  | 'reconhecimento' | 'cta';

export type SlideLayout = 'capa' | 'conteudo' | 'cta' | 'assinatura';

/**
 * Mapeia uma categoria de slot para o conjunto de categorias que podem
 * partilhar imagens. Didaticos A/B/C/D partilham pool; reconhecimento e
 * cta tem cada um o seu.
 */
function categoriaPool(c: SlotCategoria | null | undefined): SlotCategoria[] {
  if (!c) return [];
  if (c.startsWith('didatico')) {
    return ['didatico-A', 'didatico-B', 'didatico-C', 'didatico-D'];
  }
  return [c];
}

/**
 * Devolve um URL de imagem ja existente compativel com (layout, categoria)
 * ou null se nao houver match (entao a chamada deve gerar nova via Replicate).
 *
 * @param exclude  URLs ja usadas neste lote — evita repeticao dentro do
 *                 mesmo carrossel.
 */
export async function findReusableImage(
  layout: SlideLayout,
  categoria: SlotCategoria | null | undefined,
  exclude: Set<string> = new Set(),
): Promise<string | null> {
  const supabase = createSupabaseAdmin();
  const pool = categoriaPool(categoria);

  // Query: slides com imageUrl, layout igual, categoria do item compativel.
  // Le ate 200 candidatos — suficiente para variabilidade sem custo.
  let q = supabase
    .from('content_slides')
    .select('design, content_items!inner(categoria)')
    .eq('layout', layout);

  if (pool.length > 0) {
    q = q.in('content_items.categoria', pool);
  }

  const { data, error } = await q.limit(200);
  if (error || !data?.length) return null;

  type Row = { design: { imageUrl?: string } | null };
  const urls = (data as unknown as Row[])
    .map((s) => s.design?.imageUrl)
    .filter((u): u is string => !!u && !exclude.has(u));

  if (!urls.length) {
    // Pool exausto pelo exclude — relaxa e permite reuso dentro do lote
    const fallback = (data as unknown as Row[])
      .map((s) => s.design?.imageUrl)
      .filter((u): u is string => !!u);
    if (!fallback.length) return null;
    return fallback[Math.floor(Math.random() * fallback.length)];
  }

  return urls[Math.floor(Math.random() * urls.length)];
}
