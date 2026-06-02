'use client';

import { useMemo, useState } from 'react';

type Item = {
  id: string;
  code: string | null;
  title: string;
  type: 'carousel' | 'video';
  target: 'casada' | 'solteira' | 'ambos';
  status: string;
  scheduled_at: string | null;
  platforms: string[];
  output_urls: any;
  caption: string | null;
  hashtags: string | null;
};

type Platform = 'ig' | 'tiktok' | 'youtube';

export function MetricoolExporter({ items }: { items: Item[] }) {
  const [targetFilter, setTargetFilter] = useState<'all' | 'casada' | 'solteira' | 'ambos'>('all');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [converting, setConverting] = useState(false);
  const [convProgress, setConvProgress] = useState({ done: 0, total: 0 });
  const [convMsg, setConvMsg] = useState<string | null>(null);

  const needsJpegConversion = useMemo(() =>
    items.filter((i) =>
      i.type === 'carousel'
      && !i.output_urls?.jpegs?.length
      && i.output_urls?.pngs?.length
    ), [items]
  );

  async function convertAllToJpeg() {
    if (!needsJpegConversion.length) {
      alert('Todos os carrosseis ja teem versao JPEG.');
      return;
    }
    if (!confirm(
      `Converter PNGs para JPEG em ${needsJpegConversion.length} carrosseis?\n\n` +
      `Necessario para TikTok aceitar (rejeita image/png).\n` +
      `Sharp server-side, ~2-3s por carrossel = ~${Math.ceil(needsJpegConversion.length * 2.5 / 60)} min total.\n` +
      `Browser fica aberto, mas se fechar retomas amanha.`
    )) return;

    setConverting(true);
    setConvProgress({ done: 0, total: needsJpegConversion.length });
    setConvMsg(null);

    for (let i = 0; i < needsJpegConversion.length; i++) {
      setConvProgress({ done: i, total: needsJpegConversion.length });
      const item = needsJpegConversion[i];
      try {
        const res = await fetch('/api/admin/items/convert-to-jpeg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId: item.id }),
        });
        const j = await res.json();
        if (!res.ok) {
          setConvMsg(`${item.code}: ${j.error}`);
          break;
        }
      } catch (e: any) {
        setConvMsg(`${item.code}: ${e.message}`);
        break;
      }
    }

    setConvProgress({ done: needsJpegConversion.length, total: needsJpegConversion.length });
    setConverting(false);
    setConvMsg(`Conversao concluida. Recarrega a pagina para ver actualizacao.`);
  }
  const visible = useMemo(
    () => targetFilter === 'all' ? items : items.filter((i) => i.target === targetFilter),
    [items, targetFilter]
  );
  const [selected, setSelected] = useState<Set<string>>(new Set(items.map((i) => i.id)));
  const [busy, setBusy] = useState(false);

  const stats = useMemo(() => {
    const sel = visible.filter((i) => selected.has(i.id));
    const carouselCount = sel.filter((i) => i.type === 'carousel').length;
    const videoCount    = sel.filter((i) => i.type === 'video').length;
    const totalRows =
      carouselCount /* 1 linha IG */ +
      sel.filter((i) => i.type === 'video').reduce((acc, v) => acc + (v.platforms?.length || 0), 0);
    return { sel, carouselCount, videoCount, totalRows };
  }, [visible, selected]);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }

  function all()  { setSelected(new Set(visible.map((i) => i.id))); }
  function none() { setSelected(new Set()); }

  async function download() {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/metricool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: Array.from(selected),
          platforms: platformFilter === 'all' ? undefined : [platformFilter],
          dateFrom: dateFrom || undefined,
        })
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
            <select className="input" value={targetFilter} onChange={(e) => setTargetFilter(e.target.value as any)} style={{ width: 160 }}>
              <option value="all">todos os públicos</option>
              <option value="casada">só casadas</option>
              <option value="solteira">só solteiras</option>
              <option value="ambos">só &ldquo;ambas&rdquo;</option>
            </select>
            <select className="input" value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value as any)} style={{ width: 140 }} title="Filtra linhas no CSV">
              <option value="all">todas plataformas</option>
              <option value="ig">só Instagram</option>
              <option value="tiktok">só TikTok (PNG→JPEG)</option>
              <option value="youtube">só YouTube</option>
            </select>
            <input
              type="date"
              className="input"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ width: 150 }}
              title="Excluir items antes desta data"
              placeholder="data inicial"
            />
            <button className="btn" onClick={all}>todos</button>
            <button className="btn" onClick={none}>nenhum</button>
            <button className="btn primary" onClick={download} disabled={busy || selected.size === 0}>
              {busy ? '…' : '↓ Descarregar CSV'}
            </button>
          </div>
        </div>
        {needsJpegConversion.length > 0 && (
          <div style={{ marginTop: 12, padding: 10, border: '1px dashed var(--ouro)', borderRadius: 4, fontSize: 12 }}>
            <div className="row between" style={{ marginBottom: 6 }}>
              <span className="muted">
                ⚠️ {needsJpegConversion.length} carrossel(eis) sem JPEG.
                TikTok rejeita PNG — converte primeiro para exportar TikTok.
              </span>
              <button className="btn" onClick={convertAllToJpeg} disabled={converting}>
                {converting
                  ? `A converter ${convProgress.done}/${convProgress.total}…`
                  : `Converter ${needsJpegConversion.length} para JPEG`}
              </button>
            </div>
            {convMsg && <div style={{ color: convMsg.startsWith('Conversao') ? 'var(--texto)' : 'var(--bordeaux)' }}>{convMsg}</div>}
          </div>
        )}
      </div>

      <table className="t">
        <thead>
          <tr>
            <th style={{ width: 30 }}></th>
            <th style={{ width: 90 }}>código</th>
            <th>título</th>
            <th style={{ width: 80 }}>tipo</th>
            <th style={{ width: 90 }}>público</th>
            <th style={{ width: 140 }}>agendado</th>
            <th style={{ width: 140 }}>plataformas</th>
            <th style={{ width: 90 }}>render</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((it) => (
            <tr key={it.id}>
              <td><input type="checkbox" checked={selected.has(it.id)} onChange={() => toggle(it.id)} /></td>
              <td><code style={{ fontSize: 11 }}>{it.code}</code></td>
              <td><a href={`/admin/${it.type === 'video' ? 'videos' : 'carrosseis'}/${it.id}`}>{it.title}</a></td>
              <td className="muted">{it.type}</td>
              <td className="muted">{it.target}</td>
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
