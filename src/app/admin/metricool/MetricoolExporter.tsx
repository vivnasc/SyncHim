'use client';

import { useMemo, useState } from 'react';

type Item = {
  id: string;
  code: string | null;
  title: string;
  type: 'carousel' | 'video';
  status: string;
  scheduled_at: string | null;
  platforms: string[];
  output_urls: any;
  caption: string | null;
  hashtags: string | null;
};

export function MetricoolExporter({ items }: { items: Item[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(items.map((i) => i.id)));
  const [busy, setBusy] = useState(false);

  const stats = useMemo(() => {
    const sel = items.filter((i) => selected.has(i.id));
    const carouselCount = sel.filter((i) => i.type === 'carousel').length;
    const videoCount    = sel.filter((i) => i.type === 'video').length;
    const totalRows =
      carouselCount /* 1 linha IG */ +
      sel.filter((i) => i.type === 'video').reduce((acc, v) => acc + (v.platforms?.length || 0), 0);
    return { sel, carouselCount, videoCount, totalRows };
  }, [items, selected]);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }

  function all() { setSelected(new Set(items.map((i) => i.id))); }
  function none() { setSelected(new Set()); }

  async function download() {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/metricool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: Array.from(selected) })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error || `falhou (${res.status})`);
        return;
      }
      const skippedHeader = res.headers.get('x-skipped');
      if (skippedHeader && skippedHeader !== '[]') {
        console.warn('itens saltados:', JSON.parse(skippedHeader));
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cd = res.headers.get('content-disposition') || '';
      const m = cd.match(/filename="([^"]+)"/);
      a.download = m?.[1] || `synchim-metricool-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } finally { setBusy(false); }
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 16, position: 'sticky', top: 0, zIndex: 5 }}>
        <div className="row between">
          <div>
            <div className="mini">selecção</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 22, marginTop: 4 }}>
              {selected.size} items · {stats.totalRows} linhas CSV
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              {stats.carouselCount} carrosséis (IG CAROUSEL) · {stats.videoCount} vídeos ({stats.videoCount > 0 ? 'IG REEL + TikTok + YT Shorts conforme plataformas' : '—'})
            </div>
          </div>
          <div className="row">
            <button className="btn" onClick={all}>todos</button>
            <button className="btn" onClick={none}>nenhum</button>
            <button className="btn primary" onClick={download} disabled={busy || selected.size === 0}>
              {busy ? '…' : '↓ Descarregar CSV'}
            </button>
          </div>
        </div>
      </div>

      <table className="t">
        <thead>
          <tr>
            <th style={{ width: 30 }}></th>
            <th style={{ width: 90 }}>código</th>
            <th>título</th>
            <th style={{ width: 80 }}>tipo</th>
            <th style={{ width: 140 }}>agendado</th>
            <th style={{ width: 140 }}>plataformas</th>
            <th style={{ width: 90 }}>render</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              <td><input type="checkbox" checked={selected.has(it.id)} onChange={() => toggle(it.id)} /></td>
              <td><code style={{ fontSize: 11 }}>{it.code}</code></td>
              <td><a href={`/admin/${it.type === 'video' ? 'videos' : 'carrosseis'}/${it.id}`}>{it.title}</a></td>
              <td className="muted">{it.type}</td>
              <td className="muted">{it.scheduled_at ? new Date(it.scheduled_at).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' }) : 'hoje 10:00'}</td>
              <td className="muted">{(it.platforms ?? []).join(' · ') || '—'}</td>
              <td>{it.type === 'carousel' ? `${it.output_urls?.pngs?.length ?? 0} pngs` : '1 mp4'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
