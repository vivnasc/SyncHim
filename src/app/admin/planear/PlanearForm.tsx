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

const TOTAL_SLOTS = 14;

type CreatedItem = { id: string; code: string; title: string; scheduledAt: string };

export function PlanearForm() {
  const [startDate, setStartDate] = useState(nextMonday);
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState(0);
  const [items, setItems] = useState<CreatedItem[]>([]);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setRunning(true);
    setError('');
    setItems([]);
    setCurrent(0);
    setDone(false);

    for (let i = 0; i < TOTAL_SLOTS; i++) {
      setCurrent(i + 1);
      try {
        const res = await fetch('/api/admin/plan-week', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate, slotIndex: i }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(`Slot ${i + 1}: ${data.error || `HTTP ${res.status}`}`);
          break;
        }
        setItems((prev) => [...prev, data.item]);
      } catch (err: any) {
        setError(`Slot ${i + 1}: ${err.message || 'erro de rede'}`);
        break;
      }
    }

    setRunning(false);
    setDone(true);
  }

  return (
    <div style={{ marginTop: 24, maxWidth: 700 }}>
      <form onSubmit={run}>
        <div style={{ marginBottom: 16 }}>
          <label>Segunda-feira da semana</label>
          <input
            className="input"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={running}
            style={{ maxWidth: 200 }}
          />
        </div>
        <button className="btn primary" type="submit" disabled={running}>
          {running ? `A gerar ${current} / ${TOTAL_SLOTS}...` : 'Planear semana'}
        </button>
      </form>

      {running && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: '100%', height: 8, background: 'var(--linha)', borderRadius: 4, overflow: 'hidden'
            }}>
              <div style={{
                width: `${(current / TOTAL_SLOTS) * 100}%`,
                height: '100%',
                background: 'var(--ouro)',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <span className="muted" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{current} / {TOTAL_SLOTS}</span>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            Cada carrossel demora ~5s. Total ~1 min. Podes ver os resultados a aparecer em baixo.
          </p>
        </div>
      )}

      {error && (
        <div style={{
          marginTop: 16, padding: 12, border: '1px solid var(--bordeaux)',
          color: 'var(--bordeaux)', fontSize: 13, borderRadius: 4
        }}>
          {error}
        </div>
      )}

      {items.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="mini" style={{ marginBottom: 8 }}>
            {done ? `Criados ${items.length} carrosséis` : `${items.length} criados...`}
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
                  <td className="muted">{new Date(it.scheduledAt).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })}</td>
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
