'use client';
import { useEffect, useState } from 'react';

/**
 * Editor inline da menção @ que é anexada a TODAS as captions exportadas
 * para Metricool. Permite ao Vivianne ser tageada nos posts publicados
 * pela conta @synchim sem editar caption a caption.
 */
export function AuthorTagEditor() {
  const [tag, setTag] = useState('');
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings/caption-author-tag')
      .then((r) => r.json())
      .then((j) => {
        const t = j.value?.tag ?? '';
        setTag(t); setSaved(t);
      })
      .catch(() => {});
  }, []);

  async function save() {
    setBusy(true);
    try {
      const value = { tag: tag.trim() || null };
      const res = await fetch('/api/admin/settings/caption-author-tag', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      });
      const j = await res.json();
      if (!res.ok) { alert(j.error || 'falhou'); return; }
      setSaved(tag.trim());
      setEditing(false);
    } finally { setBusy(false); }
  }

  return (
    <div className="card" style={{ padding: 12, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="row between">
        <strong style={{ fontSize: 13 }}>@ Menção automática</strong>
        <span className="muted" style={{ fontSize: 11 }}>anexada ao fim de TODAS as captions exportadas</span>
      </div>
      {editing ? (
        <div className="row" style={{ gap: 6, alignItems: 'center' }}>
          <input
            className="input" value={tag} onChange={(e) => setTag(e.target.value)}
            placeholder="ex: criado por @vivianne.dos.santos"
            style={{ flex: 1, fontSize: 12 }}
          />
          <button className="btn primary" onClick={save} disabled={busy} style={{ fontSize: 11 }}>
            {busy ? '…' : 'guardar'}
          </button>
          <button className="btn" onClick={() => { setTag(saved); setEditing(false); }} style={{ fontSize: 11 }}>cancelar</button>
        </div>
      ) : (
        <div className="row between">
          <span style={{ fontSize: 13, fontFamily: 'var(--serif)' }}>
            {saved ? <>&ldquo;{saved}&rdquo;</> : <span className="muted">sem menção definida — posts saem só com a caption original</span>}
          </span>
          <button className="btn" onClick={() => setEditing(true)} style={{ fontSize: 11 }}>{saved ? 'editar' : '+ adicionar'}</button>
        </div>
      )}
      {saved && (
        <div className="muted" style={{ fontSize: 11 }}>
          Não duplica se já estiver na caption original. Para deixar de usar, edita e guarda vazio.
        </div>
      )}
    </div>
  );
}
