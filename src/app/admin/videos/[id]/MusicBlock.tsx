'use client';
import { useEffect, useState } from 'react';

type Preset = { key: string; label: string; prompt: string };

export function MusicBlock({
  itemId, musicUrl, musicPrompt, onGenerated
}: {
  itemId: string;
  musicUrl: string | null;
  musicPrompt: string | null;
  onGenerated: (url: string, prompt: string) => void;
}) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [prompt, setPrompt] = useState<string>(musicPrompt ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/videos/${itemId}/music`)
      .then((r) => r.json())
      .then((j) => {
        setPresets(j.presets ?? []);
        if (!prompt && j.presets?.[0]) {
          setSelectedPreset(j.presets[0].key);
          setPrompt(j.presets[0].prompt);
        }
      })
      .catch(() => {});
  }, [itemId]); // eslint-disable-line react-hooks/exhaustive-deps

  function pickPreset(key: string) {
    setSelectedPreset(key);
    const p = presets.find((x) => x.key === key);
    if (p) setPrompt(p.prompt);
  }

  async function generate() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/admin/videos/${itemId}/music`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, durationSec: 90 })
      });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || `falhou (${res.status})`); return; }
      onGenerated(j.musicUrl, prompt);
    } finally { setBusy(false); }
  }

  return (
    <div className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {musicUrl && (
        <>
          <audio controls src={musicUrl} style={{ width: '100%', height: 36 }} />
          <p className="muted" style={{ fontSize: 11, fontStyle: 'italic', margin: 0 }}>
            {musicPrompt?.slice(0, 120) ?? ''}
          </p>
        </>
      )}

      <div>
        <label>Preset</label>
        <select className="input" value={selectedPreset} onChange={(e) => pickPreset(e.target.value)}>
          <option value="">(prompt custom)</option>
          {presets.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </div>
      <div>
        <label>Prompt (instrumental, sem voz)</label>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
          style={{ minHeight: 80, fontFamily: 'var(--sans)', fontSize: 12 }} />
      </div>
      {err && <p style={{ color: 'var(--bordeaux)', fontSize: 12, margin: 0 }}>{err}</p>}
      <div className="row">
        <button className="btn primary" onClick={generate} disabled={busy || !prompt.trim()}>
          {busy ? 'a gerar… (1-3 min)' : (musicUrl ? '↻ regenerar música' : '🎵 gerar música')}
        </button>
      </div>
    </div>
  );
}
