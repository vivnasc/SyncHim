'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Bulk pipeline completo para reels: vozes + tema musica + render via
 * loop client-side ao /api/admin/videos/{id}/process-all.
 *
 * Idempotente: cenas com voz pulam, items com musica pulam, render
 * dispara mesmo que tenha sido tentado antes.
 */
export function BulkProcessAllButton({ items }: { items: Array<{ id: string; code: string }> }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    if (!confirm(
      `Processar ${items.length} reel(s) end-to-end?\n\n` +
      `Cada reel: vozes ElevenLabs (~25s, ~$0.40) + aplica tema musical + dispatch render GH Actions.\n` +
      `Total estimado: ~$${(items.length * 0.4).toFixed(2)} ElevenLabs + tempo GH Actions paralelo (~5 min).\n\n` +
      `⚠️ Requer musica tema configurada (define no editor de 1 reel primeiro).`
    )) return;

    setBusy(true); setMsg(null); setDone(0);

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      try {
        const res = await fetch(`/api/admin/videos/${it.id}/process-all`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const j = await res.json();
        if (!res.ok) {
          setMsg(`${it.code}: ${j.error} (step: ${j.step ?? '?'})`);
          break;
        }
      } catch (e: any) { setMsg(`${it.code}: ${e.message}`); break; }
      setDone(i + 1);
    }

    setBusy(false);
    if (!msg) {
      alert(`${done + 1} reels disparados para render. Acompanha em /admin/render-jobs.`);
      router.push('/admin/render-jobs');
    }
  }

  return (
    <button className="btn primary" onClick={run} disabled={busy}>
      {busy ? `A processar ${done}/${items.length}…` : `Processar todos (${items.length} reels)`}
    </button>
  );
}
