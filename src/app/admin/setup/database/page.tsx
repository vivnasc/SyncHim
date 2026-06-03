'use client';
import { useEffect, useState } from 'react';

type Data = {
  sections: { file: string; bytes: number }[];
  combined: string;
  tableStatus: Record<string, 'present' | 'missing'>;
  sqlEditorUrl: string | null;
};

export default function SetupDatabasePage() {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/admin/setup/database')
      .then((r) => r.json())
      .then((j) => { if (j.error) setErr(j.error); else setD(j); })
      .catch((e) => setErr(e.message));
  }, []);

  async function copyAll() {
    if (!d) return;
    await navigator.clipboard.writeText(d.combined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (err) return <p style={{ color: 'var(--bordeaux)' }}>Erro: {err}</p>;
  if (!d) return <p className="muted">A verificar BD…</p>;

  const missing = Object.entries(d.tableStatus).filter(([, s]) => s === 'missing').map(([t]) => t);
  const present = Object.entries(d.tableStatus).filter(([, s]) => s === 'present').map(([t]) => t);

  return (
    <>
      <h1>Setup da BD</h1>
      <p className="muted">
        Verifica e aplica todas as migrations SQL do projecto. Todos os ficheiros usam <code>IF NOT EXISTS</code> — correr múltiplas vezes não estraga nada.
      </p>

      <div className="card" style={{
        padding: 14, marginTop: 12,
        borderColor: missing.length === 0 ? 'var(--ouro)' : '#C25555',
        background: missing.length === 0 ? 'rgba(180,132,61,0.08)' : 'rgba(194,85,85,0.10)',
      }}>
        <strong style={{ fontSize: 14 }}>
          {missing.length === 0 ? '✓ Todas as tabelas conhecidas existem' : `❌ ${missing.length} tabela(s) em falta`}
        </strong>
        {missing.length > 0 && (
          <div style={{ fontSize: 13, marginTop: 6, color: '#FFE4D6' }}>
            Faltam: <strong>{missing.join(', ')}</strong>
          </div>
        )}
        {present.length > 0 && (
          <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
            Já existem: {present.join(', ')}
          </div>
        )}
      </div>

      {missing.length > 0 && (
        <section style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 16 }}>Como aplicar (≈30 segundos)</h2>
          <ol style={{ fontSize: 13, lineHeight: 1.7 }}>
            <li>Carrega <strong>Copiar SQL</strong> aqui em baixo</li>
            <li>
              {d.sqlEditorUrl
                ? <>Abre o <a href={d.sqlEditorUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--ouro-folha)' }}>SQL Editor do Supabase</a></>
                : <>Abre o SQL Editor no Supabase (não consegui resolver o link, vai a supabase.com/dashboard)</>}
            </li>
            <li>Cola na janela e carrega <strong>Run</strong> (canto superior direito)</li>
            <li>Volta aqui e refresh — vai aparecer "✓ Todas as tabelas existem"</li>
          </ol>

          <div className="row" style={{ gap: 8, marginTop: 14, alignItems: 'center' }}>
            <button className="btn primary" onClick={copyAll}>
              {copied ? '✓ Copiado!' : `📋 Copiar SQL (${(d.combined.length / 1024).toFixed(1)} KB)`}
            </button>
            {d.sqlEditorUrl && (
              <a className="btn" href={d.sqlEditorUrl} target="_blank" rel="noreferrer">
                ↗ Abrir SQL Editor Supabase
              </a>
            )}
          </div>

          <details style={{ marginTop: 14 }}>
            <summary style={{ cursor: 'pointer', fontSize: 12 }} className="muted">Pré-visualizar SQL ({d.sections.length} ficheiros)</summary>
            <pre style={{
              fontSize: 10, padding: 12, marginTop: 8,
              background: '#0F0A07', borderRadius: 4, overflow: 'auto',
              maxHeight: 400, color: '#C9B89A', lineHeight: 1.4,
            }}>
              {d.combined}
            </pre>
          </details>
        </section>
      )}
    </>
  );
}
