import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminEmailFromCookies } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { CATEGORIAS_CARROSSEL } from '@/lib/admin/brand';

export const dynamic = 'force-dynamic';

export default async function CarrosseisList() {
  if (!getAdminEmailFromCookies()) redirect('/admin/login');
  const supabase = createSupabaseAdmin();

  const { data: items } = await supabase
    .from('content_items')
    .select('id, code, title, categoria, status, scheduled_at, platforms, updated_at')
    .eq('type', 'carousel')
    .order('code', { ascending: true })
    .limit(500);

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
          <p className="muted">60 carrosséis planeados para os primeiros 30 dias. 1080×1350, fundo escuro, serifada.</p>
        </div>
        <Link href="/admin/carrosseis/novo" className="btn primary">+ Novo carrossel</Link>
      </div>

      {(!items || items.length === 0) && (
        <div className="card">
          <p>Ainda não há carrosséis. Importa o seed dos markdowns existentes:</p>
          <form action="/api/admin/seed" method="post">
            <button className="btn primary">Importar 60 carrosséis do markdown</button>
          </form>
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
