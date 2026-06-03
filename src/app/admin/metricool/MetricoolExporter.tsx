'use client';

import { useMemo, useState } from 'react';

type Item = {
  id: string;
  code: string | null;
  title: string;
  type: 'carousel' | 'video';
  target: string | null;
  status: string;
  scheduled_at: string | null;
  platforms: string[];
  output_urls: any;
  caption: string | null;
  hashtags: string | null;
};

type Platform = 'ig' | 'tiktok' | 'youtube';

/**
 * Exporter Metricool — auto-adaptável.
 *
 * Filtros são detectados a partir do que existe no momento:
 *   - "campanha": prefixo do código (SV-, CR-, MX-…). Só aparece se há ≥2 prefixos
 *   - "tipo": só aparece se há ≥2 tipos (carrossel + reel)
 *   - "público": só aparece se há ≥2 targets distintos
 *   - "plataforma": filtra LINHAS no CSV (não items)
 *
 * Botão "↓ Descarregar CSV" gera com base na selecção visível + filtros activos.
 * Mostra contagem clara: N items → M linhas (1 carrossel = 2 linhas IG+TT, 1 reel
 * = 1 linha por plataforma).
 */
export function MetricoolExporter({ items }: { items: Item[] }) {
  // Auto-detecta dimensões disponíveis na base actual
  const dims = useMemo(() => {
    const prefixes = new Set<string>();
    const types = new Set<string>();
    const targets = new Set<string>();
    items.forEach((i) => {
      const p = i.code?.match(/^([A-Z]+)-/)?.[1];
      if (p) prefixes.add(p);
      if (i.type) types.add(i.type);
      if (i.target) targets.add(i.target);
    });
    return {
      prefixes: Array.from(prefixes).sort(),
      types: Array.from(types).sort(),
      targets: Array.from(targets).sort(),
    };
  }, [items]);

  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [targetFilter, setTargetFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [converting, setConverting] = useState(false);
  const [convProgress, setConvProgress] = useState({ done: 0, total: 0 });
  const [convMsg, setConvMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const visible = useMemo(() => items.filter((i) => {
    if (campaignFilter !== 'all') {
      const p = i.code?.match(/^([A-Z]+)-/)?.[1];
      if (p !== campaignFilter) return false;
    }
    if (typeFilter !== 'all' && i.type !== typeFilter) return false;
    if (targetFilter !== 'all' && i.target !== targetFilter) return false;
    return true;
  }), [items, campaignFilter, typeFilter, targetFilter]);

  const [selected, setSelected] = useState<Set<string>>(new Set(items.map((i) => i.id)));

  // Garante que selecção só conta itens visíveis
  const effectiveSelection = useMemo(() => {
    const visIds = new Set(visible.map((v) => v.id));
    return new Set(Array.from(selected).filter((id) => visIds.has(id)));
  }, [selected, visible]);

  const needsJpegConversion = useMemo(() =>
    visible.filter((i) =>
      i.type === 'carousel'
      && !i.output_urls?.jpegs?.length
      && i.output_urls?.pngs?.length
      && effectiveSelection.has(i.id)
    ), [visible, effectiveSelection]
  );

  const stats = useMemo(() => {
    const sel = visible.filter((i) => effectiveSelection.has(i.id));
    const carouselCount = sel.filter((i) => i.type === 'carousel').length;
    const videoCount = sel.filter((i) => i.type === 'video').length;
    const carouselRows = carouselCount * (platformFilter === 'all' ? 2 : 1); // IG + TikTok
    const videoRows = sel.filter((i) => i.type === 'video')
      .reduce((acc, v) => acc + (platformFilter === 'all' ? (v.platforms?.length || 0) : 1), 0);
    return { sel, carouselCount, videoCount, totalRows: carouselRows + videoRows };
  }, [visible, effectiveSelection, platformFilter]);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }
  function selectAllVisible() { setSelected((s) => new Set([...Array.from(s), ...visible.map((i) => i.id)])); }
  function deselectAllVisible() {
    const visIds = new Set(visible.map((v) => v.id));
    setSelected((s) => new Set(Array.from(s).filter((id) => !visIds.has(id))));
  }

  async function convertAllToJpeg() {
    if (!needsJpegConversion.length) return;
    if (!confirm(
      `Converter PNGs para JPEG em ${needsJpegConversion.length} carrosseis?\n` +
      `Necessário para TikTok aceitar.\n` +
      `~2-3s cada = ~${Math.ceil(needsJpegConversion.length * 2.5 / 60)} min.`
    )) return;
    setConverting(true);
    setConvProgress({ done: 0, total: needsJpegConversion.length });
    setConvMsg(null);
    for (let i = 0; i < needsJpegConversion.length; i++) {
      setConvProgress({ done: i, total: needsJpegConversion.length });
      try {
        const res = await fetch('/api/admin/items/convert-to-jpeg', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId: needsJpegConversion[i].id }),
        });
        const j = await res.json();
        if (!res.ok) { setConvMsg(`${needsJpegConversion[i].code}: ${j.error}`); break; }
      } catch (e: any) { setConvMsg(`${needsJpegConversion[i].code}: ${e.message}`); break; }
    }
    setConvProgress({ done: needsJpegConversion.length, total: needsJpegConversion.length });
    setConverting(false);
    setConvMsg(`Conversão concluída. Recarrega para ver.`);
  }

  async function download() {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/metricool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: Array.from(effectiveSelection),
          platforms: platformFilter === 'all' ? undefined : [platformFilter],
          dateFrom: dateFrom || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error || `falhou (${res.status})`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cd = res.headers.get('content-disposition') || '';
      const m = cd.match(/filename="([^"]+)"/);
      const campaignSlug = campaignFilter === 'all' ? 'tudo' : campaignFilter.toLowerCase();
      const typeSlug = typeFilter === 'all' ? '' : `-${typeFilter}`;
      a.download = m?.[1] || `synchim-${campaignSlug}${typeSlug}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } finally { setBusy(false); }
  }

  // Etiquetas legíveis para os prefixos detectados
  function campaignLabel(prefix: string): string {
    // SV = SyncHim Vídeos · CR = Carrosseis · etc. (livre — UI prática só)
    const known: Record<string, string> = {
      SV: 'SyncHim reels', CR: 'Carrosseis', MX: 'Mix',
    };
    return known[prefix] ?? prefix;
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 16, position: 'sticky', top: 0, zIndex: 5, padding: 14 }}>
        <div className="row between" style={{ marginBottom: 10 }}>
          <div>
            <div className="mini">selecção</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 22, marginTop: 4 }}>
              {effectiveSelection.size} items · {stats.totalRows} linhas CSV
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              {stats.carouselCount > 0 && `${stats.carouselCount} carrosséis`}
              {stats.carouselCount > 0 && stats.videoCount > 0 && ' · '}
              {stats.videoCount > 0 && `${stats.videoCount} reels`}
            </div>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn" onClick={selectAllVisible} style={{ fontSize: 11 }}>todos os visíveis</button>
            <button className="btn" onClick={deselectAllVisible} style={{ fontSize: 11 }}>nenhum</button>
            <button className="btn primary" onClick={download} disabled={busy || effectiveSelection.size === 0}>
              {busy ? '…' : `↓ CSV (${effectiveSelection.size})`}
            </button>
          </div>
        </div>

        {/* Filtros auto-adaptáveis: só mostra os que fazem sentido */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
          {dims.prefixes.length > 1 && (
            <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="muted" style={{ minWidth: 70 }}>campanha:</span>
              <button className={`btn ${campaignFilter === 'all' ? 'primary' : ''}`} style={{ fontSize: 11 }}
                onClick={() => setCampaignFilter('all')}>todas</button>
              {dims.prefixes.map((p) => (
                <button key={p} className={`btn ${campaignFilter === p ? 'primary' : ''}`} style={{ fontSize: 11 }}
                  onClick={() => setCampaignFilter(p)}>{campaignLabel(p)} ({p}-*)</button>
              ))}
            </div>
          )}
          {dims.types.length > 1 && (
            <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="muted" style={{ minWidth: 70 }}>tipo:</span>
              <button className={`btn ${typeFilter === 'all' ? 'primary' : ''}`} style={{ fontSize: 11 }}
                onClick={() => setTypeFilter('all')}>todos</button>
              {dims.types.map((t) => (
                <button key={t} className={`btn ${typeFilter === t ? 'primary' : ''}`} style={{ fontSize: 11 }}
                  onClick={() => setTypeFilter(t)}>{t === 'video' ? 'reels' : 'carrosseis'}</button>
              ))}
            </div>
          )}
          {dims.targets.length > 1 && (
            <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="muted" style={{ minWidth: 70 }}>público:</span>
              <button className={`btn ${targetFilter === 'all' ? 'primary' : ''}`} style={{ fontSize: 11 }}
                onClick={() => setTargetFilter('all')}>todos</button>
              {dims.targets.map((t) => (
                <button key={t} className={`btn ${targetFilter === t ? 'primary' : ''}`} style={{ fontSize: 11 }}
                  onClick={() => setTargetFilter(t)}>{t}</button>
              ))}
            </div>
          )}
          <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="muted" style={{ minWidth: 70 }}>plataforma:</span>
            <button className={`btn ${platformFilter === 'all' ? 'primary' : ''}`} style={{ fontSize: 11 }}
              onClick={() => setPlatformFilter('all')}>todas (1 CSV completo)</button>
            <button className={`btn ${platformFilter === 'ig' ? 'primary' : ''}`} style={{ fontSize: 11 }}
              onClick={() => setPlatformFilter('ig')}>só Instagram</button>
            <button className={`btn ${platformFilter === 'tiktok' ? 'primary' : ''}`} style={{ fontSize: 11 }}
              onClick={() => setPlatformFilter('tiktok')}>só TikTok</button>
            <button className={`btn ${platformFilter === 'youtube' ? 'primary' : ''}`} style={{ fontSize: 11 }}
              onClick={() => setPlatformFilter('youtube')}>só YouTube</button>
          </div>
          <div className="row" style={{ gap: 6, alignItems: 'center' }}>
            <span className="muted" style={{ minWidth: 70 }}>desde:</span>
            <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              style={{ width: 150, fontSize: 11 }} title="Exclui items com data anterior" />
            {dateFrom && <button className="btn" onClick={() => setDateFrom('')} style={{ fontSize: 11 }}>×</button>}
            <span className="muted" style={{ fontSize: 11, marginLeft: 8 }}>(evita reagendar items com data passada)</span>
          </div>
        </div>

        {needsJpegConversion.length > 0 && platformFilter !== 'ig' && (
          <div style={{ marginTop: 10, padding: 8, border: '1px dashed var(--ouro)', borderRadius: 4, fontSize: 11 }}>
            <div className="row between">
              <span className="muted">⚠ {needsJpegConversion.length} carrossel(eis) seleccionados ainda em PNG · TikTok rejeita</span>
              <button className="btn" onClick={convertAllToJpeg} disabled={converting} style={{ fontSize: 11 }}>
                {converting ? `${convProgress.done}/${convProgress.total}…` : `Converter para JPEG`}
              </button>
            </div>
            {convMsg && <div style={{ color: convMsg.startsWith('Conversão') ? 'var(--texto)' : 'var(--bordeaux)', marginTop: 4 }}>{convMsg}</div>}
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
            {dims.targets.length > 1 && <th style={{ width: 90 }}>público</th>}
            <th style={{ width: 140 }}>agendado</th>
            <th style={{ width: 140 }}>plataformas</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((it) => (
            <tr key={it.id}>
              <td><input type="checkbox" checked={effectiveSelection.has(it.id)} onChange={() => toggle(it.id)} /></td>
              <td><code style={{ fontSize: 11 }}>{it.code}</code></td>
              <td><a href={`/admin/${it.type === 'video' ? 'videos' : 'carrosseis'}/${it.id}`}>{it.title}</a></td>
              <td className="muted">{it.type === 'video' ? 'reel' : 'carrossel'}</td>
              {dims.targets.length > 1 && <td className="muted">{it.target ?? '—'}</td>}
              <td className="muted">{it.scheduled_at ? new Date(it.scheduled_at).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' }) : 'hoje 10:00'}</td>
              <td className="muted">{(it.platforms ?? []).join(' · ') || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {visible.length === 0 && <p className="muted" style={{ marginTop: 12 }}>Sem items com este filtro.</p>}
    </>
  );
}
