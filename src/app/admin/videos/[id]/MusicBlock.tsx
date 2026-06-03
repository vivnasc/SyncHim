'use client';
import { useEffect, useState } from 'react';

type Preset = { key: string; label: string; prompt: string };
type Theme = { musicUrl: string; musicPrompt: string } | null;

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
  const [theme, setTheme] = useState<Theme>(null);
  const [savingTheme, setSavingTheme] = useState(false);

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
    // Le tema da campanha (se ja definido)
    fetch('/api/admin/settings/theme-music')
      .then((r) => r.json())
      .then((j) => { if (j.value?.musicUrl) setTheme(j.value); })
      .catch(() => {});
  }, [itemId]); // eslint-disable-line react-hooks/exhaustive-deps

  function applyTheme() {
    if (!theme) return;
    onGenerated(theme.musicUrl, theme.musicPrompt);
  }

  async function saveAsTheme() {
    if (!musicUrl || !musicPrompt) return;
    if (!confirm('Definir esta música como tema da campanha?\n\nTodos os reels novos poderão reutiliza-la com 1 clique, sem pagar Suno.')) return;
    setSavingTheme(true);
    try {
      const res = await fetch('/api/admin/settings/theme-music', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: { musicUrl, musicPrompt } }),
      });
      const j = await res.json();
      if (!res.ok) { alert(j.error || 'falhou'); return; }
      setTheme({ musicUrl, musicPrompt });
      alert('Música tema definida. Próximos reels podem reutilizar.');
    } finally { setSavingTheme(false); }
  }

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

  async function uploadFile(file: File) {
    setBusy(true); setErr(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/admin/videos/${itemId}/music/upload`, { method: 'POST', body: fd });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || `falhou (${res.status})`); return; }
      onGenerated(j.musicUrl, `upload manual (${j.fileName})`);
    } finally { setBusy(false); }
  }

  return (
    <div className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Tema da campanha — atalho para reutilizar sem chamar Suno */}
      {theme && (!musicUrl || musicUrl !== theme.musicUrl) && (
        <div style={{ padding: 8, border: '1px dashed var(--ouro)', borderRadius: 4, fontSize: 12 }}>
          <div className="row between" style={{ marginBottom: 6 }}>
            <span className="muted">🎵 Música tema configurada</span>
            <button className="btn primary" style={{ fontSize: 11 }} onClick={applyTheme}>
              Reutilizar (sem gerar nova)
            </button>
          </div>
          <audio controls src={theme.musicUrl} style={{ width: '100%', height: 30 }} />
          <div className="muted" style={{ fontSize: 10, marginTop: 4, fontStyle: 'italic' }}>{theme.musicPrompt.slice(0, 100)}</div>
        </div>
      )}
      {musicUrl && (
        <>
          <audio controls src={musicUrl} style={{ width: '100%', height: 36 }} />
          <p className="muted" style={{ fontSize: 11, fontStyle: 'italic', margin: 0 }}>
            {musicPrompt?.slice(0, 120) ?? ''}
          </p>
          {(!theme || theme.musicUrl !== musicUrl) && (
            <button className="btn" style={{ fontSize: 11, alignSelf: 'flex-start' }} onClick={saveAsTheme} disabled={savingTheme}>
              {savingTheme ? 'a guardar…' : '⭐ Definir como tema da campanha'}
            </button>
          )}
          {theme && theme.musicUrl === musicUrl && (
            <span className="muted" style={{ fontSize: 11 }}>✓ Este é o tema actual da campanha</span>
          )}
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

      <div style={{ borderTop: '1px dashed var(--linha)', paddingTop: 10, marginTop: 4 }}>
        <label style={{ fontSize: 11 }}>Ou faz upload de ficheiro próprio (mp3/wav/m4a, &lt;25MB)</label>
        <input
          type="file"
          accept="audio/mpeg,audio/mp3,audio/wav,audio/x-m4a,audio/mp4,audio/aac"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadFile(f);
            e.currentTarget.value = '';
          }}
          style={{ fontSize: 11, marginTop: 4 }}
        />
        <div className="muted" style={{ fontSize: 10, marginTop: 4 }}>
          Substitui a música actual. Saída de emergência se o Suno falhar.
        </div>
      </div>
    </div>
  );
}
