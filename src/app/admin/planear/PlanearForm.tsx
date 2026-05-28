'use client';

import { useState } from 'react';
import Link from 'next/link';

function nextMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

const WEEK_OPTIONS = [
  { value: 1, label: '1 semana (14 carrosseis)' },
  { value: 2, label: '2 semanas (28 carrosseis)' },
  { value: 4, label: '4 semanas (56 carrosseis)' },
  { value: 5, label: '5 semanas — campanha 30 dias (70 carrosseis)' },
];

const MODEL_OPTIONS = [
  {
    value: 'black-forest-labs/flux-1.1-pro',
    label: 'Flux 1.1 Pro · qualidade editorial (~$0.04/img, ~15s)',
    pricePerImg: 0.04,
  },
  {
    value: 'black-forest-labs/flux-schnell',
    label: 'Flux Schnell · rápido e barato (~$0.003/img, ~4s)',
    pricePerImg: 0.003,
  },
];

// Numero de imagens por semana (110): 7 didactic * 8 + 6 reconhecimento * 8 + 1 cta * 6
const IMAGES_PER_WEEK = 110;
const IMAGES_PER_SLOT_AVG = IMAGES_PER_WEEK / 14; // ~7.86

type CreatedItem = { id: string; code: string; title: string; scheduledAt: string };
type TestResult = {
  ok?: boolean;
  stage?: string;
  model?: string;
  reply?: string;
  url?: string;
  latencyMs?: number;
  keyPrefix?: string;
  error?: string;
  type?: string | null;
  status?: number;
};

const SLOT_TIMEOUT_MS = 90_000;
const IMG_TIMEOUT_MS = 120_000;

