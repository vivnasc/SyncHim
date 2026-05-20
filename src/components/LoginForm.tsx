'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

export function LoginForm({ locale }: { locale: 'pt' | 'en' }) {
  const t = useTranslations('login');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale })
      });
      if (!res.ok) throw new Error('failed');
      setSent(true);
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

        {sent ? (
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
