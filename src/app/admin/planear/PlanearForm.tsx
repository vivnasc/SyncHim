'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function nextMonday(): string {
  const d = new Date();
  const day = d.getDay(); // 0=dom, 1=seg, ...
  const diff = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function PlanearForm() {
  const [startDate, setStartDate] = useState(nextMonday);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<{
    created: number;
    items: Array<{ id: string; code: string; title: string; scheduledAt: string }>;
  } | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    setProgress('A gerar 14 carrosseis via Claude API. Isto pode demorar 3-5 minutos...');

    try {
      const res = await fetch('/api/admin/plan-week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
      setProgress('');
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar semana');
      setProgress('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 24, maxWidth: 600 }}>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="startDate">Segunda-feira da semana</label>
          <input
            id="startDate"
            type="date"
            className="input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={loading}
            style={{ maxWidth: 220 }}
          />
        </div>

        <button type="submit" className="btn primary" disabled={loading}>
          {loading ? 'A gerar...' : 'Planear semana'}
        </button>
      </form>

      {progress && (
        <div className="card" style={{ marginTop: 20 }}>
          <p>{progress}</p>
          <div
            style={{
              height: 3,
              background: 'var(--linha)',
              borderRadius: 2,
              marginTop: 12,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                background: 'var(--ouro)',
                width: '60%',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="card" style={{ marginTop: 20, borderColor: 'var(--bordeaux)' }}>
          <p style={{ color: 'var(--bordeaux)' }}>{error}</p>
        </div>
      )}

      {result && (
        <div style={{ marginTop: 20 }}>
          <div className="card">
            <p>
              Criados <strong>{result.created}</strong> carrosseis para a semana
              de {startDate}.
            </p>
          </div>

          <table className="t" style={{ marginTop: 16 }}>
            <thead>
              <tr>
                <th style={{ width: 80 }}>codigo</th>
                <th>titulo</th>
                <th style={{ width: 160 }}>agendado</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <code style={{ fontSize: 12 }}>{item.code}</code>
                  </td>
                  <td>{item.title}</td>
                  <td className="muted">
                    {new Date(item.scheduledAt).toLocaleString('pt-PT', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button
              className="btn primary"
              onClick={() => router.push('/admin/prompts')}
            >
              Ver prompts MJ
            </button>
            <button
              className="btn"
              onClick={() => router.push('/admin/calendario')}
            >
              Ver calendario
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
