import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminEmailFromCookies } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * Galeria visual de carrosseis renderizados (PNGs finais Puppeteer).
 * Cada card mostra capa em destaque + tira de 8 thumbnails + download ZIP.
 *
 * Diferente da biblioteca (imagens fonte Replicate) — aqui sao os PNGs
 * compostos finais, prontos a publicar.
 */
export default async function RenderizadosPage({
  searchParams,
}: {
  searchParams?: { status?: string; weekStart?: string };
}) {
  if (!getAdminEmailFromCookies()) redirect('/admin/login');
  const supabase = createSupabaseAdmin();

  const status = searchParams?.status ?? 'rendered';
  let q = supabase
    .from('content_items')
    .select('id, code, title, status, scheduled_at, output_urls, target, categoria, metadata')
    .eq('type', 'carousel')
    .in('status', status === 'all'
      ? ['rendered', 'published', 'failed']
      : [status])
    .not('output_urls', 'is', null)
    .order('code', { ascending: true })
    .limit(500);

  const { data: rawItems } = await q;
  const items = (rawItems ?? []).filter((i: any) => {
    if (i.metadata?.archived === true) return false;
    if (!i.output_urls?.pngs?.length) return false;
    return true;
  });

  // Agrupa por semana (segunda local CAT)
  const tzOffsetHours = 2;
  const byWeek = new Map<string, any[]>();
  items.forEach((i: any) => {
    if (!i.scheduled_at) {
      const k = 'sem-data';
      if (!byWeek.has(k)) byWeek.set(k, []);
      byWeek.get(k)!.push(i);
      return;
    }
    const local = new Date(new Date(i.scheduled_at).getTime() + tzOffsetHours * 60 * 60 * 1000);
    const day = local.getUTCDay() || 7;
    const monday = new Date(local);
    monday.setUTCDate(local.getUTCDate() - (day - 1));
    const k = monday.toISOString().slice(0, 10);
    if (!byWeek.has(k)) byWeek.set(k, []);
    byWeek.get(k)!.push(i);
  });

  const weeks = Array.from(byWeek.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const stats = {
    total: items.length,
    rendered: items.filter((i: any) => i.status === 'rendered').length,
    published: items.filter((i: any) => i.status === 'published').length,
    failed: items.filter((i: any) => i.status === 'failed').length,
  };

  return (
    <>
      <h1>Carrosseis renderizados</h1>
      <p className="muted">
        PNGs finais compostos (Puppeteer + template). Diferente da{' '}
        <Link href="/admin/biblioteca">biblioteca</Link> que mostra as imagens fonte (Replicate).
      </p>

      <div className="row" style={{ marginTop: 12, gap: 6 }}>
        <Link href="/admin/renderizados" className={`btn ${status === 'rendered' ? 'primary' : ''}`}>
          rendered · {stats.rendered}
        </Link>
        <Link href="/admin/renderizados?status=published" className={`btn ${status === 'published' ? 'primary' : ''}`}>
          published · {stats.published}
        </Link>
        <Link href="/admin/renderizados?status=failed" className={`btn ${status === 'failed' ? 'primary' : ''}`}>
          failed · {stats.failed}
        </Link>
        <Link href="/admin/renderizados?status=all" className={`btn ${status === 'all' ? 'primary' : ''}`}>
          todos · {stats.total}
        </Link>
      </div>

      {weeks.length === 0 ? (
        <div className="card" style={{ marginTop: 18 }}>
          <p className="muted">Sem carrosseis renderizados ainda.</p>
        </div>
      ) : (
        weeks.map(([weekStart, list]) => (
          <section key={weekStart} style={{ marginTop: 24 }}>
            <h2>
              {weekStart === 'sem-data' ? 'Sem data agendada' : `Semana de ${weekStart}`}
              <span className="muted" style={{ fontSize: 13 }}> · {list.length}</span>
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
              marginTop: 12,
            }}>
              {list.map((it: any) => (
                <CarrosselCard key={it.id} item={it} />
              ))}
            </div>
          </section>
        ))
      )}
    </>
  );
}

function CarrosselCard({ item }: { item: any }) {
  const pngs: string[] = item.output_urls?.pngs ?? [];
  const zip: string | undefined = item.output_urls?.zip;
  const cover = pngs[0];
  const localTime = item.scheduled_at
    ? new Date(new Date(item.scheduled_at).getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16).replace('T', ' ')
    : '—';

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <Link href={`/admin/carrosseis/${item.id}`} style={{ display: 'block', lineHeight: 0 }}>
        {/* background-image em vez de <img> — evita bug Safari onde img
            com aspectRatio dentro de Link computa 0 height. */}
        <div style={{
          width: '100%',
          aspectRatio: '1080 / 1350',
          backgroundImage: `url("${cover}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#0A0A0A',
        }} />
      </Link>
      <div style={{ padding: 12 }}>
        <div className="row between" style={{ marginBottom: 6 }}>
          <code style={{ fontSize: 11 }}>{item.code}</code>
          <span className={`pill ${item.status}`}>{item.status}</span>
        </div>
        <div style={{ fontSize: 13, fontFamily: 'var(--serif)', marginBottom: 4 }}>
          {item.title}
        </div>
        <div className="muted" style={{ fontSize: 11, marginBottom: 10 }}>
          {localTime} · {item.categoria}
        </div>

        {/* Tira com thumbnails dos 8 slides — também via background-image */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(pngs.length, 8)}, 1fr)`,
          gap: 2,
          marginBottom: 10,
        }}>
          {pngs.slice(0, 8).map((u, i) => (
            <a key={u} href={u} target="_blank" rel="noreferrer"
              style={{ display: 'block', lineHeight: 0 }}>
              <div style={{
                width: '100%',
                aspectRatio: '1080 / 1350',
                backgroundImage: `url("${u}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundColor: '#0A0A0A',
                borderRadius: 2,
              }} title={`slide ${i + 1}`} />
            </a>
          ))}
        </div>

        <div className="row" style={{ gap: 6 }}>
          <Link href={`/admin/carrosseis/${item.id}`} className="btn" style={{ fontSize: 11, flex: 1, textAlign: 'center' }}>
            abrir editor
          </Link>
          {zip && (
            <a href={zip} className="btn" style={{ fontSize: 11, flex: 1, textAlign: 'center' }}>
              ↓ ZIP
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
