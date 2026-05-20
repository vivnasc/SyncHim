import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminEmailFromCookies } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { VIDEO_SUBTIPOS } from '@/lib/admin/brand';

export const dynamic = 'force-dynamic';

export default async function VideosList() {
  if (!getAdminEmailFromCookies()) redirect('/admin/login');
  const supabase = createSupabaseAdmin();
  const { data: items } = await supabase
    .from('content_items')
    .select('id, code, title, subtype, status, scheduled_at, platforms, updated_at')
    .eq('type', 'video')
    .order('code', { ascending: true })
    .limit(500);

  return (
    <>
      <div className="row between">
        <div>
          <h1>Vídeos</h1>
          <p className="muted">15 vídeos planeados (talking head, kinetic text, hands writing). 1080×1920, 30fps.</p>
        </div>
        <Link href="/admin/videos/novo" className="btn primary">+ Novo vídeo</Link>
      </div>
      <table className="t" style={{ marginTop: 20 }}>
        <thead>
          <tr><th>código</th><th>título</th><th>subtipo</th><th>estado</th><th>agendado</th></tr>
        </thead>
        <tbody>
          {(items ?? []).map((i) => (
            <tr key={i.id}>
              <td><code>{i.code}</code></td>
              <td><Link href={`/admin/videos/${i.id}`}>{i.title}</Link></td>
              <td className="muted">{i.subtype ? (VIDEO_SUBTIPOS as any)[i.subtype] ?? i.subtype : '—'}</td>
              <td><span className={`pill ${i.status}`}>{i.status}</span></td>
              <td className="muted">{i.scheduled_at ? new Date(i.scheduled_at).toLocaleDateString('pt-PT') : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {(!items || items.length === 0) && <p className="muted" style={{ marginTop: 20 }}>Ainda nenhum vídeo.</p>}
    </>
  );
}
