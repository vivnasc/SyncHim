import { notFound, redirect } from 'next/navigation';
import { getAdminEmailFromCookies } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { CarrosselEditor } from './CarrosselEditor';

export const dynamic = 'force-dynamic';

export default async function CarrosselPage({ params }: { params: { id: string } }) {
  if (!getAdminEmailFromCookies()) redirect('/admin/login');
  const supabase = createSupabaseAdmin();

  const { data: item } = await supabase
    .from('content_items')
    .select('*')
    .eq('id', params.id)
    .eq('type', 'carousel')
    .maybeSingle();
  if (!item) notFound();

  const { data: slides } = await supabase
    .from('content_slides')
    .select('*')
    .eq('item_id', item.id)
    .order('idx', { ascending: true });

  const { data: lastJob } = await supabase
    .from('render_jobs')
    .select('*')
    .eq('item_id', item.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Anterior / seguinte por codigo (exclui arquivados)
  const [{ data: prevQ }, { data: nextQ }] = await Promise.all([
    supabase
      .from('content_items')
      .select('id, code, metadata')
      .eq('type', 'carousel')
      .lt('code', item.code)
      .order('code', { ascending: false })
      .limit(10),
    supabase
      .from('content_items')
      .select('id, code, metadata')
      .eq('type', 'carousel')
      .gt('code', item.code)
      .order('code', { ascending: true })
      .limit(10),
  ]);
  const filterActive = (rows: any[] | null) =>
    (rows ?? []).filter((r) => !((r.metadata as any)?.archived === true));
  const prev = filterActive(prevQ)[0] ?? null;
  const next = filterActive(nextQ)[0] ?? null;

  return (
    <CarrosselEditor
      initialItem={item as any}
      initialSlides={(slides ?? []) as any}
      initialJob={lastJob as any}
      prev={prev}
      next={next}
    />
  );
}
