import { redirect } from 'next/navigation';
import { getAdminEmailFromCookies } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { PromptsList } from './PromptsList';

export const dynamic = 'force-dynamic';

interface PromptSlide {
  idx: number;
  imagePrompt: string;
}

interface PromptItem {
  id: string;
  code: string;
  title: string;
  scheduledAt: string | null;
  slides: PromptSlide[];
}

/**
 * Pagina de prompts MJ pendentes. Mostra todos os slides com imagePrompt
 * mas sem imageUrl, agrupados por carrossel, com botoes de copiar.
 */
export default async function PromptsPage() {
  if (!getAdminEmailFromCookies()) redirect('/admin/login');

  const supabase = createSupabaseAdmin();

  // Busca items draft do tipo carousel
  const { data: items } = await supabase
    .from('content_items')
    .select('id, code, title, scheduled_at')
    .eq('type', 'carousel')
    .eq('status', 'draft')
    .order('scheduled_at', { ascending: true });

  if (!items || items.length === 0) {
    return (
      <>
        <h1>Prompts MJ</h1>
        <p className="muted">Nenhum carrossel em draft com prompts pendentes.</p>
      </>
    );
  }

  const itemIds = items.map((i) => i.id);

  const { data: slides } = await supabase
    .from('content_slides')
    .select('id, item_id, idx, design')
    .in('item_id', itemIds)
    .order('idx', { ascending: true });

  // Filtra slides com imagePrompt sem imageUrl
  const pendingSlides = (slides ?? []).filter((s: any) => {
    const d = s.design as Record<string, any> | null;
    return d?.imagePrompt && !d?.imageUrl;
  });

  // Agrupa por item
  const slidesByItem = new Map<string, PromptSlide[]>();
  for (const s of pendingSlides) {
    const d = (s as any).design as Record<string, any>;
    if (!slidesByItem.has(s.item_id)) slidesByItem.set(s.item_id, []);
    slidesByItem.get(s.item_id)!.push({
      idx: s.idx,
      imagePrompt: d.imagePrompt,
    });
  }

  const promptItems: PromptItem[] = items
    .filter((i) => slidesByItem.has(i.id))
    .map((i) => ({
      id: i.id,
      code: i.code,
      title: i.title,
      scheduledAt: i.scheduled_at,
      slides: slidesByItem.get(i.id)!,
    }));

  if (promptItems.length === 0) {
    return (
      <>
        <h1>Prompts MJ</h1>
        <p className="muted">Todos os prompts ja tem imagem. Nada pendente.</p>
      </>
    );
  }

  return (
    <>
      <h1>Prompts MJ</h1>
      <p className="muted">
        {promptItems.length} carrosseis com prompts pendentes ({pendingSlides.length} imagens no total).
        Copia cada prompt para o Midjourney e depois faz upload da imagem no editor.
      </p>
      <PromptsList items={promptItems} />
    </>
  );
}
