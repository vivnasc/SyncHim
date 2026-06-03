'use client';
import { useEffect, useState } from 'react';

type Theme = { musicUrl: string; musicPrompt?: string } | null;

/**
 * Card de gestão da musica tema da campanha — upload directo de MP3
 * que fica disponível para todos os reels reutilizarem (process-all
 * aplica automaticamente quando o reel não tem musica propria).
 */
export function ThemeMusicUploadCard() {
  const [theme, setTheme] = useState<Theme>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings/theme-music')
      .then((r) => r.json())
      .then((j) => { if (j.value?.musicUrl) setTheme(j.value); })
      .catch(() => {});
  }, []);

  async function uploadFile(file: File) {
    setBusy(true); setErr(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/theme-music/upload', { method: 'POST', body: fd });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || `falhou (${res.status})`); return; }
      setTheme({ musicUrl: j.musicUrl, musicPrompt: `upload (${j.fileName})` });
    } finally { setBusy(false); }
  }

  return (
    <div className="card" style={{ padding: 12, marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="row between">
        <strong style={{ fontSize: 13 }}>🎵 Música tema da campanha</strong>
        <span className="muted" style={{ fontSize: 11 }}>aplicada automaticamente a todos os reels sem música própria</span>
      </div>
      {theme?.musicUrl && (
        <audio controls src={theme.musicUrl} style={{ width: '100%', height: 32 }} />
      )}
      <div className="row" style={{ gap: 8, alignItems: 'center' }}>
        <input
          type="file"
          accept="audio/mpeg,audio/mp3,audio/wav,audio/x-m4a,audio/mp4,audio/aac"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadFile(f);
            e.currentTarget.value = '';
          }}
          style={{ fontSize: 11 }}
        />
        {busy && <span className="muted" style={{ fontSize: 11 }}>a carregar…</span>}
      </div>
      {err && <p style={{ color: 'var(--bordeaux)', fontSize: 12, margin: 0 }}>{err}</p>}
      {theme?.musicPrompt && (
        <span className="muted" style={{ fontSize: 10, fontStyle: 'italic' }}>{theme.musicPrompt}</span>
      )}
    </div>
  );
}
