'use client';

import { useState } from 'react';
import { NOS, type No } from '@/lib/diagnostic';

type UserRow = {
  id: string;
  email: string;
  tier: number;
  no_comprado: string | null;
  nos_comprados_adicionais: string[] | null;
  target: string | null;
  sub_perfil: string | null;
  paid_at: string | null;
};

type ProgressoRow = {
  no: string;
  sessao_numero: number;
  iniciada_em: string | null;
  completada_em: string | null;
};

export function TestToolsPanel({ adminEmail }: { adminEmail: string }) {
  const [email, setEmail] = useState(adminEmail);
  const [no, setNo] = useState<No>('fome');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string>('');
  const [user, setUser] = useState<UserRow | null>(null);
  const [progresso, setProgresso] = useState<ProgressoRow[]>([]);

  async function call(action: string, extra?: Record<string, unknown>) {
    setBusy(action);
    setMsg('');
    try {
      const res = await fetch('/api/admin/test-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, email, ...extra })
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(`Erro: ${data?.error ?? res.status}`);
        return;
      }
      if (action === 'find') {
        setUser(data.user ?? null);
        setProgresso(data.progresso ?? []);
        if (!data.user) setMsg('Conta existe em auth.users mas sem fila em synchim.users.');
        else setMsg('OK');
      } else {
        setMsg(`OK: ${action}`);
        await call('find');
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'erro');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="row" style={{ gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <label style={{ flex: '1 1 260px' }}>
          <div className="mini">E-mail da utilizadora</div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alguem@exemplo.com"
            style={{ width: '100%' }}
          />
        </label>
        <label>
          <div className="mini">Nó</div>
          <select value={no} onChange={(e) => setNo(e.target.value as No)}>
            {NOS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn primary"
          disabled={!email || busy !== null}
          onClick={() => call('find')}
        >
          {busy === 'find' ? 'A procurar...' : 'Procurar'}
        </button>
      </div>

      {msg && <p className="muted" style={{ marginTop: 12 }}>{msg}</p>}

      {user && (
        <div style={{ marginTop: 16 }}>
          <h2>Estado actual</h2>
          <table className="t">
            <tbody>
              <tr><th>id</th><td><code style={{ fontSize: 11 }}>{user.id}</code></td></tr>
              <tr><th>tier</th><td>{user.tier}</td></tr>
              <tr><th>nó comprado</th><td>{user.no_comprado ?? '—'}</td></tr>
              <tr><th>nós extra</th><td>{(user.nos_comprados_adicionais ?? []).join(', ') || '—'}</td></tr>
              <tr><th>target</th><td>{user.target ?? '—'}</td></tr>
              <tr><th>sub-perfil</th><td>{user.sub_perfil ?? '—'}</td></tr>
              <tr><th>paid_at</th><td>{user.paid_at ? new Date(user.paid_at).toLocaleString('pt-PT') : '—'}</td></tr>
            </tbody>
          </table>

          <h2>Progresso por nó</h2>
          {progresso.length === 0 ? (
            <p className="muted">Sem sessões iniciadas.</p>
          ) : (
            <table className="t">
              <thead>
                <tr><th>nó</th><th>sessão</th><th>iniciada</th><th>completada</th></tr>
              </thead>
              <tbody>
                {progresso.map((p) => (
                  <tr key={`${p.no}-${p.sessao_numero}`}>
                    <td>{p.no}</td>
                    <td>{p.sessao_numero}</td>
                    <td className="muted">{p.iniciada_em ? new Date(p.iniciada_em).toLocaleString('pt-PT') : '—'}</td>
                    <td className="muted">{p.completada_em ? new Date(p.completada_em).toLocaleString('pt-PT') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <h2>Acções</h2>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn"
          disabled={!email || busy !== null}
          onClick={() => call('grant_no', { no })}
        >
          {busy === 'grant_no' ? '...' : `Dar acesso ao nó ${no} (tier 1)`}
        </button>
        <button
          type="button"
          className="btn"
          disabled={!email || busy !== null}
          onClick={() => call('grant_extra', { no })}
        >
          {busy === 'grant_extra' ? '...' : `Adicionar nó ${no} como extra`}
        </button>
        <button
          type="button"
          className="btn"
          disabled={!email || busy !== null}
          onClick={() => call('grant_biblioteca')}
        >
          {busy === 'grant_biblioteca' ? '...' : 'Dar biblioteca completa (tier 2)'}
        </button>
        <button
          type="button"
          className="btn"
          disabled={!email || busy !== null}
          onClick={() => call('fast_forward', { no })}
        >
          {busy === 'fast_forward' ? '...' : `Fast-forward sessões 1 a 6 do ${no}`}
        </button>
        <button
          type="button"
          className="btn"
          style={{ borderColor: '#8B2235', color: '#8B2235' }}
          disabled={!email || busy !== null}
          onClick={() => {
            if (window.confirm(`Apagar todo o progresso e zerar tier de ${email}?`)) call('reset');
          }}
        >
          {busy === 'reset' ? '...' : 'Reset total'}
        </button>
      </div>

      <p className="muted" style={{ marginTop: 16, fontSize: 13 }}>
        <b>Fast-forward</b> insere sessões 1 a 6 do nó escolhido como completadas há 4 dias.
        Como a função <code>sessao_desbloqueada</code> só pede 3 dias entre sessões consecutivas,
        a sessão 7 fica imediatamente disponível.
      </p>
    </div>
  );
}
