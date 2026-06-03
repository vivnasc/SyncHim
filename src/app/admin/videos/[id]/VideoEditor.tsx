'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MusicBlock } from './MusicBlock';

type Item = {
  id: string; code: string | null; title: string; status: string;
  subtype: string | null; caption: string | null; hashtags: string | null;
  target: 'casada' | 'solteira' | 'ambos';
  platforms: string[]; scheduled_at: string | null; output_urls: any; last_job_id: string | null;
  metadata: any;
};

type Scene = { idx: number; layout: string; body: string; design: any; voice_url: string | null; duration_sec: number | null };

type Job = { job_id: string; status: string; progress: number; message: string | null; output: any };

export function VideoEditor({
  initialItem, initialScenes, initialJob
}: { initialItem: Item; initialScenes: any[]; initialJob: Job | null }) {
  const [item, setItem] = useState<Item>(initialItem);
  const [scenes, setScenes] = useState<Scene[]>(() => initialScenes.map(r => ({
    idx: r.idx, layout: r.layout || 'kinetic-line', body: r.body || '',
    design: r.design || {}, voice_url: r.voice_url, duration_sec: r.duration_sec
  })));
  const [active, setActive] = useState(0);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(initialJob);
  const [voicing, setVoicing] = useState<number | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (!dirtyRef.current) return;
    const t = setTimeout(async () => {
      await fetch(`/api/admin/videos/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item, scenes })
      });
      dirtyRef.current = false;
      setSavedAt(new Date().toLocaleTimeString('pt-PT'));
    }, 700);
    return () => clearTimeout(t);
  }, [item, scenes]);

  useEffect(() => {
    if (!job || job.status === 'done' || job.status === 'failed') return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/admin/render-status?jobId=${job.job_id}`);
      if (!res.ok) return;
      const j = await res.json();
      setJob(j);
    }, 4000);
    return () => clearInterval(t);
  }, [job]);

  function patchItem<K extends keyof Item>(k: K, v: Item[K]) { setItem((it) => ({ ...it, [k]: v })); dirtyRef.current = true; }
  function patchScene(i: number, patch: Partial<Scene>) { setScenes((arr) => arr.map((s, j) => j === i ? { ...s, ...patch } : s)); dirtyRef.current = true; }
  function addScene() { setScenes((arr) => [...arr, { idx: arr.length, layout: 'kinetic-line', body: '', design: {}, voice_url: null, duration_sec: null }]); dirtyRef.current = true; }
  function removeScene(i: number) { if (!confirm('Apagar cena?')) return; setScenes((arr) => arr.filter((_, j) => j !== i).map((s, j) => ({ ...s, idx: j }))); dirtyRef.current = true; }

  async function gerarVoz(i: number) {
    setVoicing(i);
    try {
      await fetch(`/api/admin/videos/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item, scenes }) });
      const res = await fetch(`/api/admin/videos/${item.id}/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneIdx: i, text: scenes[i].body })
      });
      const j = await res.json();
      if (!res.ok) { alert(j.error || 'falhou'); return; }
      patchScene(i, { voice_url: j.url, duration_sec: j.durationSec });
    } finally { setVoicing(null); }
  }

  /** Gera vozes para todas as cenas em falta, sequencial. */
  async function gerarTodasVozes() {
    const pending = scenes.filter((s) => !s.voice_url && s.body.trim()).length;
    if (!pending) { alert('Todas as cenas ja teem voz.'); return; }
    if (!confirm(`Gerar voz para ${pending} cena(s) via ElevenLabs?\n~3s cada · ~${(pending * 0.05).toFixed(2)}$ total.`)) return;
    for (let i = 0; i < scenes.length; i++) {
      if (scenes[i].voice_url || !scenes[i].body.trim()) continue;
      setVoicing(i);
      try {
        await fetch(`/api/admin/videos/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item, scenes }) });
        const res = await fetch(`/api/admin/videos/${item.id}/voice`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sceneIdx: i, text: scenes[i].body }),
        });
        const j = await res.json();
        if (!res.ok) { alert(`Cena ${i + 1}: ${j.error}`); break; }
        setScenes((arr) => arr.map((s, k) => k === i ? { ...s, voice_url: j.url, duration_sec: j.durationSec } : s));
      } catch (e: any) { alert(`Cena ${i + 1}: ${e.message}`); break; }
    }
    setVoicing(null);
  }

  async function backfillPrompts() {
    setBackfilling(true);
    try {
      const res = await fetch(`/api/admin/videos/${item.id}/backfill-image-prompts`, { method: 'POST' });
      const j = await res.json();
      if (!res.ok) { alert(j.error || 'falhou'); return; }
      alert(`Prompts gerados: ${j.updated} (skipped ${j.skipped}, forçados ${j.forced ?? 0}). A recarregar.`);
      window.location.reload();
    } finally { setBackfilling(false); }
  }

  async function submitRender() {
    if (!confirm('Submeter render? Vai disparar um workflow GitHub Actions com FFmpeg.')) return;
    await fetch(`/api/admin/videos/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item, scenes }) });
    const res = await fetch(`/api/admin/videos/${item.id}/render`, { method: 'POST' });
    const j = await res.json();
    if (!res.ok) { alert(j.error || 'falhou'); return; }
    setJob({ job_id: j.jobId, status: 'queued', progress: 0, message: null, output: null });
  }

  const current = scenes[active];

  return (
    <>
      <div className="row between">
        <div>
          <div className="mini">{item.code ?? 'sem código'} · vídeo · {item.subtype}</div>
          <input className="input" value={item.title} onChange={(e) => patchItem('title', e.target.value)}
            style={{ background: 'transparent', border: 'none', fontFamily: 'var(--serif)', fontSize: 26, padding: 0, marginTop: 4 }} />
        </div>
        <div className="row">
          <span className={`pill ${item.status}`}>{item.status}</span>
          {savedAt && <span className="muted" style={{ fontSize: 12 }}>guardado às {savedAt}</span>}
          <Link href="/admin/videos" className="btn">voltar</Link>
        </div>
      </div>

      {/* Pipeline rapido: imagens + vozes em lote + render. */}
      <div className="card" style={{ marginTop: 16, padding: 12, borderColor: 'var(--ouro)' }}>
        <div className="mini" style={{ marginBottom: 6 }}>Pipeline rapido</div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {(() => {
            const lastIdx = scenes.length - 1;
            const capaPrompt = !!scenes[0]?.design?.imagePrompt;
            const ctaPrompt = !!scenes[lastIdx]?.design?.imagePrompt;
            const middleCount = scenes.slice(1, lastIdx).filter((s: any) => s.design?.imagePrompt).length;
            const needBackfill = !capaPrompt || !ctaPrompt || middleCount < 2;
            return needBackfill ? (
              <button className="btn" onClick={backfillPrompts} disabled={backfilling}>
                {backfilling ? '…' : `Repreencher prompts (capa${capaPrompt ? '✓' : '✗'} cta${ctaPrompt ? '✓' : '✗'} meio ${middleCount}/2)`}
              </button>
            ) : null;
          })()}
          {(() => {
            const pendingImages = scenes.filter((s: any) => s.design?.imagePrompt && !s.design?.imageUrl).length;
            return pendingImages > 0 ? (
              <button className="btn" onClick={async () => {
                if (!confirm(`Gerar ${pendingImages} imagens em falta via Replicate? (~$${(pendingImages * 0.04).toFixed(2)})`)) return;
                const res = await fetch('/api/admin/generate-images', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ itemId: item.id, reuseStrategy: 'prefer-existing' }),
                });
                const j = await res.json();
                if (!res.ok) { alert(j.error); return; }
                alert(`Geradas ${j.generated}, reusadas ${j.reused}. Recarrega.`);
                window.location.reload();
              }}>
                Gerar {pendingImages} imagens em falta
              </button>
            ) : null;
          })()}
          <button className="btn primary" onClick={gerarTodasVozes} disabled={voicing !== null}>
            {voicing !== null ? `A gerar voz cena ${voicing + 1}…` : `Gerar todas as vozes (${scenes.filter((s) => !s.voice_url && s.body.trim()).length} pendentes)`}
          </button>
          <span className="muted" style={{ fontSize: 12 }}>
            Depois afina a musica em baixo e clica &ldquo;Renderizar video&rdquo;.
          </span>
        </div>
      </div>

      <div className="editor-grid" style={{ marginTop: 20 }}>
        <div className="col">
          <div className="row between" style={{ marginBottom: 6 }}>
            <div className="mini">preview da cena {active + 1} / {scenes.length}</div>
            <div className="row" style={{ gap: 4 }}>
              <button className="btn" style={{ padding: '4px 10px' }}
                onClick={() => setActive(Math.max(0, active - 1))} disabled={active === 0}>←</button>
              <button className="btn" style={{ padding: '4px 10px' }}
                onClick={() => setActive(Math.min(scenes.length - 1, active + 1))} disabled={active >= scenes.length - 1}>→</button>
            </div>
          </div>
          {current && (
            <div className="slide-canvas" style={{
              aspectRatio: '1080 / 1920',
              height: 600,
              width: 'auto',
              background: current.design?.imageUrl
                ? `url(${current.design.imageUrl}) center/cover no-repeat`
                : 'linear-gradient(to bottom, #5A1A2A 0%, var(--bg) 70%)',
              position: 'relative',
            }}>
              {/* darkening overlay para legibilidade quando tem imagem */}
              {current.design?.imageUrl && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to bottom, rgba(26,20,16,0.25) 0%, rgba(26,20,16,0.6) 50%, rgba(26,20,16,0.85) 100%)',
                }} />
              )}
              <div className="layer center" style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 22, lineHeight: 1.35, whiteSpace: 'pre-wrap',
                  textShadow: current.design?.imageUrl ? '0 2px 12px rgba(0,0,0,0.6)' : 'none',
                  padding: '0 30px',
                  textAlign: 'center',
                }}>
                  {current.body}
                </div>
              </div>
              {!current.design?.imageUrl && (
                <div style={{
                  position: 'absolute', bottom: 20, left: 0, right: 0,
                  textAlign: 'center', fontSize: 10, color: 'var(--texto-suave)',
                }}>
                  sem imagem · gradiente bordeaux
                </div>
              )}
            </div>
          )}
        </div>

        <div className="col">
          <div className="mini">cena {active + 1} / {scenes.length}</div>
          {current && (
            <>
              <div>
                <label>Texto da cena (será a linha narrada)</label>
                <textarea value={current.body} onChange={(e) => patchScene(active, { body: e.target.value })} rows={6} />
              </div>
              <div className="row">
                <button className="btn" onClick={() => gerarVoz(active)} disabled={voicing === active || !current.body.trim()}>
                  {voicing === active ? 'a gerar voz…' : (current.voice_url ? '↻ regerar voz' : '🔊 gerar voz')}
                </button>
                {current.voice_url && <audio controls src={current.voice_url} style={{ height: 32 }} />}
                {current.duration_sec && <span className="muted" style={{ fontSize: 12 }}>{current.duration_sec.toFixed(1)}s</span>}
              </div>
              <details>
                <summary className="muted" style={{ cursor: 'pointer', fontSize: 12 }}>opções da cena</summary>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  <div>
                    <label>Layout</label>
                    <select className="input" value={current.layout} onChange={(e) => patchScene(active, { layout: e.target.value })}>
                      <option value="kinetic-line">linha única (kinetic)</option>
                      <option value="kinetic-pair">par título + corpo</option>
                      <option value="capa">capa</option>
                      <option value="cta">cta</option>
                    </select>
                  </div>
                  <div>
                    <label>Duração override (s, vazio = auto pela voz)</label>
                    <input className="input" type="number" step={0.1} value={current.duration_sec ?? ''}
                      onChange={(e) => patchScene(active, { duration_sec: e.target.value ? Number(e.target.value) : null })} />
                  </div>
                </div>
              </details>
            </>
          )}
        </div>

        <div className="col">
          <div className="row between"><div className="mini">cenas</div><button className="btn" onClick={addScene}>+ cena</button></div>
          <div className="slide-list">
            {scenes.map((s, i) => (
              <button key={i} className={active === i ? 'active' : ''} onClick={() => setActive(i)}>
                <span>{String(i + 1).padStart(2, '0')} {s.voice_url ? '🔊' : ''}</span>
                <span className="muted" style={{ fontSize: 10 }}>{(s.body || '').slice(0, 18)}</span>
              </button>
            ))}
          </div>

          <div className="mini" style={{ marginTop: 16 }}>música ambiente (suno)</div>
          <MusicBlock itemId={item.id} musicUrl={item.metadata?.musicUrl ?? null} musicPrompt={item.metadata?.musicPrompt ?? null}
            onGenerated={(url, prompt) => setItem((it) => ({ ...it, metadata: { ...(it.metadata ?? {}), musicUrl: url, musicPrompt: prompt } }))} />

          <div className="mini" style={{ marginTop: 16 }}>render</div>
          <div className="card" style={{ padding: 12 }}>
            {!job && <button className="btn primary" onClick={submitRender}>Renderizar vídeo (FFmpeg)</button>}
            {job && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="row between">
                  <span className={`pill ${job.status}`}>{job.status}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{job.progress}%</span>
                </div>
                {job.message && <p className="muted" style={{ fontSize: 12, margin: 0 }}>{job.message}</p>}
                {job.status === 'done' && job.output?.video && (
                  <>
                    <video controls src={job.output.video} style={{ width: '100%', maxHeight: 280 }} />
                    <a className="btn" href={job.output.video}>↓ mp4</a>
                  </>
                )}
                {(job.status === 'done' || job.status === 'failed') && <button className="btn" onClick={submitRender}>Re-render</button>}
              </div>
            )}
          </div>

          <div className="mini" style={{ marginTop: 16 }}>publicação</div>
          <div className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label>Plataformas</label>
              <div className="row">
                {(['ig', 'tiktok', 'youtube'] as const).map((p) => (
                  <label key={p} className="row" style={{ gap: 4, marginBottom: 0 }}>
                    <input type="checkbox" checked={item.platforms.includes(p)} onChange={(e) => {
                      const next = e.target.checked ? Array.from(new Set([...item.platforms, p])) : item.platforms.filter((x) => x !== p);
                      patchItem('platforms', next);
                    }} /> {p}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label>Agendar</label>
              <input className="input" type="datetime-local" value={item.scheduled_at ? item.scheduled_at.slice(0, 16) : ''}
                onChange={(e) => patchItem('scheduled_at', e.target.value ? new Date(e.target.value).toISOString() : null)} />
            </div>
            <div>
              <label>Caption</label>
              <textarea value={item.caption ?? ''} onChange={(e) => patchItem('caption', e.target.value)} style={{ minHeight: 80, fontFamily: 'var(--sans)', fontSize: 12 }} />
            </div>
            <div>
              <label>Hashtags</label>
              <input className="input" value={item.hashtags ?? ''} onChange={(e) => patchItem('hashtags', e.target.value)} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
