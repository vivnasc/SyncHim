'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Bulk: gera imagens em todos os reels da lista que tenham imagePrompt
 * sem imageUrl. Client-side loop, 1 item por chamada (reuso prefer-existing).
 */
export function BulkGenerateImagesButton({
  items,
  estCost,
}: { items: Array<{ id: string; code: string }>; estCost: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    if (!confirm(
      `Gerar imagens em falta em ${items.length} reel(s)?\n\n` +
      `Custo estimado: ~$${estCost.toFixed(2)} (Replicate Flux Pro, com reuso de pool).\n` +
      `~30s por reel. Total ~${Math.ceil(items.length * 0.5)} min.\n` +
      `Browser fica aberto.`
    )) return;
    setBusy(true); setMsg(null); setDone(0);

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      try {
        const res = await fetch('/api/admin/generate-images', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId: it.id, reuseStrategy: 'prefer-existing' }),
        });
        const j = await res.json();
        if (!res.ok) { setMsg(`${it.code}: ${j.error}`); break; }
      } catch (e: any) { setMsg(`${it.code}: ${e.message}`); break; }
      setDone(i + 1);
    }

    setBusy(false);
    if (!msg) {
      alert(`Imagens geradas em ${done + 1} reels. Recarrega.`);
      router.refresh();
    }
  }

  return (
    <button className="btn" onClick={run} disabled={busy}>
      {busy ? `A gerar imagens ${done}/${items.length}…` : `+ imagens (${items.length} reels)`}
    </button>
  );
}
