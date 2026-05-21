'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase/client';

export function LoginForm({ locale }: { locale: 'pt' | 'en' }) {
  const t = useTranslations('login');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset password sub-flow
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetFallbackLink, setResetFallbackLink] = useState<string | null>(null);

  async function submit() {
    if (!email || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowser();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (signInError) {
        console.error('sign in failed', signInError);
        setError(t('errorWrongPassword'));
        return;
      }
      router.replace(`/${locale}/dashboard`);
      router.refresh();
    } catch (err) {
      console.error('login error', err);
      setError(t('errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  }

  async function requestReset() {
    if (!email) return;
    setSubmitting(true);
    setError(null);
    setResetFallbackLink(null);
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale })
      });
      if (!res.ok) throw new Error('failed');
      const data = await res.json() as { ok: boolean; fallbackLink?: string };
      if (data.fallbackLink) setResetFallbackLink(data.fallbackLink);
      else setResetSent(true);
    } catch {
      setError(t('errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center px-6 md:px-10 py-16">
      <div className="max-w-md mx-auto w-full">
        <div className="mini-caps text-goldBright mb-4">
          {resetMode
            ? (locale === 'pt' ? 'NOVA PASSWORD' : 'NEW PASSWORD')
            : (locale === 'pt' ? 'ENTRAR' : 'SIGN IN')}
        </div>
        <h1 className="font-serif text-4xl md:text-5xl text-bone mb-4 leading-tight">
          {resetMode ? t('resetTitle') : t('title')}
        </h1>
        <p className="font-body italic text-bone/80 mb-10">
          {resetMode ? t('resetSubtitle') : t('subtitle')}
        </p>

        {resetFallbackLink ? (
          <div className="border-l-2 border-goldBright pl-4 py-1 mb-6">
            <p className="font-body text-bone/90 leading-relaxed mb-3">
              {locale === 'pt'
                ? 'Email ainda não está activo neste ambiente. Usa o link abaixo para criar uma nova password:'
                : 'Email is not active in this environment yet. Use the link below to set a new password:'}
            </p>
            <a
              href={resetFallbackLink}
              className="font-body text-goldBright break-all underline underline-offset-4 hover:text-bone"
            >
              {resetFallbackLink}
            </a>
          </div>
        ) : resetSent ? (
          <p className="font-body text-goldBright border-l-2 border-goldBright pl-4 italic leading-relaxed">
            {t('resetSent')}
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
                autoComplete="email"
              />
            </label>

            {!resetMode && (
              <label className="block mb-3">
                <span className="block mini-caps text-ash mb-2">{t('passwordLabel')}</span>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </label>
            )}

            {error && (
              <p className="text-bordeaux font-body my-4 border-l-2 border-bordeaux pl-4">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-4 mt-6">
              <button
                onClick={resetMode ? requestReset : submit}
                disabled={submitting || !email || (!resetMode && !password)}
                className="cta-living disabled:opacity-40 disabled:cursor-not-allowed self-start"
              >
                <span>{resetMode ? t('resetCta') : t('cta')}</span>
                {!submitting && <span className="arrow" aria-hidden="true">→</span>}
              </button>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setResetMode((m) => !m);
                  setPassword('');
                }}
                className="text-ash hover:text-goldBright text-sm tracking-wide self-start transition-colors"
              >
                {resetMode ? t('backToLogin') : t('forgotPassword')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
