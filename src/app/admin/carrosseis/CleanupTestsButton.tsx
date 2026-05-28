'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Arquiva carrosseis em draft criados a partir de SC-061 (acima do seed
 * inicial SC-001..060). Reagenda para 2099-12-31 e marca metadata.archived,
 * removendo-os do calendario activo MAS preservando texto, slides e imagens
 * geradas. As imagens ficam acessiveis em /admin/biblioteca para reuso.
 *
 * Faz dry-run + confirm. Nao apaga ficheiros nem linhas.
 */
export function CleanupTestsButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const dry = await fetch('/api/admin/items/bulk-archive', {
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
      const n = dryJ.wouldArchive ?? 0;
      if (n === 0) {
        alert('Nao ha carrosseis em draft a partir de SC-061 para arquivar.');
        return;
      }
      if (!confirm(
        `Arquivar ${n} carrosseis em draft (SC-061 e acima)?\n\n` +
        `O que isto faz:\n` +
        `  • Reagenda para 31/12/2099 (saem do calendario activo)\n` +
        `  • Marca como archived\n` +
        `  • Texto, slides e imagens geradas ficam INTACTOS\n` +
        `  • Podes ver/reusar as imagens em /admin/biblioteca\n\n` +
        `Reversivel: ajustas o scheduled_at manualmente se mudares de ideia.`
      )) return;

      const act = await fetch('/api/admin/items/bulk-archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'draft',
          codeFrom: 'SC-061',
          confirm: true,
        }),
      });
      const actJ = await act.json();
      if (!act.ok) {
        alert(actJ.error || `arquivar falhou (${act.status})`);
        return;
      }
      alert(`Arquivados ${actJ.archived} carrosseis. As imagens ficam disponiveis em /admin/biblioteca.`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="btn" disabled={busy} onClick={run}>
      {busy ? '…' : 'arquivar testes (SC-061+, preserva imagens)'}
    </button>
  );
}
