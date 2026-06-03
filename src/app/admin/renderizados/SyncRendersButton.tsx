'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Sincroniza estado dos render_jobs com result.json em Storage.
 * Resolve "GH Actions terminou mas a UI continua em rendering".
 */
export function SyncRendersButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch('/api/admin/render-status/sync-all', { method: 'POST' });
      const j = await res.json();
      if (!res.ok) { setMsg(`Falhou: ${j.error}`); return; }
      setMsg(`✓ ${j.updated} ok · ${j.failed} failed · ${j.checked} verificados`);
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
      <button className="btn" onClick={run} disabled={busy}>
        {busy ? 'a sincronizar…' : '↻ Sincronizar renders pendentes'}
      </button>
      {msg && <span className="muted" style={{ fontSize: 11 }}>{msg}</span>}
    </div>
  );
}
