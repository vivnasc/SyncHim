import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminEmailFromCookies } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { CATEGORIAS_CARROSSEL } from '@/lib/admin/brand';

export const dynamic = 'force-dynamic';

const TARGET_LABELS: Record<string, string> = {
  casada: 'casadas',
  solteira: 'solteiras',
  ambos: 'ambas'
};

export default async function CarrosseisList({
  searchParams
}: {
  searchParams?: { target?: string };
}) {
  if (!getAdminEmailFromCookies()) redirect('/admin/login');
  const supabase = createSupabaseAdmin();
  const filter = searchParams?.target;

  let q = supabase
    .from('content_items')
    .select('id, code, title, categoria, target, status, scheduled_at, platforms, updated_at')
    .eq('type', 'carousel')
    .order('code', { ascending: true })
    .limit(500);
  if (filter && ['casada', 'solteira', 'ambos'].includes(filter)) {
    q = q.eq('target', filter);
  }
  const { data: items } = await q;

  const counts = { casada: 0, solteira: 0, ambos: 0, total: 0 };
  (items ?? []).forEach((i: any) => {
    counts[(i.target ?? 'casada') as 'casada' | 'solteira' | 'ambos']++;
    counts.total++;
  });

  const byCategoria = new Map<string, any[]>();
  (items ?? []).forEach((i) => {
    const k = i.categoria || 'sem-categoria';
    if (!byCategoria.has(k)) byCategoria.set(k, []);
    byCategoria.get(k)!.push(i);
  });

  return (
    <>
      <div className="row between">
        <div>
          <h1>Carrosséis</h1>
          <p className="muted">1080×1350, fundo escuro, serifada. Cada carrossel pode ter público <em>casada</em>, <em>solteira</em>, ou <em>ambas</em>.</p>
        </div>
        <Link href="/admin/carrosseis/novo" className="btn primary">+ Novo carrossel</Link>
      </div>

      <div className="row" style={{ marginTop: 14, gap: 6 }}>
        <Link href="/admin/carrosseis" className={`btn ${!filter ? 'primary' : ''}`}>todos · {counts.total}</Link>
        <Link href="/admin/carrosseis?target=casada"   className={`btn ${filter === 'casada' ? 'primary' : ''}`}>casadas · {counts.casada}</Link>
        <Link href="/admin/carrosseis?target=solteira" className={`btn ${filter === 'solteira' ? 'primary' : ''}`}>solteiras · {counts.solteira}</Link>
        <Link href="/admin/carrosseis?target=ambos"    className={`btn ${filter === 'ambos' ? 'primary' : ''}`}>ambas · {counts.ambos}</Link>
      </div>

      {(!items || items.length === 0) && !filter && (
        <div className="card" style={{ marginTop: 18 }}>
          <p>Ainda não há carrosséis. Importa o seed dos markdowns existentes:</p>
          <form action="/api/admin/seed" method="post">
            <button className="btn primary">Importar 60 carrosséis do markdown (casadas)</button>
          </form>
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            Os markdowns originais foram escritos para casadas. Depois de importar, podes duplicar cada um como &ldquo;solteira&rdquo; no editor (botão <em>duplicar →</em>) para gerar a variante editorial.
          </p>
        </div>
      )}

      {Array.from(byCategoria.entries()).map(([cat, list]) => (
        <section key={cat} style={{ marginTop: 24 }}>
          <h2>{(CATEGORIAS_CARROSSEL as any)[cat]?.label ?? cat} <span className="muted" style={{ fontSize: 13 }}>· {list.length}</span></h2>
          <table className="t">
            <thead>
              <tr>
                <th style={{ width: 90 }}>código</th>
                <th>título</th>
                <th style={{ width: 90 }}>público</th>
                <th style={{ width: 110 }}>estado</th>
                <th style={{ width: 140 }}>agendado</th>
                <th style={{ width: 120 }}>plataformas</th>
              </tr>
            </thead>
            <tbody>
              {list.map((i) => (
                <tr key={i.id}>
                  <td><code style={{ fontSize: 12 }}>{i.code}</code></td>
                  <td><Link href={`/admin/carrosseis/${i.id}`}>{i.title}</Link></td>
                  <td className="muted">{TARGET_LABELS[i.target ?? 'casada']}</td>
                  <td><span className={`pill ${i.status}`}>{i.status}</span></td>
                  <td className="muted">{i.scheduled_at ? new Date(i.scheduled_at).toLocaleDateString('pt-PT') : '—'}</td>
                  <td className="muted">{(i.platforms ?? []).join(' · ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </>
  );
}
