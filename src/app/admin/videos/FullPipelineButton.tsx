'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Dispara workflow GH Actions que processa TODOS os reels em draft
 * existentes no momento do click (backfill prompts + generate-images +
 * voices + tema musica + render). Browser pode fechar.
 *
 * Numero de reels e determinado no servidor ao clicar — sem hardcode
 * de contagem. Hoje 1, amanha 30, importa-se.
 */
export function FullPipelineButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true); setMsg(null);
    try {
      // Pre-check para mostrar quantos vai realmente processar
      const preCheck = await fetch('/api/admin/videos/bulk-pipeline/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft', dryRun: true }),
      });
      const pre = await preCheck.json();
      if (!preCheck.ok) { setMsg(`Erro: ${pre.error}`); return; }
      const n = pre.totalReels ?? 0;
      if (n === 0) { setMsg('Sem reels em draft.'); return; }

      if (!confirm(
        `🚀 Processar ${n} reels em draft end-to-end?\n\n` +
        `Por reel: backfill prompts + Replicate imagens + ElevenLabs vozes + aplica tema musica + render dispatch.\n` +
        `Browser pode fechar. Status em /admin/campaign-jobs.\n\n` +
        `⚠️ Requer musica tema configurada.\n` +
        `Tempo estimado: ~${Math.ceil(n * 1.5)} min · Custo: ~$${(n * 0.6).toFixed(2)}`
      )) return;

      const res = await fetch('/api/admin/videos/bulk-pipeline/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      });
      const j = await res.json();
      if (!res.ok) { setMsg(`Erro: ${j.error}`); return; }
      router.push(`/admin/campaign-jobs/${j.jobId}`);
    } finally { setBusy(false); }
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
      <button className="btn primary" onClick={run} disabled={busy}>
        {busy ? '…' : '🚀 Processar drafts end-to-end (background)'}
      </button>
      {msg && <span style={{ color: 'var(--bordeaux)', fontSize: 11 }}>{msg}</span>}
    </div>
  );
}
