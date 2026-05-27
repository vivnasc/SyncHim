'use client';

import { useState } from 'react';
import Link from 'next/link';

interface PromptSlide {
  idx: number;
  imagePrompt: string;
}

interface PromptItem {
  id: string;
  code: string;
  title: string;
  scheduledAt: string | null;
  slides: PromptSlide[];
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button className="btn" onClick={handleCopy} style={{ fontSize: 11, padding: '4px 8px' }}>
      {copied ? 'Copiado!' : label}
    </button>
  );
}

export function PromptsList({ items }: { items: PromptItem[] }) {
  const allPrompts = items
    .flatMap((item) =>
      item.slides.map(
        (s) => `// ${item.code} slide ${s.idx}\n${s.imagePrompt}`,
      ),
    )
    .join('\n\n---\n\n');

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <CopyButton text={allPrompts} label="Copiar todos os prompts" />
        <span className="muted" style={{ marginLeft: 10, fontSize: 12 }}>
          ({items.reduce((acc, i) => acc + i.slides.length, 0)} prompts, separados por ---)
        </span>
      </div>

      {items.map((item) => (
        <section key={item.id} className="card" style={{ marginBottom: 16 }}>
          <div className="row between" style={{ marginBottom: 12 }}>
            <div>
              <code style={{ fontSize: 12, color: 'var(--ouro)' }}>{item.code}</code>
              <span style={{ marginLeft: 8 }}>{item.title}</span>
              {item.scheduledAt && (
                <span className="muted" style={{ marginLeft: 10, fontSize: 12 }}>
                  {new Date(item.scheduledAt).toLocaleString('pt-PT', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>
            <Link href={`/admin/carrosseis/${item.id}`} className="btn" style={{ fontSize: 11 }}>
              Abrir editor
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {item.slides.map((slide) => (
              <div
                key={slide.idx}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  padding: '8px 10px',
                  background: 'var(--bg)',
                  borderRadius: 4,
                  border: '1px solid var(--linha)',
                }}
              >
                <span
                  className="muted"
                  style={{ fontSize: 11, minWidth: 50, paddingTop: 2 }}
                >
                  slide {slide.idx}
                </span>
                <p
                  style={{
                    flex: 1,
                    margin: 0,
                    fontSize: 12,
                    lineHeight: 1.5,
                    fontFamily: 'monospace',
                    wordBreak: 'break-word',
                  }}
                >
                  {slide.imagePrompt}
                </p>
                <CopyButton text={slide.imagePrompt} label="Copiar" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
