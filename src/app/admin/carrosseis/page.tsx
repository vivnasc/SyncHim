import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminEmailFromCookies } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { CATEGORIAS_CARROSSEL } from '@/lib/admin/brand';
import { CleanupTestsButton } from './CleanupTestsButton';
import { BulkRenderButton } from './BulkRenderButton';

export const dynamic = 'force-dynamic';

export default async function CarrosseisList() {
  if (!getAdminEmailFromCookies()) redirect('/admin/login');
  const supabase = createSupabaseAdmin();

  const { data: rawItems } = await supabase
    .from('content_items')
    .select('id, code, title, categoria, status, scheduled_at, platforms, updated_at, metadata')
    .eq('type', 'carousel')
    .order('code', { ascending: true })
    .limit(500);

  // Filtro JS-side em vez de .or() do Supabase (sintaxe fragil com datas):
  // esconde apenas items que sejam explicitamente arquivados (scheduled_at
  // a partir de 2099) ou marcados em metadata.archived. Items sem
  // scheduled_at passam normalmente (e.g. seed inicial).
  const items = (rawItems ?? []).filter((i: any) => {
    if ((i.metadata as any)?.archived === true) return false;
    if (!i.scheduled_at) return true;
    return new Date(i.scheduled_at) < new Date('2099-01-01');
  });

  const total = (items ?? []).length;

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
          <p className="muted">1080×1350, fundo escuro, serifada.</p>
        </div>
        <Link href="/admin/carrosseis/novo" className="btn primary">+ Novo carrossel</Link>
      </div>

      <div className="row" style={{ marginTop: 14, gap: 6 }}>
        <span className="muted" style={{ fontSize: 12 }}>total · {total}</span>
        <BulkRenderButton />
        <CleanupTestsButton />
      </div>

      {(!items || items.length === 0) && (
        <div className="card" style={{ marginTop: 18 }}>
          <p>Ainda não há carrosséis. Importa o seed dos markdowns existentes:</p>
          <form action="/api/admin/seed" method="post">
            <button className="btn primary">Importar carrosséis do markdown</button>
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
