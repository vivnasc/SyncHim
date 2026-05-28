'use client';
import { useState } from 'react';

export function CopyUrlButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback for browsers without clipboard API
      window.prompt('Copia o URL:', url);
    }
  }
  return (
    <button
      type="button"
      className="btn"
      onClick={copy}
      style={{ width: '100%', fontSize: 11, padding: '4px 8px' }}
    >
      {copied ? 'copiado ✓' : 'copiar URL'}
    </button>
  );
}
