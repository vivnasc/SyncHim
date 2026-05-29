import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminEmailFromCookies } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const STATUS_COLORS: Record<string, string> = {
  draft: 'var(--linha)',
  ready: 'var(--ouro)',
  rendering: 'var(--ouro-folha)',
  rendered: '#6EBB7B',
  published: '#3D8B47',
  failed: 'var(--bordeaux)',
};

/**
 * Calendario com navegacao prev/next, filtro de arquivados, cor por
 * status e horas locais em CAT (CAMPAIGN_TZ_OFFSET).
 *
 * URL: /admin/calendario?start=YYYY-MM-DD&weeks=4
 */
export default async function Calendario({
  searchParams,
}: {
  searchParams?: { start?: string; weeks?: string };
}) {
  if (!getAdminEmailFromCookies()) redirect('/admin/login');
  const supabase = createSupabaseAdmin();

  const weeks = Math.max(1, Math.min(parseInt(searchParams?.weeks ?? '4', 10), 12));
  const tzOffsetHours = parseTzOffset(process.env.CAMPAIGN_TZ_OFFSET || '+02:00');

  // Domingo da semana que contem `start` (ou hoje)
  const startLocal = searchParams?.start
    ? new Date(`${searchParams.start}T00:00:00Z`)
    : currentSundayLocal(tzOffsetHours);
  const endLocal = new Date(startLocal);
  endLocal.setUTCDate(endLocal.getUTCDate() + weeks * 7);

  // Local 00:00 -> UTC do query: subtrai o offset
  const startUtc = new Date(startLocal.getTime() - tzOffsetHours * 60 * 60 * 1000);
  const endUtc = new Date(endLocal.getTime() - tzOffsetHours * 60 * 60 * 1000);

  const { data: rawItems } = await supabase
    .from('content_items')
    .select('id, code, title, type, subtype, target, categoria, status, scheduled_at, metadata')
    .gte('scheduled_at', startUtc.toISOString())
    .lt('scheduled_at', endUtc.toISOString())
    .order('scheduled_at', { ascending: true });

  const items = (rawItems ?? []).filter((i: any) => {
    if (i.metadata?.archived === true) return false;
    if (!i.scheduled_at) return false;
    return new Date(i.scheduled_at) < new Date('2099-01-01');
  });

  // Agrupa por dia LOCAL e atribui hora local
  const byDay = new Map<string, any[]>();
  items.forEach((it: any) => {
    const utc = new Date(it.scheduled_at);
    const local = new Date(utc.getTime() + tzOffsetHours * 60 * 60 * 1000);
    const k = local.toISOString().slice(0, 10);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push({ ...it, _localTime: local.toISOString().slice(11, 16) });
  });

  // Grelha
  const days: { date: Date; key: string }[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(startLocal);
    d.setUTCDate(startLocal.getUTCDate() + i);
    days.push({ date: d, key: d.toISOString().slice(0, 10) });
  }
  const todayKey = currentDayLocal(tzOffsetHours);

  const prevStart = new Date(startLocal);
  prevStart.setUTCDate(prevStart.getUTCDate() - weeks * 7);
  const nextStart = new Date(startLocal);
  nextStart.setUTCDate(nextStart.getUTCDate() + weeks * 7);
  const todayStart = currentSundayLocal(tzOffsetHours).toISOString().slice(0, 10);

  const stats = {
    total: items.length,
    rendered: items.filter((i: any) => i.status === 'rendered').length,
    published: items.filter((i: any) => i.status === 'published').length,
    draft: items.filter((i: any) => i.status === 'draft').length,
    failed: items.filter((i: any) => i.status === 'failed').length,
  };

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <>
      <h1>Calendário</h1>
      <p className="muted">
        {weeks} {weeks === 1 ? 'semana' : 'semanas'} a partir de {fmt(startLocal)}.
        Hora local: {process.env.CAMPAIGN_TZ_OFFSET || '+02:00'}. Arquivados excluídos.
      </p>

      <div className="row between" style={{ marginTop: 12, gap: 8, flexWrap: 'wrap' }}>
        <div className="row" style={{ gap: 6 }}>
          <Link href={`/admin/calendario?start=${fmt(prevStart)}&weeks=${weeks}`} className="btn">← anterior</Link>
          <Link href={`/admin/calendario?start=${todayStart}&weeks=${weeks}`} className="btn">hoje</Link>
          <Link href={`/admin/calendario?start=${fmt(nextStart)}&weeks=${weeks}`} className="btn">seguinte →</Link>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <Link href={`/admin/calendario?start=${fmt(startLocal)}&weeks=2`} className={`btn ${weeks === 2 ? 'primary' : ''}`}>2 sem</Link>
          <Link href={`/admin/calendario?start=${fmt(startLocal)}&weeks=4`} className={`btn ${weeks === 4 ? 'primary' : ''}`}>4 sem</Link>
          <Link href={`/admin/calendario?start=${fmt(startLocal)}&weeks=8`} className={`btn ${weeks === 8 ? 'primary' : ''}`}>8 sem</Link>
        </div>
      </div>

      <div className="row" style={{ marginTop: 12, gap: 12, fontSize: 12, flexWrap: 'wrap' }}>
        <span className="muted">Visíveis: {stats.total}</span>
        <span style={{ color: STATUS_COLORS.rendered }}>● rendered: {stats.rendered}</span>
        <span style={{ color: STATUS_COLORS.published }}>● published: {stats.published}</span>
        <span className="muted">● draft: {stats.draft}</span>
        {stats.failed > 0 && <span style={{ color: STATUS_COLORS.failed }}>● failed: {stats.failed}</span>}
      </div>

      <div className="cal-grid" style={{ marginTop: 16 }}>
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
          <div key={d} className="mini" style={{ textAlign: 'center', padding: '4px 0' }}>{d}</div>
        ))}
        {days.map(({ date, key }) => {
          const list = byDay.get(key) ?? [];
          const isToday = key === todayKey;
          return (
            <div key={key} className={`cal-day ${isToday ? 'today' : ''}`}>
              <div className="d">{date.getUTCDate()}</div>
              {list.map((it: any) => {
                const color = STATUS_COLORS[it.status as string] ?? 'var(--linha)';
                return (
                  <Link
                    key={it.id}
                    href={`/admin/${it.type === 'video' ? 'videos' : 'carrosseis'}/${it.id}`}
                    className={`it ${it.type}`}
                    title={`${it.code} · ${it.title} · ${it.status} · ${it._localTime}`}
                    style={{
                      textDecoration: 'none', color: 'inherit',
                      borderLeftColor: color,
                    }}
                  >
                    <span style={{ opacity: 0.7, fontSize: 10 }}>{it._localTime}</span>{' '}
                    <span style={{ opacity: 0.7, fontSize: 10 }}>{it.code}</span>{' '}
                    {it.title.slice(0, 22)}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
}

function parseTzOffset(s: string): number {
  const m = s.match(/^([+-])(\d{2}):(\d{2})$/);
  if (!m) return 0;
  const sign = m[1] === '-' ? -1 : 1;
  return sign * (parseInt(m[2], 10) + parseInt(m[3], 10) / 60);
}

function currentDayLocal(tzOffsetHours: number): string {
  const nowLocal = new Date(Date.now() + tzOffsetHours * 60 * 60 * 1000);
  return nowLocal.toISOString().slice(0, 10);
}

function currentSundayLocal(tzOffsetHours: number): Date {
  const nowLocal = new Date(Date.now() + tzOffsetHours * 60 * 60 * 1000);
  const day = nowLocal.getUTCDay();
  const sunday = new Date(nowLocal);
  sunday.setUTCDate(nowLocal.getUTCDate() - day);
  sunday.setUTCHours(0, 0, 0, 0);
  return sunday;
}
