'use client';
import { useEffect, useState } from 'react';

type Check = {
  name: string;
  group: 'core' | 'pagamentos' | 'pipeline' | 'voz' | 'imagens' | 'musica' | 'opcional';
  present: boolean;
  required: boolean;
  hint?: string;
};

type PaypalProbe = {
  mode: 'live' | 'sandbox';
  authOk: boolean;
  authStatus: number | null;
  clientIdsMatch: boolean | null;
  error?: string;
};

type Diag = {
  ok: boolean;
  missingRequired: string[];
  checks: Check[];
  runtime: { hasMusicTheme: boolean; vercelEnv: string; gitSha: string; paypal?: PaypalProbe };
};

const GROUP_LABELS: Record<Check['group'], string> = {
  core: '🔐 Core (app + auth)',
  pagamentos: '💳 Pagamentos (PayPal)',
  pipeline: '🚀 Pipeline bulk (Vercel ↔ GitHub Actions)',
  voz: '🎙 Voz (ElevenLabs)',
  imagens: '🖼 Imagens (Replicate)',
  musica: '🎵 Música (Suno)',
  opcional: '· Opcionais',
};

export default function DiagnosticsPage() {
  const [d, setD] = useState<Diag | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/diagnostics')
      .then((r) => r.json())
      .then((j) => { if (j.error) setErr(j.error); else setD(j); })
      .catch((e) => setErr(e.message));
  }, []);

  if (err) return <p style={{ color: 'var(--bordeaux)' }}>Erro: {err}</p>;
  if (!d) return <p className="muted">A verificar…</p>;

  const groups: Check['group'][] = ['core', 'pagamentos', 'pipeline', 'voz', 'imagens', 'musica', 'opcional'];
  const pp = d.runtime.paypal;

  return (
    <>
      <h1>Diagnóstico</h1>
      <p className="muted">
        Estado de todas as configurações necessárias.
        {d.runtime.gitSha && <> · commit <code>{d.runtime.gitSha}</code></>}
        {d.runtime.vercelEnv && <> · env <code>{d.runtime.vercelEnv}</code></>}
      </p>

      <div className="card" style={{
        padding: 14,
        marginTop: 12,
        borderColor: d.ok ? 'var(--ouro)' : '#C25555',
        background: d.ok ? 'rgba(180, 132, 61, 0.08)' : 'rgba(194, 85, 85, 0.10)',
      }}>
        <strong style={{ fontSize: 14 }}>
          {d.ok ? '✓ Tudo configurado para o pipeline bulk' : `❌ ${d.missingRequired.length} configuração(ões) essencial(is) em falta`}
        </strong>
        {!d.ok && (
          <div style={{ fontSize: 12, marginTop: 6, color: '#FFE4D6' }}>
            Faltam: {d.missingRequired.join(', ')}
          </div>
        )}
        <div style={{ fontSize: 12, marginTop: 8 }} className="muted">
          Música tema da campanha: {d.runtime.hasMusicTheme ? '✓ definida' : '— não definida (carrega MP3 em /admin/videos)'}
        </div>
      </div>

      {pp && (
        <div className="card" style={{
          padding: 14,
          marginTop: 12,
          borderColor: pp.authOk ? 'var(--ouro)' : '#C25555',
          background: pp.authOk ? 'rgba(180, 132, 61, 0.08)' : 'rgba(194, 85, 85, 0.10)',
        }}>
          <strong style={{ fontSize: 14 }}>
            {pp.authOk
              ? `✓ PayPal liga em modo ${pp.mode}`
              : `❌ PayPal NÃO autentica (modo ${pp.mode}) — é isto que faz o checkout falhar`}
          </strong>
          {pp.error && (
            <div style={{ fontSize: 12, marginTop: 6, color: '#FFE4D6' }}>{pp.error}</div>
          )}
          {pp.clientIdsMatch === false && (
            <div style={{ fontSize: 12, marginTop: 6, color: '#FFE4D6' }}>
              ⚠ <code>PAYPAL_CLIENT_ID</code> ≠ <code>NEXT_PUBLIC_PAYPAL_CLIENT_ID</code> — têm de ser o mesmo client id da mesma app.
            </div>
          )}
          <div style={{ fontSize: 12, marginTop: 8 }} className="muted">
            Modo <code>{pp.mode}</code> = {pp.mode === 'live' ? 'cartões reais' : 'contas de teste sandbox'}.
            {' '}As credenciais (CLIENT_ID/SECRET) têm de ser desse mesmo modo.
          </div>
        </div>
      )}

      {groups.map((g) => {
        const items = d.checks.filter((c) => c.group === g);
        if (!items.length) return null;
        return (
          <section key={g} style={{ marginTop: 18 }}>
            <h2 style={{ fontSize: 15 }}>{GROUP_LABELS[g]}</h2>
            <table className="t" style={{ marginTop: 6 }}>
              <thead>
                <tr>
                  <th style={{ width: 32 }}></th>
                  <th>variável</th>
                  <th style={{ width: 110 }}>estado</th>
                  <th>nota</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.name}>
                    <td style={{ fontSize: 16 }}>
                      {c.present ? '✓' : (c.required ? '❌' : '·')}
                    </td>
                    <td><code style={{ fontSize: 12 }}>{c.name}</code></td>
                    <td>
                      {c.present
                        ? <span style={{ color: '#3c8c50', fontWeight: 600, fontSize: 12 }}>configurada</span>
                        : c.required
                          ? <span style={{ color: '#C25555', fontWeight: 700, fontSize: 12 }}>EM FALTA</span>
                          : <span className="muted" style={{ fontSize: 12 }}>opcional</span>}
                    </td>
                    <td className="muted" style={{ fontSize: 11 }}>{c.hint}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 15 }}>⚙ GitHub Actions secrets (runner do render)</h2>
        <p className="muted" style={{ fontSize: 12 }}>
          A página acima só verifica envs do Vercel. Estas estão configuradas no GitHub, não no Vercel, e o diagnóstico não as consegue ler.
          Verifica manualmente em <a href="https://github.com/vivnasc/synchim/settings/secrets/actions" target="_blank" rel="noreferrer" style={{ color: 'var(--ouro-folha)' }}>github.com/vivnasc/synchim/settings/secrets/actions</a> que existem:
        </p>
        <ul style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--texto-suave)' }}>
          <li><code>SUPABASE_URL</code> — mesma URL que <code>NEXT_PUBLIC_SUPABASE_URL</code></li>
          <li><code>SUPABASE_SERVICE_ROLE_KEY</code></li>
          <li><code>CAMPAIGN_WORKER_TOKEN</code> — <strong>tem que ser igual ao do Vercel</strong></li>
          <li><code>ELEVENLABS_API_KEY</code>, <code>ELEVENLABS_VOICE_ID</code></li>
          <li><code>SUNO_API_KEY</code>, <code>SUNO_API_URL</code> (opcionais se usares tema MP3 upload)</li>
        </ul>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 14 }}>Onde configurar (Vercel)</h2>
        <ul style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--texto-suave)' }}>
          <li><a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer" style={{ color: 'var(--ouro-folha)' }}>vercel.com/dashboard</a> → projecto sync-him → Settings → Environment Variables</li>
          <li>Marcar Production + Preview + Development</li>
          <li>Depois de adicionar/mudar envs, <strong>redeploy</strong> para apanhar os novos valores</li>
        </ul>
      </section>
    </>
  );
}
