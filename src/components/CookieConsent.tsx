'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';

const KEY = 'synchim_cookies_v1';

export function CookieConsent() {
  const locale = useLocale() as 'pt' | 'en';
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (!window.localStorage.getItem(KEY)) {
        // Defer so the page can paint first
        const id = window.setTimeout(() => setShow(true), 1200);
        return () => window.clearTimeout(id);
      }
    } catch { /* private mode */ }
  }, []);

  function accept() {
    try { window.localStorage.setItem(KEY, JSON.stringify({ accepted: true, at: Date.now() })); } catch { /* */ }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-sm z-50 bg-coal border border-separator p-5 md:p-6 shadow-xl"
      style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}
    >
      <p className="font-body text-bone/90 text-sm leading-relaxed mb-4">
        {locale === 'pt' ? (
          <>
            Uso cookies estritamente para guardar a tua sessão e o teu diagnóstico.
            Sem rasto para anúncios.{' '}
            <Link href="/pt/privacidade" className="text-goldBright underline underline-offset-2">
              Privacidade
            </Link>
            .
          </>
        ) : (
          <>
            I use cookies strictly to keep your session and your diagnostic. No ad tracking.{' '}
            <Link href="/en/privacidade" className="text-goldBright underline underline-offset-2">
              Privacy
            </Link>
            .
          </>
        )}
      </p>
      <button
        onClick={accept}
        className="cta-living self-start"
        style={{ fontSize: '0.95rem', padding: '0.7rem 1.6rem' }}
      >
        <span>{locale === 'pt' ? 'Aceito' : 'I agree'}</span>
        <span className="arrow" aria-hidden="true">→</span>
      </button>
    </div>
  );
}
