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
    <div className="max-w-prose mx-auto px-6 md:px-10 py-24">
      <h1 className="font-serif text-4xl mb-3">{t('title')}</h1>
      <p className="font-body text-bone/80 mb-10">{t('subtitle')}</p>
      {sent ? (
        <p className="font-body text-gold">{t('sent')}</p>
      ) : (
        <div>
          <label className="block mb-4">
            <span className="block text-sm text-ash mb-2">{t('emailLabel')}</span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {error && <p className="text-bordeaux mb-3">{error}</p>}
          <button onClick={submit} disabled={submitting || !email} className="btn btn-primary">
            {t('cta')}
          </button>
        </div>
      )}
    </div>
  );
}
