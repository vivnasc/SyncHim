import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminEmailFromCookies } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { SyncRendersButton } from './SyncRendersButton';

export const dynamic = 'force-dynamic';

/**
 * Galeria de tudo o que foi renderizado: carrosseis (PNGs) e reels (MP4).
 * Filtros por tipo + status + target. Agrupa por semana agendada.
 */
export default async function RenderizadosPage({
  searchParams,
}: {
  searchParams?: { status?: string; kind?: string; target?: string };
}) {
  if (!getAdminEmailFromCookies()) redirect('/admin/login');
  const supabase = createSupabaseAdmin();

  const status = searchParams?.status ?? 'rendered';
  const kind = searchParams?.kind ?? 'all'; // all | carousel | video
  const target = searchParams?.target ?? 'all';

  let q = supabase
    .from('content_items')
    .select('id, code, title, type, status, scheduled_at, output_urls, target, categoria, metadata')
    .in('status', status === 'all' ? ['rendered', 'published', 'failed'] : [status])
    .not('output_urls', 'is', null)
    .order('code', { ascending: true })
    .limit(1000);
  if (kind !== 'all') q = q.eq('type', kind);
  if (target !== 'all') q = q.eq('target', target);

  const { data: rawItems } = await q;
  const items = (rawItems ?? []).filter((i: any) => {
    if (i.metadata?.archived === true) return false;
    // Carrossel precisa de PNGs, vídeo precisa de mp4 url
    if (i.type === 'carousel' && !i.output_urls?.pngs?.length) return false;
    if (i.type === 'video' && !i.output_urls?.video) return false;
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
    carousel: items.filter((i: any) => i.type === 'carousel').length,
    video: items.filter((i: any) => i.type === 'video').length,
  };

  // Targets distintos para filtro
  const targets = Array.from(new Set(items.map((i: any) => i.target).filter(Boolean))) as string[];

  const baseQuery = (overrides: Partial<{ status: string; kind: string; target: string }>) => {
    const p = new URLSearchParams();
    const s = overrides.status ?? status;
    const k = overrides.kind ?? kind;
    const t = overrides.target ?? target;
    if (s !== 'rendered') p.set('status', s);
    if (k !== 'all') p.set('kind', k);
    if (t !== 'all') p.set('target', t);
    const qs = p.toString();
    return qs ? `/admin/renderizados?${qs}` : '/admin/renderizados';
  };

  return (
    <>
      <div className="row between">
        <div>
          <h1>Renderizados</h1>
          <p className="muted">Carrosseis (PNG) e reels (MP4) já compostos.</p>
        </div>
        <SyncRendersButton />
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 }}>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          <span className="muted" style={{ fontSize: 11, alignSelf: 'center', minWidth: 56 }}>tipo:</span>
          <Link href={baseQuery({ kind: 'all' })} className={`btn ${kind === 'all' ? 'primary' : ''}`} style={{ fontSize: 11 }}>todos · {stats.total}</Link>
          <Link href={baseQuery({ kind: 'carousel' })} className={`btn ${kind === 'carousel' ? 'primary' : ''}`} style={{ fontSize: 11 }}>carrosseis · {stats.carousel}</Link>
          <Link href={baseQuery({ kind: 'video' })} className={`btn ${kind === 'video' ? 'primary' : ''}`} style={{ fontSize: 11 }}>reels · {stats.video}</Link>
        </div>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          <span className="muted" style={{ fontSize: 11, alignSelf: 'center', minWidth: 56 }}>estado:</span>
          <Link href={baseQuery({ status: 'rendered' })} className={`btn ${status === 'rendered' ? 'primary' : ''}`} style={{ fontSize: 11 }}>rendered · {stats.rendered}</Link>
          <Link href={baseQuery({ status: 'published' })} className={`btn ${status === 'published' ? 'primary' : ''}`} style={{ fontSize: 11 }}>published · {stats.published}</Link>
          <Link href={baseQuery({ status: 'failed' })} className={`btn ${status === 'failed' ? 'primary' : ''}`} style={{ fontSize: 11 }}>failed · {stats.failed}</Link>
          <Link href={baseQuery({ status: 'all' })} className={`btn ${status === 'all' ? 'primary' : ''}`} style={{ fontSize: 11 }}>todos</Link>
        </div>
        {targets.length > 1 && (
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <span className="muted" style={{ fontSize: 11, alignSelf: 'center', minWidth: 56 }}>target:</span>
            <Link href={baseQuery({ target: 'all' })} className={`btn ${target === 'all' ? 'primary' : ''}`} style={{ fontSize: 11 }}>todos</Link>
            {targets.map((t) => (
              <Link key={t} href={baseQuery({ target: t })} className={`btn ${target === t ? 'primary' : ''}`} style={{ fontSize: 11 }}>{t}</Link>
            ))}
          </div>
        )}
      </div>

      {weeks.length === 0 ? (
        <div className="card" style={{ marginTop: 18 }}>
          <p className="muted">
            Sem itens com este filtro. Se os teus reels acabaram de render no GitHub Actions, carrega &ldquo;Sincronizar renders pendentes&rdquo; em cima.
          </p>
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
                it.type === 'video'
                  ? <ReelCard key={it.id} item={it} />
                  : <CarrosselCard key={it.id} item={it} />
              ))}
            </div>
          </section>
        ))
      )}
    </>
  );
}

function ReelCard({ item }: { item: any }) {
  const video: string = item.output_urls?.video;
  const localTime = item.scheduled_at
    ? new Date(new Date(item.scheduled_at).getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16).replace('T', ' ')
    : '—';

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <video
        src={video}
        controls
        preload="metadata"
        playsInline
        style={{ width: '100%', aspectRatio: '1080 / 1920', display: 'block', background: '#0A0A0A' }}
      />
      <div style={{ padding: 12 }}>
        <div className="row between" style={{ marginBottom: 6 }}>
          <code style={{ fontSize: 11 }}>{item.code}</code>
          <span className={`pill ${item.status}`}>{item.status}</span>
        </div>
        <div style={{ fontSize: 13, fontFamily: 'var(--serif)', marginBottom: 4 }}>
          {item.title}
        </div>
        <div className="muted" style={{ fontSize: 11, marginBottom: 10 }}>
          {localTime} · {item.target ?? ''} · {item.categoria ?? ''}
        </div>
        <div className="row" style={{ gap: 6 }}>
          <Link href={`/admin/videos/${item.id}`} className="btn" style={{ fontSize: 11, flex: 1, textAlign: 'center' }}>
            abrir editor
          </Link>
          <a href={video} download className="btn" style={{ fontSize: 11, flex: 1, textAlign: 'center' }}>
            ↓ MP4
          </a>
        </div>
      </div>
    </div>
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
      <Link href={`/admin/carrosseis/${item.id}`} style={{ display: 'block' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cover}
          alt={item.title}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          style={{
            width: '100%', aspectRatio: '1080 / 1350', objectFit: 'cover',
            display: 'block', background: '#0A0A0A',
          }}
        />
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
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(pngs.length, 8)}, 1fr)`,
          gap: 2,
          marginBottom: 10,
        }}>
          {pngs.slice(0, 8).map((u, i) => (
            <a key={u} href={u} target="_blank" rel="noreferrer" style={{ display: 'block', lineHeight: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt={`slide ${i + 1}`} loading="lazy" style={{
                width: '100%', aspectRatio: '1080 / 1350', objectFit: 'cover',
                background: '#0A0A0A', borderRadius: 2,
              }} />
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
