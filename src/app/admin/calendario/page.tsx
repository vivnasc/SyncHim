import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminEmailFromCookies } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * Calendário simples: as próximas 4 semanas. Os itens são posicionados
 * pelo `scheduled_at`. Hover mostra título; click leva ao editor.
 */
export default async function Calendario() {
  if (!getAdminEmailFromCookies()) redirect('/admin/login');
  const supabase = createSupabaseAdmin();

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay()); // segunda? domingo? começamos no domingo (pt convencional)

  const end = new Date(start);
  end.setDate(start.getDate() + 7 * 4);

  const { data: items } = await supabase
    .from('content_items')
    .select('id, code, title, type, subtype, target, categoria, status, scheduled_at')
    .gte('scheduled_at', start.toISOString())
    .lt('scheduled_at', end.toISOString())
    .order('scheduled_at', { ascending: true });

  const byDay = new Map<string, any[]>();
  (items ?? []).forEach((it) => {
    const k = new Date(it.scheduled_at!).toISOString().slice(0, 10);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(it);
  });

  const days: Date[] = [];
  for (let i = 0; i < 7 * 4; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    days.push(d);
  }
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <h1>Calendário</h1>
      <p className="muted">Próximas 4 semanas. Agenda cada peça pelo editor individual; aparecem aqui automaticamente.</p>

      <div className="cal-grid" style={{ marginTop: 20 }}>
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
          <div key={d} className="mini" style={{ textAlign: 'center', padding: '4px 0' }}>{d}</div>
        ))}
        {days.map((d) => {
          const k = d.toISOString().slice(0, 10);
          const list = byDay.get(k) ?? [];
          return (
            <div key={k} className={`cal-day ${k === today ? 'today' : ''}`}>
              <div className="d">{d.getDate()}</div>
              {list.map((it) => (
                <Link
                  key={it.id}
                  href={`/admin/${it.type === 'video' ? 'videos' : 'carrosseis'}/${it.id}`}
                  className={`it ${it.type} ${it.categoria === 'cta' ? 'cta' : ''}`}
                  title={`${it.code} · ${it.title} · público: ${it.target ?? 'casada'}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <span style={{ opacity: 0.7, fontSize: 10 }}>{(it.target ?? 'casada').slice(0, 1).toUpperCase()}</span>{' '}
                  {it.code} · {it.title.slice(0, 20)}
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}
