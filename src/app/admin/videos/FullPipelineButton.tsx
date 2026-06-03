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
      if (!preCheck.ok) {
        if (pre.error?.includes('CAMPAIGN_WORKER_TOKEN')) {
          setMsg(
            'Falta configurar CAMPAIGN_WORKER_TOKEN (auth entre Vercel e GitHub Actions).\n\n' +
            '1. Vercel → Settings → Environment Variables → adicionar\n' +
            '   CAMPAIGN_WORKER_TOKEN = <token gerado>\n\n' +
            '2. GitHub vivnasc/synchim → Settings → Secrets and variables\n' +
            '   → Actions → New secret → CAMPAIGN_WORKER_TOKEN = <mesmo token>\n\n' +
            '3. Re-deploy do Vercel para apanhar a env nova.\n\n' +
            'Diz-me quando tiveres o passo 1 e 2 feitos.'
          );
          return;
        }
        setMsg(`Erro: ${pre.error}`);
        return;
      }
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
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, maxWidth: 420 }}>
      <button className="btn primary" onClick={run} disabled={busy}>
        {busy ? '…' : '🚀 Processar drafts end-to-end (background)'}
      </button>
      {msg && (
        <div style={{
          color: '#FFE4D6',
          background: 'rgba(180, 50, 50, 0.25)',
          border: '1px solid rgba(220, 90, 90, 0.6)',
          padding: '8px 10px',
          borderRadius: 4,
          fontSize: 12,
          lineHeight: 1.4,
          marginTop: 6,
          whiteSpace: 'pre-wrap',
        }}>
          ⚠ {msg}
        </div>
      )}
    </div>
  );
}