async function fetchWithTimeout(url: string, init: RequestInit, ms: number) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function PlanearForm() {
  const [startDate, setStartDate] = useState(nextMonday);
  const [weeksCount, setWeeksCount] = useState(1);
  const [testMode, setTestMode] = useState(true);
  const [testSlots, setTestSlots] = useState(3);
  const [autoImages, setAutoImages] = useState(true);
  const [imageStrategy, setImageStrategy] = useState<'prefer-existing' | 'reuse-only' | 'always-new'>('always-new');
  const [model, setModel] = useState(MODEL_OPTIONS[0].value);
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState(0);
  const [imgCurrent, setImgCurrent] = useState(0);
  const [imgTotal, setImgTotal] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'copy' | 'images' | 'done'>('idle');
  const [items, setItems] = useState<CreatedItem[]>([]);
  const [error, setError] = useState('');
  const [errorSlot, setErrorSlot] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [needsResumeImages, setNeedsResumeImages] = useState(false);
  const [reuseStats, setReuseStats] = useState({ reused: 0, generated: 0 });
  const [testing, setTesting] = useState<'claude' | 'replicate' | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const fullSlots = weeksCount * 14;
  const totalSlots = testMode ? Math.min(testSlots, fullSlots) : fullSlots;
  const estImages = Math.round(totalSlots * IMAGES_PER_SLOT_AVG);
  const modelInfo = MODEL_OPTIONS.find((m) => m.value === model) ?? MODEL_OPTIONS[0];
  const estCost = imageStrategy === 'reuse-only'
    ? '0.00 (só reuso, sem Replicate)'
    : (estImages * modelInfo.pricePerImg).toFixed(2);

  async function testEndpoint(kind: 'claude' | 'replicate') {
    setTesting(kind);
    setTestResult(null);
    try {
      const res = await fetchWithTimeout(
        `/api/admin/test-${kind}`,
        { method: 'GET', cache: 'no-store' },
        kind === 'replicate' ? 60_000 : 25_000,
      );
      const data = (await res.json().catch(() => ({}))) as TestResult;
      setTestResult({ ...data, status: res.status });
    } catch (err: any) {
      setTestResult({
        ok: false,
        stage: 'fetch',
        error: err?.message || `Falha de rede ao chamar /api/admin/test-${kind}`,
      });
    }
    setTesting(null);
  }

  async function runFrom(startSlot: number) {
    setRunning(true);
    setError('');
    setErrorSlot(null);
    setPhase('copy');
    if (startSlot === 0) {
      setItems([]);
      setDone(false);
    }
    setCurrent(startSlot);

    const generated: CreatedItem[] = startSlot === 0 ? [] : items.slice();

    for (let i = startSlot; i < totalSlots; i++) {
      setCurrent(i + 1);
      try {
        const res = await fetchWithTimeout(
          '/api/admin/plan-week',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startDate, slotIndex: i, weeksCount }),
          },
          SLOT_TIMEOUT_MS,
        );

        let data: any = null;
        const ct = res.headers.get('content-type') ?? '';
        if (ct.includes('application/json')) {
          data = await res.json().catch(() => null);
        } else {
          const text = await res.text().catch(() => '');
          data = { error: text.slice(0, 300) || `HTTP ${res.status} (resposta vazia)` };
        }

        if (!res.ok) {
          setError(`Slot ${i + 1}/${totalSlots} · HTTP ${res.status} · ${data?.error || 'erro sem corpo'}`);
          setErrorSlot(i);
          setRunning(false);
          setPhase('idle');
          return;
        }
        generated.push(data.item);
        setItems((prev) => [...prev, data.item]);
      } catch (err: any) {
        const msg = err?.name === 'AbortError'
          ? `timeout (>${Math.round(SLOT_TIMEOUT_MS / 1000)}s) — Claude demorou demais`
          : err?.message || 'erro de rede';
        setError(`Slot ${i + 1}/${totalSlots} · ${msg}`);
        setErrorSlot(i);
        setRunning(false);
        setPhase('idle');
        return;
      }
    }

    if (autoImages && generated.length > 0) {
      setPhase('images');
      setImgTotal(generated.length);
      setImgCurrent(0);
      setReuseStats({ reused: 0, generated: 0 });

      for (let i = 0; i < generated.length; i++) {
        setImgCurrent(i + 1);
        const item = generated[i];
        try {
          const res = await fetchWithTimeout(
            '/api/admin/generate-images',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ itemId: item.id, model, reuseStrategy: imageStrategy }),
            },
            IMG_TIMEOUT_MS,
          );
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            setError(
              `Imagens ${item.code} · HTTP ${res.status} · ${data?.error || 'erro sem corpo'}`,
            );
            setNeedsResumeImages(true);
            setRunning(false);
            setPhase('idle');
            return;
          }
          if (data?.reused > 0 || data?.generated > 0) {
            setReuseStats((prev) => ({
              reused: prev.reused + (data.reused ?? 0),
              generated: prev.generated + (data.generated ?? 0),
            }));
          }
          if (data?.failed > 0) {
            const hint = data?.errors?.some?.((e: any) =>
              (e?.error || '').includes('402') || /credit|billing/i.test(e?.error || ''),
            )
              ? ' [Replicate sem credito · https://replicate.com/account/billing]'
              : '';
            setError(
              `Imagens ${item.code}: ${data.generated} ok, ${data.failed} falhadas.${hint} Detalhe: ${
                JSON.stringify(data.errors?.slice?.(0, 2) ?? data.errors)
              }`,
            );
            setNeedsResumeImages(true);
            setRunning(false);
            setPhase('idle');
            return;
          }
        } catch (err: any) {
          const msg = err?.name === 'AbortError'
            ? `timeout (>${Math.round(IMG_TIMEOUT_MS / 1000)}s) — Replicate demorou demais`
            : err?.message || 'erro de rede';
          setError(`Imagens ${item.code} · ${msg}`);
          setRunning(false);
          setPhase('idle');
          return;
        }
      }
    }

    setRunning(false);
    setDone(true);
    setPhase('done');
  }

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setNeedsResumeImages(false);
    await runFrom(0);
  }

  /**
   * Loop apenas pelas imagens dos itens ja criados (sem regerar texto).
   * generate-images e idempotente: ignora slides que ja tenham imageUrl.
   * Usado depois de erros como 402 quando se recarrega credito Replicate.
   */
  async function resumeImagesOnly() {
    if (!items.length) return;
    setRunning(true);
    setError('');
    setNeedsResumeImages(false);
    setPhase('images');
    setImgTotal(items.length);
    setImgCurrent(0);
    setReuseStats({ reused: 0, generated: 0 });

    for (let i = 0; i < items.length; i++) {
      setImgCurrent(i + 1);
      const item = items[i];
      try {
        const res = await fetchWithTimeout(
          '/api/admin/generate-images',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId: item.id, model, reuseStrategy: imageStrategy }),
          },
          IMG_TIMEOUT_MS,
        );
        const data = await res.json().catch(() => ({}));
        if (data?.reused > 0 || data?.generated > 0) {
          setReuseStats((prev) => ({
            reused: prev.reused + (data.reused ?? 0),
            generated: prev.generated + (data.generated ?? 0),
          }));
        }
        if (!res.ok || data?.failed > 0) {
          const hint = /402|credit|billing/i.test(JSON.stringify(data))
            ? ' [Replicate sem credito · https://replicate.com/account/billing]'
            : '';
          setError(
            `Retomar imagens ${item.code}: ${data?.error || `${data?.generated ?? 0} ok, ${data?.failed ?? '?'} falhadas`}${hint}`,
          );
          setNeedsResumeImages(true);
          setRunning(false);
          setPhase('idle');
          return;
        }
      } catch (err: any) {
        setError(`Retomar imagens ${item.code} · ${err?.message || 'erro de rede'}`);
        setNeedsResumeImages(true);
        setRunning(false);
        setPhase('idle');
        return;
      }
    }

    setRunning(false);
    setDone(true);
    setPhase('done');
  }

  function progressPct() {
    if (phase === 'images') {
      return imgTotal === 0 ? 0 : Math.min(100, (imgCurrent / imgTotal) * 100);
    }
    return totalSlots === 0 ? 0 : Math.min(100, (current / totalSlots) * 100);
  }

  return (
    <div style={{ marginTop: 24, maxWidth: 760 }}>
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="mini" style={{ marginBottom: 8 }}>Passo 0 · Diagnóstico</div>
        <p style={{ margin: '0 0 12px', fontSize: 13 }} className="muted">
          Antes de gerar dezenas de carrosseis, confirma que Claude e Replicate
          estão acessíveis. Cada teste faz uma chamada minima (~2s Claude, ~5s Replicate).
        </p>
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn" onClick={() => testEndpoint('claude')} disabled={!!testing || running}>
            {testing === 'claude' ? 'A testar Claude...' : 'Testar Claude API'}
          </button>
          <button type="button" className="btn" onClick={() => testEndpoint('replicate')} disabled={!!testing || running}>
            {testing === 'replicate' ? 'A testar Replicate...' : 'Testar Replicate'}
          </button>
          <a className="btn" href="/api/admin/auth/debug" target="_blank" rel="noreferrer">
            Ver envs do Vercel
          </a>
        </div>
        {testResult && (
          <pre style={{
            marginTop: 12, padding: 12, background: 'var(--bg)', border: '1px solid var(--linha)',
            borderRadius: 4, fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            color: testResult.ok ? 'var(--texto)' : 'var(--bordeaux)'
          }}>
            {JSON.stringify(testResult, null, 2)}
          </pre>
        )}
      </div>

      <form onSubmit={run}>
        <div style={{ marginBottom: 16 }}>
          <label>Segunda-feira inicial (1.o post: 09:00 dessa segunda)</label>
          <input
            className="input"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={running}
            style={{ maxWidth: 220 }}
          />
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            2 posts/dia: 09:00 (didactico) e 13:00 (reconhecimento, CTA aos domingos).
            Hoje e {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}.
            Escolhe a segunda-feira de arranque. Se nao houver tempo, escolhe a segunda seguinte.
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Duração da campanha</label>
          <select
            className="input"
            value={weeksCount}
            onChange={(e) => setWeeksCount(parseInt(e.target.value, 10))}
            disabled={running}
            style={{ maxWidth: 420 }}
          >
            {WEEK_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 16, padding: 12, border: '1px dashed var(--linha)', borderRadius: 4 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
            <input
              type="checkbox"
              checked={testMode}
              onChange={(e) => setTestMode(e.target.checked)}
              disabled={running}
            />
            <span><strong>Modo teste</strong> · gera apenas os primeiros N carrosseis para validar qualidade antes de produzir tudo.</span>
          </label>
          {testMode && (
            <div className="row" style={{ gap: 8, marginTop: 6 }}>
              <input
                className="input"
                type="number"
                min={1}
                max={fullSlots}
                value={testSlots}
                onChange={(e) => setTestSlots(Math.max(1, parseInt(e.target.value, 10) || 1))}
                disabled={running}
                style={{ maxWidth: 100 }}
              />
              <span className="muted" style={{ fontSize: 12 }}>carrosseis de teste (recomendado: 3)</span>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Estratégia de imagens</label>
          <select
            className="input"
            value={imageStrategy}
            onChange={(e) => setImageStrategy(e.target.value as any)}
            disabled={running}
            style={{ maxWidth: 540 }}
          >
            <option value="always-new">
              Sempre gerar nova via Replicate · constrói pool durante 5 semanas
            </option>
            <option value="prefer-existing">
              Reusar quando há match, gerar quando faltar · depois das 5 semanas
            </option>
            <option value="reuse-only">
              Só reusar da biblioteca · sem Replicate · slides sem match ficam texto-puro
            </option>
          </select>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            As imagens dos testes ficam no pool e juntam-se às das 5 semanas. A partir da semana 6 muda para &ldquo;Reusar quando há match&rdquo;.
          </div>
        </div>

        {imageStrategy !== 'reuse-only' && (
          <div style={{ marginBottom: 16 }}>
            <label>Modelo (quando geras nova via Replicate)</label>
            <select
              className="input"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={running}
              style={{ maxWidth: 480 }}
            >
              {MODEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoImages}
              onChange={(e) => setAutoImages(e.target.checked)}
              disabled={running}
            />
            <span>Processar imagens automaticamente no fim do planeamento</span>
          </label>
        </div>

        <div className="card" style={{ marginBottom: 16, padding: 12, background: 'var(--bg)' }}>
          <div className="mini" style={{ marginBottom: 4 }}>Estimativa</div>
          <div style={{ fontSize: 13, lineHeight: 1.7 }}>
            <strong>{totalSlots}</strong> carrosseis ·{' '}
            <strong>~{estImages}</strong> imagens ·{' '}
            <strong>~${estCost}</strong> de Replicate ·{' '}
            ~{Math.ceil((totalSlots * (autoImages ? (modelInfo.value.includes('schnell') ? 30 : 60) : 10)) / 60)} min
          </div>
        </div>

        <div className="row" style={{ gap: 8 }}>
          <button className="btn primary" type="submit" disabled={running}>
            {running
              ? phase === 'images'
                ? `Imagens ${imgCurrent} / ${imgTotal}...`
                : `Texto ${current} / ${totalSlots}...`
              : testMode
                ? `Teste · ${totalSlots} carrosseis`
                : `Planear ${weeksCount === 1 ? 'semana' : `${weeksCount} semanas`}`}
          </button>
          {errorSlot !== null && !running && (
            <button
              type="button"
              className="btn"
              onClick={() => runFrom(errorSlot)}
            >
              Retomar a partir do slot {errorSlot + 1}
            </button>
          )}
          {needsResumeImages && !running && items.length > 0 && (
            <button
              type="button"
              className="btn"
              onClick={resumeImagesOnly}
              title="Sem regerar texto. So gera as imagens que ainda faltam nos carrosseis listados em baixo."
            >
              Retomar só imagens ({items.length} carrosseis)
            </button>
          )}
        </div>
      </form>

      {running && (
        <div style={{ marginTop: 20 }}>
          <div className="mini" style={{ marginBottom: 6 }}>
            Fase: {phase === 'copy' ? 'A gerar texto (Claude)' : 'A gerar imagens (Replicate)'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: '100%', height: 8, background: 'var(--linha)', borderRadius: 4, overflow: 'hidden'
            }}>
              <div style={{
                width: `${progressPct()}%`,
                height: '100%',
                background: phase === 'images' ? 'var(--ouro-folha)' : 'var(--ouro)',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <span className="muted" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
              {phase === 'images' ? `${imgCurrent} / ${imgTotal}` : `${current} / ${totalSlots}`}
            </span>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            Não fechar esta janela. Os resultados aparecem em baixo à medida que cada carrossel termina.
          </p>
          {phase === 'images' && (reuseStats.reused > 0 || reuseStats.generated > 0) && (
            <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              Reusadas da biblioteca: <strong>{reuseStats.reused}</strong> · Geradas novas (Replicate): <strong>{reuseStats.generated}</strong>
            </p>
          )}
        </div>
      )}

      {error && (
        <div style={{
          marginTop: 16, padding: 12, border: '1px solid var(--bordeaux)',
          color: 'var(--bordeaux)', fontSize: 13, borderRadius: 4,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {error}
        </div>
      )}

      {items.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="mini" style={{ marginBottom: 8 }}>
            {done ? `Criados ${items.length} carrosseis` : `${items.length} criados...`}
            {(reuseStats.reused > 0 || reuseStats.generated > 0) && (
              <span style={{ marginLeft: 8 }}>
                · imagens: {reuseStats.reused} reusadas, {reuseStats.generated} geradas
              </span>
            )}
          </div>
          <table className="t">
            <thead>
              <tr><th>Código</th><th>Título</th><th>Agendado</th></tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  <td><code style={{ fontSize: 11 }}>{it.code}</code></td>
                  <td><Link href={`/admin/carrosseis/${it.id}`}>{it.title}</Link></td>
                  <td className="muted">
                    {new Date(it.scheduledAt).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {done && (
            <div className="row" style={{ marginTop: 12, gap: 8 }}>
              <Link href="/admin/calendario" className="btn primary">Ver calendário</Link>
              <Link href="/admin/carrosseis" className="btn">Ver carrosseis</Link>
              {!autoImages && (
                <Link href="/admin/prompts" className="btn">Ver prompts MJ (modo manual)</Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
