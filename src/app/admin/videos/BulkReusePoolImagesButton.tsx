'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Atribui imagens do pool da Biblioteca aos reels em draft sem imagens —
 * em vez de gerar novas no Replicate. Custo zero, instantâneo.
 */
export function BulkReusePoolImagesButton({ pendingReels }: { pendingReels: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!confirm(
      `Atribuir imagens do pool da Biblioteca a ${pendingReels} reel(s) em draft sem imagens?\n\n` +
      `Não chama Replicate — usa só imagens que já existem. Custo $0, ~5s.\n` +
      `Imagens menos usadas têm prioridade (espalha o reuso).`
    )) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/videos/bulk-assign-pool-images', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const j = await res.json();
      if (!res.ok) { alert(`Falhou: ${j.error}`); return; }
      alert(`✓ ${j.scenesAssigned} cenas em ${j.reelsTouched} reels (pool: ${j.poolSize} imagens únicas).`);
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <button className="btn" onClick={run} disabled={busy} title="Atribui imagens já existentes do pool, sem gerar novas">
      {busy ? '…' : `♻ Reusar pool (${pendingReels} reels)`}
    </button>
  );
}
