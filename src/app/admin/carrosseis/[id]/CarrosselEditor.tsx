'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { SlidePreview, renderBody } from '../../SlidePreview';
import { ImageDropZone } from '../../ImageDropZone';
import type { Slide, CarouselLayout } from '@/lib/admin/brand';

type Item = {
  id: string;
  code: string | null;
  title: string;
  status: string;
  caption: string | null;
  hashtags: string | null;
  categoria: string | null;
  target: 'casada' | 'solteira' | 'ambos';
  platforms: string[];
  scheduled_at: string | null;
  output_urls: any;
  last_job_id: string | null;
};

type Job = {
  job_id: string;
  status: string;
  progress: number;
  message: string | null;
  output: any;
};

type Sibling = { id: string; code: string } | null;

export function CarrosselEditor({
  initialItem,
  initialSlides,
  initialJob,
  prev,
  next
}: {
  initialItem: Item;
  initialSlides: any[];
  initialJob: Job | null;
  prev?: Sibling;
  next?: Sibling;
}) {
  const [item, setItem] = useState<Item>(initialItem);
  const [slides, setSlides] = useState<Slide[]>(() => initialSlides.map(rowToSlide));
  const [active, setActive] = useState(0);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(initialJob);
  const dirtyRef = useRef(false);

  // Auto-save com debounce.
  useEffect(() => {
    if (!dirtyRef.current) return;
    const t = setTimeout(async () => {
      await fetch(`/api/admin/carrosseis/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item, slides })
      });
      dirtyRef.current = false;
      setSavedAt(new Date().toLocaleTimeString('pt-PT'));
    }, 700);
    return () => clearTimeout(t);
  }, [item, slides]);

  // Polling de job.
  useEffect(() => {
    if (!job || job.status === 'done' || job.status === 'failed') return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/admin/render-status?jobId=${job.job_id}`);
      if (!res.ok) return;
      const j = await res.json();
      setJob(j);
      if (j.status === 'done' && j.output) {
        // Refresca output_urls do item
        setItem((it) => ({ ...it, output_urls: j.output, status: 'rendered' }));
      }
    }, 3000);
    return () => clearInterval(t);
  }, [job]);

  function patchItem<K extends keyof Item>(k: K, v: Item[K]) {
    setItem((it) => ({ ...it, [k]: v }));
    dirtyRef.current = true;
  }

  function patchSlide(idx: number, patch: Partial<Slide>) {
    setSlides((arr) => arr.map((s, i) => i === idx ? { ...s, ...patch } : s));
    dirtyRef.current = true;
  }

  function addSlide() {
    setSlides((arr) => [...arr, {
      idx: arr.length,
      layout: 'conteudo',
      body: '',
      design: {}
    }]);
    setActive(slides.length);
    dirtyRef.current = true;
  }

  function removeSlide(idx: number) {
    if (!confirm('Apagar este slide?')) return;
    setSlides((arr) => arr.filter((_, i) => i !== idx).map((s, i) => ({ ...s, idx: i })));
    setActive((a) => Math.max(0, Math.min(a, slides.length - 2)));
    dirtyRef.current = true;
  }

  function moveSlide(idx: number, dir: -1 | 1) {
    const to = idx + dir;
    if (to < 0 || to >= slides.length) return;
    const next = slides.slice();
    [next[idx], next[to]] = [next[to], next[idx]];
    setSlides(next.map((s, i) => ({ ...s, idx: i })));
    setActive(to);
    dirtyRef.current = true;
  }

  async function completeImages() {
    const pending = slides.filter((s) => s.design.imagePrompt && !s.design.imageUrl).length;
    if (pending === 0) { alert('Todos os slides com prompt ja tem imagem.'); return; }
    if (!confirm(
      `Gerar imagens em falta para ${pending} slide(s)?\n\n` +
      `Usa Replicate com a estrategia 'prefer-existing' — tenta primeiro pool, gera nova se nao houver match.\n` +
      `~5-15s por imagem. Custo Flux Pro: ~$${(pending * 0.04).toFixed(2)} no pior caso.`
    )) return;
    const res = await fetch('/api/admin/generate-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: item.id, reuseStrategy: 'prefer-existing' }),
    });
    const j = await res.json();
    if (!res.ok) { alert(j.error || 'falhou'); return; }
    alert(`Geradas ${j.generated}, reusadas ${j.reused}, falhadas ${j.failed}. A recarregar…`);
    window.location.reload();
  }

  async function submitRender() {
    if (!confirm('Submeter render? Vai disparar um workflow GitHub Actions.')) return;
    // Garante save antes.
    await fetch(`/api/admin/carrosseis/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item, slides })
    });
    const res = await fetch(`/api/admin/carrosseis/${item.id}/render`, { method: 'POST' });
    const j = await res.json();
    if (!res.ok) { alert(j.error || 'falhou'); return; }
    setJob({ job_id: j.jobId, status: 'queued', progress: 0, message: null, output: null });
  }

  const current = slides[active];

  return (
    <>
      <div className="row between">
        <div>
          <div className="mini">{item.code ?? 'sem código'} · carrossel</div>
          <input
            className="input"
            value={item.title}
            onChange={(e) => patchItem('title', e.target.value)}
            style={{ background: 'transparent', border: 'none', fontFamily: 'var(--serif)', fontSize: 26, padding: 0, marginTop: 4 }}
          />
        </div>
        <div className="row">
          <span className={`pill ${item.status}`}>{item.status}</span>
          {savedAt && <span className="muted" style={{ fontSize: 12 }}>guardado às {savedAt}</span>}
          {prev ? (
            <Link href={`/admin/carrosseis/${prev.id}`} className="btn" title={`Anterior: ${prev.code}`}>
              ← {prev.code}
            </Link>
          ) : (
            <button className="btn" disabled>← anterior</button>
          )}
          <Link href="/admin/carrosseis" className="btn">lista</Link>
          {next ? (
            <Link href={`/admin/carrosseis/${next.id}`} className="btn" title={`Seguinte: ${next.code}`}>
              {next.code} →
            </Link>
          ) : (
            <button className="btn" disabled>seguinte →</button>
          )}
        </div>
      </div>

      <div className="editor-grid" style={{ marginTop: 20 }}>
        {/* Coluna 1: preview */}
        <div className="col">
          <div className="mini">preview</div>
          {current && <SlidePreview slide={current} />}
          <div className="row">
            <button className="btn" onClick={() => moveSlide(active, -1)} disabled={active === 0}>←</button>
            <button className="btn" onClick={() => moveSlide(active, +1)} disabled={active >= slides.length - 1}>→</button>
            <button className="btn danger" onClick={() => removeSlide(active)} disabled={slides.length <= 1}>apagar slide</button>
          </div>
        </div>

        {/* Coluna 2: editor de slide */}
        <div className="col">
          <div className="mini">editar slide {active + 1} / {slides.length}</div>
          {current && (
            <>
              <div>
                <label>Layout</label>
                <select className="input" value={current.layout} onChange={(e) => patchSlide(active, { layout: e.target.value as CarouselLayout })}>
                  <option value="capa">Capa (hook)</option>
                  <option value="conteudo">Conteúdo</option>
                  <option value="cta">CTA</option>
                  <option value="assinatura">Assinatura final</option>
                </select>
              </div>
              <div>
                <label>Prompt visual (copia para MJ)</label>
                <div className="row" style={{ gap: 4 }}>
                  <input
                    className="input"
                    value={current.design.imagePrompt ?? ''}
                    onChange={(e) => patchSlide(active, { design: { ...current.design, imagePrompt: e.target.value || null } })}
                    placeholder="(preenchido pelo Claude ao gerar conteúdo)"
                    style={{ fontFamily: 'var(--sans)', fontSize: 12 }}
                  />
                  {current.design.imagePrompt && (
                    <button className="btn" style={{ fontSize: 11, whiteSpace: 'nowrap' }}
                      onClick={() => { navigator.clipboard.writeText(current.design.imagePrompt!); }}>
                      copiar
                    </button>
                  )}
                </div>
                {!current.design.imageUrl && (
                  <div className="row" style={{ gap: 6, marginTop: 6 }}>
                    <button
                      className="btn"
                      style={{ fontSize: 11 }}
                      onClick={async () => {
                        const prompt = current.design.imagePrompt?.trim();
                        if (!prompt) {
                          alert('Escreve um prompt visual primeiro (campo em cima) ou usa a biblioteca abaixo.');
                          return;
                        }
                        if (!confirm(`Gerar imagem agora via Replicate (~$0.04, ~15s)?\n\nPrompt:\n${prompt.slice(0, 200)}`)) return;
                        await fetch(`/api/admin/carrosseis/${item.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ item, slides }),
                        });
                        const res = await fetch('/api/admin/generate-images', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ itemId: item.id, reuseStrategy: 'always-new' }),
                        });
                        const j = await res.json();
                        if (!res.ok) { alert(j.error || 'falhou'); return; }
                        alert(`OK: ${j.generated} novas, ${j.reused} reusadas. A recarregar…`);
                        window.location.reload();
                      }}
                    >
                      Gerar imagem (Replicate)
                    </button>
                    <span className="muted" style={{ fontSize: 11 }}>
                      {current.design.imagePrompt ? 'Usa o prompt acima.' : 'Escreve prompt acima primeiro.'}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <label>Imagem de fundo (arrasta de MJ ou clica)</label>
                <ImageDropZone
                  itemId={item.id}
                  slideIdx={active}
                  currentUrl={current.design.imageUrl ?? null}
                  onUploaded={(url) => patchSlide(active, { design: { ...current.design, imageUrl: url } })}
                />
                {current.design.imageUrl && (
                  <button className="btn" style={{ marginTop: 6, fontSize: 11 }}
                    onClick={() => patchSlide(active, { design: { ...current.design, imageUrl: null } })}>
                    remover imagem
                  </button>
                )}
              </div>
              <div>
                <label>Texto (markdown leve: **bold**, _italic_, linha em branco = parágrafo)</label>
                <textarea
                  value={current.body}
                  onChange={(e) => patchSlide(active, { body: e.target.value })}
                  rows={10}
                />
              </div>
              <details>
                <summary className="muted" style={{ cursor: 'pointer', fontSize: 12 }}>opções avançadas</summary>
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <label>Mostrar número (ghost)</label>
                    <input
                      type="number"
                      className="input"
                      value={current.design.numero ?? ''}
                      onChange={(e) => patchSlide(active, { design: { ...current.design, numero: e.target.value === '' ? null : Number(e.target.value) } })}
                      placeholder="(automático)"
                    />
                  </div>
                  <div>
                    <label>Ornamento</label>
                    <select
                      className="input"
                      value={current.design.ornamento ?? ''}
                      onChange={(e) => patchSlide(active, { design: { ...current.design, ornamento: (e.target.value || null) as any } })}
                    >
                      <option value="">(nenhum)</option>
                      <option value="estrela">Estrela persa ✦</option>
                      <option value="rosaceo">Rosáceo</option>
                      <option value="vesica">Vesica piscis</option>
                    </select>
                  </div>
                </div>
              </details>
            </>
          )}
        </div>

        {/* Coluna 3: lista de slides + metadados + render */}
        <div className="col">
          <div className="row between">
            <div className="mini">slides</div>
            <button className="btn" onClick={addSlide}>+ slide</button>
          </div>
          <div className="slide-list">
            {slides.map((s, i) => (
              <button
                key={i}
                className={active === i ? 'active' : ''}
                onClick={() => setActive(i)}
              >
                <span>{String(i + 1).padStart(2, '0')} · {s.layout}</span>
                <span className="muted" style={{ fontSize: 10 }}>{(s.body || '').slice(0, 18)}</span>
              </button>
            ))}
          </div>

          <div className="mini" style={{ marginTop: 16 }}>publicação</div>
          <div className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label>Plataformas</label>
              <div className="row">
                {(['ig', 'tiktok', 'youtube'] as const).map((p) => (
                  <label key={p} className="row" style={{ gap: 4, marginBottom: 0 }}>
                    <input
                      type="checkbox"
                      checked={item.platforms.includes(p)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? Array.from(new Set([...item.platforms, p]))
                          : item.platforms.filter((x) => x !== p);
                        patchItem('platforms', next);
                      }}
                    /> {p}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label>Agendar para</label>
              <input
                className="input"
                type="datetime-local"
                value={item.scheduled_at ? item.scheduled_at.slice(0, 16) : ''}
                onChange={(e) => patchItem('scheduled_at', e.target.value ? new Date(e.target.value).toISOString() : null)}
              />
            </div>
            <div>
              <label>Caption</label>
              <textarea
                value={item.caption ?? ''}
                onChange={(e) => patchItem('caption', e.target.value)}
                style={{ minHeight: 80, fontFamily: 'var(--sans)', fontSize: 12 }}
              />
            </div>
            <div>
              <label>Hashtags</label>
              <input
                className="input"
                value={item.hashtags ?? ''}
                onChange={(e) => patchItem('hashtags', e.target.value)}
                placeholder="#synchim #synchimapp ..."
              />
            </div>
          </div>

          {(() => {
            const pendingImages = slides.filter((s) => s.design.imagePrompt && !s.design.imageUrl).length;
            return pendingImages > 0 ? (
              <>
                <div className="mini" style={{ marginTop: 16 }}>imagens em falta</div>
                <div className="card" style={{ padding: 12, borderColor: 'var(--ouro)' }}>
                  <p style={{ fontSize: 12, margin: '0 0 8px' }} className="muted">
                    {pendingImages} slide{pendingImages > 1 ? 's' : ''} com prompt mas sem imagem.
                  </p>
                  <button className="btn primary" onClick={completeImages}>
                    Gerar imagens em falta ({pendingImages})
                  </button>
                </div>
              </>
            ) : null;
          })()}

          <div className="mini" style={{ marginTop: 16 }}>render</div>
          <div className="card" style={{ padding: 12 }}>
            {!job && <button className="btn primary" onClick={submitRender}>Gerar PNGs (Puppeteer)</button>}
            {job && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="row between">
                  <span className={`pill ${job.status}`}>{job.status}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{job.progress}%</span>
                </div>
                {job.message && <p className="muted" style={{ fontSize: 12, margin: 0 }}>{job.message}</p>}
                {job.status === 'done' && job.output?.pngs && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {job.output.pngs.map((u: string, i: number) => (
                      <a key={u} href={u} target="_blank" rel="noreferrer" className="muted" style={{ fontSize: 11 }}>↗ slide {i + 1}</a>
                    ))}
                    {job.output.zip && <a className="btn" href={job.output.zip}>↓ ZIP de todos os PNGs</a>}
                  </div>
                )}
                {(job.status === 'done' || job.status === 'failed' || job.status === 'queued' || job.status === 'running') && (
                  <button className="btn" onClick={submitRender}>
                    {job.status === 'done' ? 'Re-render' :
                     job.status === 'failed' ? 'Re-render (tentar de novo)' :
                     'Disparar novo render (job anterior preso)'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function rowToSlide(r: any): Slide {
  return {
    idx: r.idx,
    layout: r.layout,
    body: r.body || '',
    design: r.design || {}
  };
}
