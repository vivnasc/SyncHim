'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

export function LoginForm({ locale }: { locale: 'pt' | 'en' }) {
  const t = useTranslations('login');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [fallbackLink, setFallbackLink] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email) return;
    setSubmitting(true);
    setError(null);
    setFallbackLink(null);
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale })
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        console.error('magic-link failed', res.status, detail);
        throw new Error('failed');
      }
      const data = await res.json() as { ok: boolean; fallbackLink?: string };
      if (data.fallbackLink) {
        setFallbackLink(data.fallbackLink);
      } else {
        setSent(true);
      }
    } catch {
      setError(t('errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center px-6 md:px-10 py-16">
      <div className="max-w-md mx-auto w-full">
        <div className="mini-caps text-goldBright mb-4">{locale === 'pt' ? 'ENTRAR' : 'SIGN IN'}</div>
        <h1 className="font-serif text-4xl md:text-5xl text-bone mb-4 leading-tight">
          {t('title')}
        </h1>
        <p className="font-body italic text-bone/80 mb-10">{t('subtitle')}</p>

        {fallbackLink ? (
          <div className="border-l-2 border-goldBright pl-4 py-1 mb-6">
            <p className="font-body text-bone/90 leading-relaxed mb-3">
              {locale === 'pt'
                ? 'Email ainda não está activo neste ambiente. Usa o link abaixo para entrar directamente desta vez:'
                : 'Email is not active in this environment yet. Use the link below to sign in directly this time:'}
            </p>
            <a
              href={fallbackLink}
              className="font-body text-goldBright break-all underline underline-offset-4 hover:text-bone"
            >
              {fallbackLink}
            </a>
          </div>
        ) : sent ? (
          <p className="font-body text-goldBright border-l-2 border-goldBright pl-4 italic leading-relaxed">
            {t('sent')}
          </p>
        ) : (
          <div>
            <label className="block mb-6">
              <span className="block mini-caps text-ash mb-2">{t('emailLabel')}</span>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@dominio.com"
              />
            </label>
            {error && (
              <p className="text-bordeaux font-body my-4 border-l-2 border-bordeaux pl-4">
                {error}
              </p>
            )}
            <button
              onClick={submit}
              disabled={submitting || !email}
              className="cta-living disabled:opacity-40 disabled:cursor-not-allowed mt-2"
            >
              <span>{t('cta')}</span>
              {!submitting && <span className="arrow" aria-hidden="true">→</span>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
