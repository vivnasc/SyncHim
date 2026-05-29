'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Botoes inline na linha de cobertura semanal: render bulk so dos
 * carrosseis dessa semana.
 */
export function WeekRenderButton({ weekStart, draft }: { weekStart: string; draft: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!confirm(
      `Render ${draft} carrosseis em draft da semana de ${weekStart}?\n\n` +
      `Dispara ${draft} GitHub Actions runs em paralelo (max 20 simultaneos).\n` +
      `Total ~3-5 min. Vais ver progresso em /admin/render-jobs.`
    )) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/carrosseis/bulk-render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft', weekStart, confirm: true }),
      });
      const j = await res.json();
      if (!res.ok) { alert(j.error || `falhou (${res.status})`); return; }
      alert(`Disparados ${j.dispatched} renders. Redirecciono para render-jobs.`);
      router.push('/admin/render-jobs');
    } finally { setBusy(false); }
  }

  if (draft === 0) return <span className="muted" style={{ fontSize: 11 }}>—</span>;
  return (
    <button className="btn" style={{ fontSize: 11, padding: '4px 8px' }} onClick={run} disabled={busy}>
      {busy ? '…' : `render ${draft}`}
    </button>
  );
}

/**
 * Botao no card 'Cobertura' para detectar e arquivar duplicates.
 */
export function DuplicatesButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function check() {
    setBusy(true); setResult(null);
    try {
      const res = await fetch('/api/admin/items/find-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoArchiveExcess: false }),
      });
      const j = await res.json();
      if (!res.ok) { alert(j.error); return; }
      setResult(j);
    } finally { setBusy(false); }
  }

  async function archive() {
    if (!result) return;
    if (!confirm(
      `Arquivar ${result.totalExcess} carrosseis duplicados?\n\n` +
      `Por cada grupo (mesmo scheduled_at + categoria), mantem o de menor codigo\n` +
      `e arquiva os restantes (reagenda para 2099-12-31).\n\n` +
      `Imagens ficam intactas em /admin/biblioteca.`
    )) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/items/find-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoArchiveExcess: true, confirm: true }),
      });
      const j = await res.json();
      if (!res.ok) { alert(j.error); return; }
      alert(`Arquivados ${j.archived} duplicates.`);
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn" onClick={check} disabled={busy}>
          {busy ? '…' : result ? 'Verificar de novo' : 'Detectar duplicates'}
        </button>
        {result && result.totalExcess > 0 && (
          <button className="btn primary" onClick={archive} disabled={busy}>
            Arquivar {result.totalExcess} duplicates
          </button>
        )}
      </div>
      {result && (
        <div style={{ marginTop: 10, fontSize: 12 }}>
          {result.totalExcess === 0 ? (
            <span className="muted">Nenhum duplicate detectado.</span>
          ) : (
            <>
              <div className="muted" style={{ marginBottom: 6 }}>
                {result.duplicateGroups} grupos · {result.totalExcess} carrosseis em excesso
              </div>
              {result.groups.slice(0, 5).map((g: any, i: number) => (
                <div key={i} style={{ fontSize: 11, color: 'var(--texto-suave)', marginBottom: 4 }}>
                  {new Date(g.scheduledAt).toISOString().slice(0, 16)} · {g.categoria}: manter <strong>{g.keep.code}</strong>, arquivar {g.archive.map((a: any) => a.code).join(', ')}
                </div>
              ))}
              {result.groups.length > 5 && (
                <div className="muted" style={{ fontSize: 11 }}>… e mais {result.groups.length - 5} grupos</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
