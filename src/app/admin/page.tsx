import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminEmailFromCookies } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const TZ = process.env.CAMPAIGN_TZ_OFFSET || '+02:00';

export default async function AdminHome() {
  if (!getAdminEmailFromCookies()) redirect('/admin/login');
  const supabase = createSupabaseAdmin();

  // === Carrega tudo o que precisamos numa só passagem ===
  const [{ data: itemsRaw }, { data: slidesRaw }, { data: latestJobs }, { data: campaignJobs }] = await Promise.all([
    supabase.from('content_items').select('id, type, status, target, scheduled_at, code, metadata').limit(2000),
    supabase.from('content_slides').select('design').limit(20000),
    supabase.from('render_jobs').select('job_id, kind, status, progress, message, updated_at').order('updated_at', { ascending: false }).limit(5),
    supabase.from('campaign_jobs').select('job_id, status, progress, current_slot, total_slots, message, created_at').order('created_at', { ascending: false }).limit(5),
  ]);

  // === Filtra arquivados (scheduled_at >= 2099 ou metadata.archived) ===
  const items = (itemsRaw ?? []).filter((i: any) => {
    if (i.metadata?.archived === true) return false;
    if (!i.scheduled_at) return true;
    return new Date(i.scheduled_at) < new Date('2099-01-01');
  });
  const carouselItems = items.filter((i: any) => i.type === 'carousel');

  // === Funil de producao (carrosseis) ===
  const funnel = {
    draft: 0, ready: 0, rendering: 0, rendered: 0, published: 0, failed: 0,
  };
  carouselItems.forEach((i: any) => {
    if (funnel[i.status as keyof typeof funnel] !== undefined) {
      funnel[i.status as keyof typeof funnel]++;
    }
  });
  const totalCarousel = carouselItems.length;

  // === Imagens (Replicate / reuso) ===
  const slides = slidesRaw ?? [];
  let imgGenerated = 0;
  let imgReused = 0;
  let slidesWithoutImage = 0;
  let slidesWithPromptPending = 0;
  slides.forEach((s: any) => {
    const d = s.design ?? {};
    if (d.imageUrl) {
      if (d.reused) imgReused++; else imgGenerated++;
    } else if (d.imagePrompt) {
      slidesWithPromptPending++;
    } else {
      slidesWithoutImage++;
    }
  });
  const totalImagesNeeded = imgGenerated + imgReused + slidesWithPromptPending;
  const imgCost = imgGenerated * 0.04; // Flux Pro

  // === Cobertura por semana ===
  // Agrupa por data inicial da semana (segunda). Mostra todas as semanas que tem items.
  const byWeek = new Map<string, { items: any[]; rendered: number; published: number; draft: number }>();
  carouselItems.forEach((i: any) => {
    if (!i.scheduled_at) return;
    const d = new Date(i.scheduled_at);
    // segunda da semana (dayOfWeek 1)
    const day = d.getUTCDay() || 7; // 1=Mon..7=Sun
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - (day - 1));
    const key = monday.toISOString().slice(0, 10);
    if (!byWeek.has(key)) {
      byWeek.set(key, { items: [], rendered: 0, published: 0, draft: 0 });
    }
    const w = byWeek.get(key)!;
    w.items.push(i);
    if (i.status === 'rendered') w.rendered++;
    if (i.status === 'published') w.published++;
    if (i.status === 'draft') w.draft++;
  });
  const weeks = Array.from(byWeek.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([weekStart, w]) => ({
      weekStart,
      itemCount: w.items.length,
      rendered: w.rendered,
      published: w.published,
      draft: w.draft,
      complete: w.items.length >= 14,
    }));

  // === Proxima accao sugerida ===
  let nextAction: { label: string; href: string; detail: string } | null = null;
  // Prioridade 1: ha muito draft acumulado (>5) — render bulk e mais urgente
  // que exportar 1 rendered isolado.
  if (funnel.draft > 5) {
    nextAction = {
      label: `Render bulk (${funnel.draft} draft)`,
      href: '/admin/carrosseis',
      detail: 'Tens muitos carrosseis em draft com texto e imagens — faltam compor os PNGs finais antes do Metricool.',
    };
  } else if (funnel.draft > 0 && funnel.rendered === 0 && funnel.failed === 0) {
    nextAction = {
      label: `Render bulk (${funnel.draft} draft)`,
      href: '/admin/carrosseis',
      detail: 'Tens carrosseis em draft com texto e imagens — faltam compor os PNGs finais.',
    };
  } else if (funnel.rendered > 0 && funnel.published === 0 && funnel.draft === 0) {
    nextAction = {
      label: `Export Metricool (${funnel.rendered} rendered)`,
      href: '/admin/metricool',
      detail: 'PNGs prontos. Falta exportar CSV + ZIP para o Metricool.',
    };
  } else if (slidesWithPromptPending > 50) {
    nextAction = {
      label: `${slidesWithPromptPending} slides com prompt sem imagem`,
      href: '/admin/planear',
      detail: 'Muitos slides ficaram com prompt mas sem imagem. Usa "Retomar imagens" no planear.',
    };
  } else if (weeks.length < 5) {
    const last = weeks[weeks.length - 1];
    const nextMonday = last ? nextWeek(last.weekStart) : todayMonday();
    nextAction = {
      label: `Planear próxima semana (${nextMonday})`,
      href: '/admin/planear',
      detail: `Tens ${weeks.length} semanas planeadas. Faltam ${5 - weeks.length} para a campanha de 30 dias.`,
    };
  } else {
    nextAction = {
      label: 'Campanha completa',
      href: '/admin/calendario',
      detail: 'As 5 semanas estão planeadas. Ver no calendário.',
    };
  }

  return (
    <>
      <h1>Painel</h1>
      <p className="muted">Ponto de situação da produção SyncHim.</p>

      {/* Próxima acção em destaque */}
      <div className="card" style={{ marginTop: 16, borderColor: 'var(--ouro)' }}>
        <div className="mini" style={{ marginBottom: 6 }}>Próxima acção</div>
        <div className="row between" style={{ gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px' }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 22, marginBottom: 4 }}>{nextAction.label}</div>
            <div className="muted" style={{ fontSize: 13 }}>{nextAction.detail}</div>
          </div>
          <Link href={nextAction.href} className="btn primary">Avançar →</Link>
        </div>
      </div>

      {/* Funil de produção */}
      <h2>Funil de produção</h2>
      <div className="card">
        <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
          <Stat label="Total carrosseis" value={totalCarousel} big />
          <Stat label="Draft" value={funnel.draft} color="texto-suave" />
          <Stat label="Rendering" value={funnel.rendering} color="ouro-folha" />
          <Stat label="Rendered" value={funnel.rendered} color="#6EBB7B" />
          <Stat label="Published" value={funnel.published} color="#6EBB7B" />
          <Stat label="Failed" value={funnel.failed} color="bordeaux" />
        </div>
      </div>

      {/* Cobertura por semana */}
      <h2>Cobertura da campanha</h2>
      <div className="card">
        {weeks.length === 0 ? (
          <p className="muted">Nenhuma semana planeada. Começa em <Link href="/admin/planear">/admin/planear</Link>.</p>
        ) : (
          <table className="t">
            <thead>
              <tr>
                <th>semana de</th><th>carrosseis</th><th>draft</th>
                <th>rendered</th><th>published</th><th>cobertura</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w.weekStart}>
                  <td><code style={{ fontSize: 12 }}>{w.weekStart}</code></td>
                  <td>{w.itemCount} / 14</td>
                  <td className="muted">{w.draft}</td>
                  <td>{w.rendered}</td>
                  <td>{w.published}</td>
                  <td>
                    <span className={`pill ${w.complete ? 'ready' : 'draft'}`}>
                      {w.complete ? 'completa' : `parcial (${w.itemCount}/14)`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Imagens */}
      <h2>Imagens</h2>
      <div className="card">
        <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
          <Stat label="Geradas (Replicate)" value={imgGenerated} />
          <Stat label="Reusadas (biblioteca)" value={imgReused} />
          <Stat label="Slides com prompt sem imagem" value={slidesWithPromptPending} color="bordeaux" />
          <Stat label="Custo total estimado" value={`$${imgCost.toFixed(2)}`} />
        </div>
        <div className="row" style={{ marginTop: 12, gap: 8 }}>
          <Link href="/admin/biblioteca" className="btn">Ver biblioteca</Link>
          {slidesWithPromptPending > 0 && (
            <Link href="/admin/prompts" className="btn">Resolver pendentes</Link>
          )}
        </div>
      </div>

      {/* Campaign jobs em curso */}
      {campaignJobs && campaignJobs.length > 0 && (
        <>
          <h2>Campaign jobs (background)</h2>
          <div className="card">
            <table className="t">
              <thead><tr><th>job</th><th>estado</th><th>progresso</th><th>actualizado</th></tr></thead>
              <tbody>
                {campaignJobs.map((j: any) => (
                  <tr key={j.job_id}>
                    <td><Link href={`/admin/campaign-jobs/${j.job_id}`}>
                      <code style={{ fontSize: 11 }}>{j.job_id.slice(9, 22)}…</code>
                    </Link></td>
                    <td><span className={`pill ${j.status}`}>{j.status}</span></td>
                    <td>{j.progress}% · {j.current_slot}/{j.total_slots}</td>
                    <td className="muted">{new Date(j.created_at).toLocaleString('pt-PT')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Render jobs recentes */}
      {latestJobs && latestJobs.length > 0 && (
        <>
          <h2>Render jobs recentes</h2>
          <div className="card">
            <table className="t">
              <thead><tr><th>job</th><th>tipo</th><th>estado</th><th>progresso</th><th>actualizado</th></tr></thead>
              <tbody>
                {latestJobs.map((j: any) => (
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
          </div>
        </>
      )}

      <h2>Atalhos</h2>
      <div className="row">
        <Link href="/admin/planear" className="btn primary">Planear</Link>
        <Link href="/admin/carrosseis" className="btn">Carrosseis</Link>
        <Link href="/admin/biblioteca" className="btn">Biblioteca</Link>
        <Link href="/admin/calendario" className="btn">Calendário</Link>
        <Link href="/admin/metricool" className="btn">Metricool</Link>
      </div>
    </>
  );
}

function Stat({ label, value, big, color }: { label: string; value: number | string; big?: boolean; color?: string }) {
  const colorVar = color?.startsWith('#') ? color : color ? `var(--${color})` : 'var(--texto)';
  return (
    <div style={{ minWidth: 140 }}>
      <div className="mini" style={{ marginBottom: 4 }}>{label}</div>
      <div style={{
        fontFamily: 'var(--serif)',
        fontSize: big ? 42 : 28,
        color: colorVar,
        lineHeight: 1,
      }}>{value}</div>
    </div>
  );
}

function todayMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function nextWeek(weekStart: string): string {
  const d = new Date(`${weekStart}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString().slice(0, 10);
}
