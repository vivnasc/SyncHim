'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Dispara render Puppeteer (GitHub Actions) para todos os carrosseis em
 * draft a partir de SC-061 (acima do seed inicial). Cada render demora
 * ~2 min no GH; correm em paralelo (max 20 simultaneos no plano Hobby).
 *
 * Dry-run + confirm dialog. Depois redirecciona para /admin/render-jobs
 * onde se acompanha o progresso.
 */
export function BulkRenderButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function check() {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch('/api/admin/carrosseis/bulk-render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft', codeFrom: 'SC-061', dryRun: true }),
      });
      const j = await res.json();
      if (!res.ok) { setMsg(`Erro: ${j.error || res.status}`); return; }
      setCount(j.wouldDispatch ?? 0);
    } finally { setBusy(false); }
  }

  async function go() {
    if (!confirm(
      `Render Puppeteer de ${count} carrosseis (SC-061+ em draft)?\n\n` +
      `Cada render dispara 1 GitHub Actions run (~2 min cada).\n` +
      `Correm em paralelo. Progresso em /admin/render-jobs.\n\n` +
      `Cada carrossel passa de draft -> rendering -> rendered.`
    )) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch('/api/admin/carrosseis/bulk-render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft', codeFrom: 'SC-061', confirm: true }),
      });
      const j = await res.json();
      if (!res.ok) { setMsg(`Erro: ${j.error || res.status}`); return; }
      setMsg(`Disparados ${j.dispatched} renders${j.failed ? ` (${j.failed} falhas)` : ''}. Redireccionar para render-jobs em 2s...`);
      setTimeout(() => router.push('/admin/render-jobs'), 2000);
    } finally { setBusy(false); }
  }

  return (
    <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      <button className="btn" disabled={busy} onClick={check}>
        {busy ? '…' : count === null ? 'Render bulk (draft)' : 'Recontar'}
      </button>
      {count !== null && count > 0 && (
        <button className="btn primary" disabled={busy} onClick={go}>
          Render {count} carrosseis →
        </button>
      )}
      {count === 0 && <span className="muted" style={{ fontSize: 12 }}>Nada para render.</span>}
      {msg && <span className="muted" style={{ fontSize: 12 }}>{msg}</span>}
    </div>
  );
}
