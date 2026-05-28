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

type CreatedItem = { id: string; code: string; title: string; scheduledAt: string };
type TestResult = {
  ok?: boolean;
  stage?: string;
  model?: string;
  reply?: string;
  latencyMs?: number;
  keyPrefix?: string;
  error?: string;
  type?: string | null;
  status?: number;
};

const SLOT_TIMEOUT_MS = 90_000;

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
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState(0);
  const [items, setItems] = useState<CreatedItem[]>([]);
  const [error, setError] = useState('');
  const [errorSlot, setErrorSlot] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const totalSlots = weeksCount * 14;

  async function testClaude() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetchWithTimeout(
        '/api/admin/test-claude',
        { method: 'GET', cache: 'no-store' },
        25_000,
      );
      const data = (await res.json().catch(() => ({}))) as TestResult;
      setTestResult({ ...data, status: res.status });
    } catch (err: any) {
      setTestResult({
        ok: false,
        stage: 'fetch',
        error: err?.message || 'Falha de rede ao chamar /api/admin/test-claude',
      });
    }
    setTesting(false);
  }

  async function runFrom(startSlot: number) {
    setRunning(true);
    setError('');
    setErrorSlot(null);
    if (startSlot === 0) {
      setItems([]);
      setDone(false);
    }
    setCurrent(startSlot);

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
          return;
        }
        setItems((prev) => [...prev, data.item]);
      } catch (err: any) {
        const msg = err?.name === 'AbortError'
          ? `timeout (>${Math.round(SLOT_TIMEOUT_MS / 1000)}s) — Claude demorou demais`
          : err?.message || 'erro de rede';
        setError(`Slot ${i + 1}/${totalSlots} · ${msg}`);
        setErrorSlot(i);
        setRunning(false);
        return;
      }
    }

    setRunning(false);
    setDone(true);
  }

  async function run(e: React.FormEvent) {
    e.preventDefault();
    await runFrom(0);
  }

  function progressPct() {
    return totalSlots === 0 ? 0 : Math.min(100, (current / totalSlots) * 100);
  }

  return (
    <div style={{ marginTop: 24, maxWidth: 760 }}>
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="mini" style={{ marginBottom: 8 }}>Passo 0 · Diagnóstico</div>
        <p style={{ margin: '0 0 12px', fontSize: 13 }} className="muted">
          Antes de gerar dezenas de carrosseis, confirma que a API Claude está acessível
          a partir do Vercel. Faz uma chamada minima (~2s).
        </p>
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn" onClick={testClaude} disabled={testing || running}>
            {testing ? 'A testar...' : 'Testar Claude API'}
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
          <label>Segunda-feira inicial</label>
          <input
            className="input"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={running}
            style={{ maxWidth: 220 }}
          />
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
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            Cada carrossel demora ~5-15s. {totalSlots} carrosseis ≈ {Math.ceil((totalSlots * 10) / 60)} min total.
          </div>
        </div>

        <div className="row" style={{ gap: 8 }}>
          <button className="btn primary" type="submit" disabled={running}>
            {running ? `A gerar ${current} / ${totalSlots}...` : `Planear ${weeksCount === 1 ? 'semana' : `${weeksCount} semanas`}`}
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
        </div>
      </form>

      {running && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: '100%', height: 8, background: 'var(--linha)', borderRadius: 4, overflow: 'hidden'
            }}>
              <div style={{
                width: `${progressPct()}%`,
                height: '100%',
                background: 'var(--ouro)',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <span className="muted" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
              {current} / {totalSlots}
            </span>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            Não fechar esta janela. Os resultados vão aparecer em baixo à medida que cada slot termina.
          </p>
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
              <Link href="/admin/prompts" className="btn primary">Ver prompts MJ</Link>
              <Link href="/admin/calendario" className="btn">Ver calendário</Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
