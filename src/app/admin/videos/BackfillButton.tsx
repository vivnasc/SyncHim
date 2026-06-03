'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Faz loop nos videos draft sem imagePrompt e pede a Claude para gerar
 * prompts visuais por cena, mantendo o texto. Util para reels gerados
 * antes do schema com imagem.
 */
export function BackfillImagePromptsButton({ items }: { items: Array<{ id: string; code: string }> }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    if (!confirm(
      `Pedir a Claude para gerar imagePrompts para ${items.length} reel(s)?\n\n` +
      `Custo: ~$${(items.length * 0.01).toFixed(2)} (Claude texto).\n` +
      `Texto das cenas e voz/musica existentes nao sao tocados.\n` +
      `Depois faz "Gerar imagens em falta" em cada reel.`
    )) return;
    setBusy(true); setMsg(null); setDone(0);

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      try {
        const res = await fetch(`/api/admin/videos/${it.id}/backfill-image-prompts`, { method: 'POST' });
        const j = await res.json();
        if (!res.ok) { setMsg(`${it.code}: ${j.error}`); break; }
      } catch (e: any) { setMsg(`${it.code}: ${e.message}`); break; }
      setDone(i + 1);
    }

    setBusy(false);
    if (!msg) {
      alert(`${done + 1} reels com prompts. Recarrega para ver.`);
      router.refresh();
    }
  }

  return (
    <button className="btn" onClick={run} disabled={busy}>
      {busy ? `A pedir prompts ${done}/${items.length}…` : `+ prompts visuais (${items.length} reels)`}
    </button>
  );
}
