import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminEmailFromCookies } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function AdminHome() {
  if (!getAdminEmailFromCookies()) redirect('/admin/login');

  const supabase = createSupabaseAdmin();

  // Contagens por estado, divididas por tipo. Feito em duas queries para
  // manter PostgREST simples — o volume é dezenas, não milhares.
  const { data: items } = await supabase
    .from('content_items')
    .select('type, status')
    .limit(500);

  const counts = {
    carousel: { draft: 0, ready: 0, rendering: 0, rendered: 0, published: 0, failed: 0, total: 0 },
    video:    { draft: 0, ready: 0, rendering: 0, rendered: 0, published: 0, failed: 0, total: 0 }
  } as Record<string, Record<string, number>>;
  (items ?? []).forEach((i) => {
    const t = i.type as 'carousel' | 'video';
    if (!counts[t]) return;
    counts[t][i.status] = (counts[t][i.status] ?? 0) + 1;
    counts[t].total += 1;
  });

  const { data: latestJobs } = await supabase
    .from('render_jobs')
    .select('job_id, kind, status, progress, message, updated_at, item_id')
    .order('updated_at', { ascending: false })
    .limit(8);

  return (
    <>
      <h1>Painel</h1>
      <p className="muted">Produção de conteúdo SyncHim — carrosséis e vídeos para Instagram, TikTok e YouTube.</p>

      <h2>Estado por tipo</h2>
      <div className="grid grid-2">
        <Card type="carousel" counts={counts.carousel} href="/admin/carrosseis" />
        <Card type="video" counts={counts.video} href="/admin/videos" />
      </div>

      <h2>Render jobs recentes</h2>
      <div className="card">
        {(!latestJobs || latestJobs.length === 0) && <p className="muted">Sem jobs ainda. Submete um render num carrossel ou vídeo.</p>}
        {latestJobs && latestJobs.length > 0 && (
          <table className="t">
            <thead>
              <tr><th>job</th><th>tipo</th><th>estado</th><th>progresso</th><th>actualizado</th></tr>
            </thead>
            <tbody>
              {latestJobs.map((j) => (
                <tr key={j.job_id}>
                  <td><code style={{ fontSize: 11 }}>{j.job_id}</code></td>
                  <td>{j.kind}</td>
                  <td><span className={`pill ${j.status}`}>{j.status}</span></td>
                  <td>{j.progress}%</td>
                  <td className="muted">{new Date(j.updated_at).toLocaleString('pt-PT')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2>Atalhos</h2>
      <div className="row">
        <Link href="/admin/carrosseis/novo" className="btn primary">+ Novo carrossel</Link>
        <Link href="/admin/videos/novo" className="btn">+ Novo vídeo</Link>
        <form action="/api/admin/seed" method="post"><button className="btn">Importar markdown (60 carrosséis)</button></form>
      </div>
    </>
  );
}

function Card({ type, counts, href }: { type: 'carousel' | 'video'; counts: Record<string, number>; href: string }) {
  return (
    <Link href={href} className="card" style={{ textDecoration: 'none' }}>
      <div className="mini">{type === 'carousel' ? 'Carrosséis' : 'Vídeos'}</div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 42, marginTop: 6 }}>{counts.total}</div>
      <div className="row" style={{ marginTop: 12, gap: 6 }}>
        {(['draft', 'ready', 'rendering', 'rendered', 'published', 'failed'] as const).map((s) =>
          counts[s] > 0 ? <span key={s} className={`pill ${s}`}>{s} · {counts[s]}</span> : null
        )}
      </div>
    </Link>
  );
}
