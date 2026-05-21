'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function BulkDuplicateButton({ count }: { count: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!confirm(
      `Duplicar ${count} carrosséis casadas → solteiras?\n\n` +
      `O texto vai passar por uma transformação automática conservadora ` +
      `(marido → ele, casamento → relação, etc.). É um ponto de partida — ` +
      `cada item fica em "draft" e precisa de revisão editorial antes de render.`
    )) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/carrosseis/bulk-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromTarget: 'casada', toTarget: 'solteira' })
      });
      const j = await res.json();
      if (!res.ok) { alert(j.error || `falhou (${res.status})`); return; }
      alert(`Criados: ${j.created}. Saltados (já existiam): ${j.skipped}.${j.errors?.length ? `\n\nErros: ${j.errors.join('\n')}` : ''}`);
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <button className="btn" disabled={busy} onClick={run}>
      {busy ? '…' : `duplicar ${count} casadas → solteiras (auto-soften)`}
    </button>
  );
}
