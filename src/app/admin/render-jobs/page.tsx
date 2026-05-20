import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminEmailFromCookies } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function RenderJobs() {
  if (!getAdminEmailFromCookies()) redirect('/admin/login');
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from('render_jobs')
    .select('*, content_items(id, code, title, type)')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <>
      <h1>Render jobs</h1>
      <p className="muted">Histórico de renders. O estado é actualizado por polling ao result.json em Supabase Storage.</p>
      <table className="t">
        <thead>
          <tr><th>job</th><th>item</th><th>tipo</th><th>estado</th><th>progresso</th><th>criado</th></tr>
        </thead>
        <tbody>
          {(data ?? []).map((j: any) => (
            <tr key={j.job_id}>
              <td><code style={{ fontSize: 11 }}>{j.job_id}</code></td>
              <td>{j.content_items?.id ? (
                <Link href={`/admin/${j.content_items.type === 'video' ? 'videos' : 'carrosseis'}/${j.content_items.id}`}>
                  {j.content_items.code} · {j.content_items.title}
                </Link>
              ) : '—'}</td>
              <td>{j.kind}</td>
              <td><span className={`pill ${j.status}`}>{j.status}</span></td>
              <td>{j.progress}%</td>
              <td className="muted">{new Date(j.created_at).toLocaleString('pt-PT')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
