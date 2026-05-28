'use client';

import { useCallback, useRef, useState } from 'react';

type Props = {
  /** ID do item (para nomear o path no storage). */
  itemId: string;
  /** Índice do slide (para nomear). */
  slideIdx: number;
  /** URL actual da imagem (se já existir). */
  currentUrl: string | null;
  /** Callback quando a imagem é carregada com sucesso. */
  onUploaded: (url: string) => void;
};

export function ImageDropZone({ itemId, slideIdx, currentUrl, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    setErr(null);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `carrosseis/${itemId}/slide-${String(slideIdx + 1).padStart(2, '0')}.${ext}`;
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/admin/upload-image?path=${encodeURIComponent(path)}`, {
        method: 'POST',
        body: fd
      });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || 'falhou'); return; }
      onUploaded(j.url);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setUploading(false);
    }
  }, [itemId, slideIdx, onUploaded]);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) upload(file);
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) upload(file);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${dragging ? 'var(--ouro)' : 'var(--linha)'}`,
        borderRadius: 6,
        padding: currentUrl ? 0 : 16,
        textAlign: 'center',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        aspectRatio: '1080 / 1350',
        background: currentUrl ? 'none' : 'var(--bg)',
        transition: 'border-color 0.15s'
      }}
    >
      <input ref={inputRef} type="file" accept="image/*" onChange={onPick} style={{ display: 'none' }} />
      {currentUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentUrl}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      )}
      {!currentUrl && !uploading && (
        <div style={{ color: 'var(--texto-suave)', fontSize: 12 }}>
          Arrasta imagem MJ aqui
          <br />ou clica para escolher
        </div>
      )}
      {uploading && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(26,20,16,0.8)', color: 'var(--ouro)', fontSize: 13
        }}>
          a carregar…
        </div>
      )}
      {err && (
        <div style={{ color: 'var(--bordeaux)', fontSize: 11, marginTop: 4 }}>{err}</div>
      )}
    </div>
  );
}
