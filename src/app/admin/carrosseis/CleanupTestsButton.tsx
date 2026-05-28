'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Apaga em massa carrosseis em draft criados a partir do codigo SC-061
 * (limite superior do seed inicial, que vai ate SC-060). Tudo acima e
 * gerado pelo planeador automatico — testes ou campanhas que se queira
 * descartar.
 *
 * Faz primeiro um dry-run para mostrar a contagem e pedir confirmacao.
 */
export function CleanupTestsButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const dry = await fetch('/api/admin/items/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'draft',
          codeFrom: 'SC-061',
          dryRun: true,
        }),
      });
      const dryJ = await dry.json();
      if (!dry.ok) {
        alert(dryJ.error || `dry-run falhou (${dry.status})`);
        return;
      }
      const n = dryJ.wouldDelete ?? 0;
      if (n === 0) {
        alert('Nao ha carrosseis em draft a partir de SC-061. Nada para apagar.');
        return;
      }
      if (!confirm(
        `Apagar ${n} carrosseis em draft (SC-061 e acima)?\n\n` +
        `Os SC-001 a SC-060 (seed original) ficam intactos.\n` +
        `Os slides associados sao apagados em cascata.\n\n` +
        `Esta accao e irreversivel.`
      )) return;

      const del = await fetch('/api/admin/items/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'draft',
          codeFrom: 'SC-061',
          confirm: true,
        }),
      });
      const delJ = await del.json();
      if (!del.ok) {
        alert(delJ.error || `delete falhou (${del.status})`);
        return;
      }
      alert(`Apagados ${delJ.deleted} carrosseis.`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="btn danger" disabled={busy} onClick={run}>
      {busy ? '…' : 'limpar testes (SC-061 e acima, em draft)'}
    </button>
  );
}
