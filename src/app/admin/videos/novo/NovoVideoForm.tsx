'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function NovoVideoForm({ subtipos }: { subtipos: { key: string; label: string }[] }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [subtype, setSubtype] = useState(subtipos[1].key); // default kinetic-text
  const [target, setTarget] = useState<'casada' | 'solteira' | 'ambos'>('casada');
  const [sceneCount, setSceneCount] = useState(6);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/admin/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, subtype, sceneCount, target })
      });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || 'falhou'); return; }
      router.push(`/admin/videos/${j.id}`);
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="card" style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label>Título</label>
        <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex: O sinal que ninguém percebe" />
      </div>
      <div>
        <label>Subtipo</label>
        <select className="input" value={subtype} onChange={(e) => setSubtype(e.target.value)}>
          {subtipos.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>
      <div>
        <label>Público</label>
        <select className="input" value={target} onChange={(e) => setTarget(e.target.value as any)}>
          <option value="casada">Casadas</option>
          <option value="solteira">Solteiras (relacionamento sério)</option>
          <option value="ambos">Ambas (copy neutro)</option>
        </select>
      </div>
      <div>
        <label>Nº de cenas/linhas ({sceneCount})</label>
        <input type="range" min={3} max={12} value={sceneCount} onChange={(e) => setSceneCount(Number(e.target.value))} />
      </div>
      <div className="err" style={{ color: 'var(--bordeaux)' }}>{err}</div>
      <button className="btn primary" disabled={busy} type="submit">{busy ? '…' : 'criar'}</button>
    </form>
  );
}
