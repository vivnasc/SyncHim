'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Bulk gera imagens em reels (prefer-existing). Resiliente: nao quebra
 * o loop se um item falha — colecta erros e mostra sumario no fim.
 * Re-executar o botao retoma so dos que ainda faltam (a deteccao do
 * page reload re-calcula needImages).
 */
export function BulkGenerateImagesButton({
  items,
  estCost,
}: { items: Array<{ id: string; code: string }>; estCost: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [okCount, setOkCount] = useState(0);
  const [errors, setErrors] = useState<Array<{ code: string; error: string }>>([]);
  const [currentCode, setCurrentCode] = useState<string | null>(null);

  async function run() {
    if (!confirm(
      `Gerar imagens em falta em ${items.length} reel(s)?\n\n` +
      `Custo: ~$${estCost.toFixed(2)} (Replicate Flux Pro com reuso).\n` +
      `~30-60s por reel = total ~${Math.ceil(items.length * 0.75)} min.\n\n` +
      `Browser fica aberto. Se falhar nalgum, continua nos restantes.\n` +
      `Podes carregar de novo no botao para retomar os que faltarem.`
    )) return;

    setBusy(true);
    setDone(0); setOkCount(0); setErrors([]);

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      setCurrentCode(it.code);
      try {
        const res = await fetch('/api/admin/generate-images', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId: it.id, reuseStrategy: 'prefer-existing' }),
        });
        const j = await res.json();
        if (!res.ok) {
          setErrors((arr) => [...arr, { code: it.code, error: j.error || `HTTP ${res.status}` }]);
        } else if ((j.failed ?? 0) > 0 && (j.generated ?? 0) === 0 && (j.reused ?? 0) === 0) {
          setErrors((arr) => [...arr, { code: it.code, error: `0 generated, ${j.failed} failed` }]);
        } else {
          setOkCount((n) => n + 1);
        }
      } catch (e: any) {
        setErrors((arr) => [...arr, { code: it.code, error: e.message }]);
      }
      setDone(i + 1);
    }

    setCurrentCode(null);
    setBusy(false);

    const errCount = errors.length; // stale closure, mas usamos o state actual no JSX
    if (errCount === 0) {
      alert(`✓ ${items.length} reels com imagens. Recarrega para ver.`);
    } else {
      alert(`Terminei: ${items.length - errCount} ok, ${errCount} com erros.\nCarrega de novo para retomar os falhados.`);
    }
    router.refresh();
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
      <button className="btn" onClick={run} disabled={busy}>
        {busy
          ? `${done}/${items.length} · ${currentCode ?? '…'}`
          : `+ imagens (${items.length} reels)`}
      </button>
      {busy && (okCount > 0 || errors.length > 0) && (
        <span className="muted" style={{ fontSize: 10 }}>
          ✓ {okCount} ok{errors.length > 0 ? ` · ✗ ${errors.length} erros` : ''}
        </span>
      )}
      {!busy && errors.length > 0 && (
        <span style={{ color: 'var(--bordeaux)', fontSize: 10 }}>
          ✗ {errors.length} falharam: {errors.slice(0, 3).map(e => e.code).join(', ')}{errors.length > 3 ? '…' : ''}
        </span>
      )}
    </div>
  );
}
