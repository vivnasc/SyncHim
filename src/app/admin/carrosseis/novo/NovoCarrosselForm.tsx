'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function NovoCarrosselForm({ categorias }: { categorias: { key: string; label: string }[] }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [categoria, setCategoria] = useState(categorias[0].key);
  const [slideCount, setSlideCount] = useState(8);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/admin/carrosseis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, categoria, slideCount })
      });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || 'falhou'); return; }
      router.push(`/admin/carrosseis/${j.id}`);
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="card" style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label>Título</label>
        <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex: Os 7 nós" />
      </div>
      <div>
        <label>Categoria</label>
        <select className="input" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          {categorias.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </div>
      <div>
        <label>Nº de slides ({slideCount})</label>
        <input type="range" min={3} max={10} value={slideCount} onChange={(e) => setSlideCount(Number(e.target.value))} />
      </div>
      <div className="err" style={{ color: 'var(--bordeaux)' }}>{err}</div>
      <button className="btn primary" disabled={busy} type="submit">{busy ? '…' : 'criar'}</button>
    </form>
  );
}
