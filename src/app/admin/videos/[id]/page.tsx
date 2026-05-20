import { notFound, redirect } from 'next/navigation';
import { getAdminEmailFromCookies } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { VideoEditor } from './VideoEditor';

export const dynamic = 'force-dynamic';

export default async function VideoPage({ params }: { params: { id: string } }) {
  if (!getAdminEmailFromCookies()) redirect('/admin/login');
  const supabase = createSupabaseAdmin();
  const { data: item } = await supabase
    .from('content_items')
    .select('*')
    .eq('id', params.id)
    .eq('type', 'video')
    .maybeSingle();
  if (!item) notFound();
  const { data: scenes } = await supabase
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

  return (
    <VideoEditor
      initialItem={item as any}
      initialScenes={(scenes ?? []) as any}
      initialJob={lastJob as any}
    />
  );
}
