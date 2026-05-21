'use client';

import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'synchim_pwa_dismissed_until';

/**
 * Regista o service worker e exibe um "soft prompt" de instalação
 * (botão discreto no canto inferior) quando o browser sinaliza que
 * a app é instalável. Esconde-se durante 30 dias se o utilizador
 * descartar.
 *
 * - Funciona em Chrome/Edge/Brave (Android + desktop).
 * - iOS Safari não dispara `beforeinstallprompt`; mostramos a
 *   instrução manual nessa plataforma quando detectada.
 */
export function PWAInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosTip, setIosTip] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Não mostrar se já estiver standalone (instalada).
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // iOS Safari: detectar via UA, mostrar tip manual.
    const ua = navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua);
    const dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) || '0');
    if (Date.now() < dismissedUntil) return;

    if (isIOS) {
      setIosTip(true);
      setHidden(false);
    }

    // Regista o SW
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((e) => {
        // SW pode falhar em dev (HMR) — silenciar.
        console.debug('SW register failed', e);
      });
    }

    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    }
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  function dismiss() {
    setHidden(true);
    localStorage.setItem(DISMISS_KEY, String(Date.now() + 30 * 24 * 60 * 60 * 1000));
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    setHidden(true);
    if (choice.outcome === 'dismissed') dismiss();
  }

  if (hidden) return null;

  return (
    <div
      role="dialog"
      aria-label="Instalar SyncHim"
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        left: 'auto',
        zIndex: 50,
        maxWidth: 320,
        background: '#201914',
        border: '1px solid #3A2E22',
        padding: '16px 18px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
        color: '#F2E8DC',
        fontFamily: '"Spectral", "EB Garamond", Georgia, serif',
        fontSize: 14,
        lineHeight: 1.5
      }}
    >
      <div style={{ fontFamily: '"EB Garamond", serif', fontWeight: 500, fontSize: 16, marginBottom: 6 }}>
        Instalar SyncHim
      </div>
      {iosTip ? (
        <p style={{ margin: '0 0 10px', color: '#A39B8E' }}>
          Toca em <strong style={{ color: '#D4A857' }}>Partilhar</strong> e depois em{' '}
          <strong style={{ color: '#D4A857' }}>Adicionar ao ecrã principal</strong>.
        </p>
      ) : (
        <p style={{ margin: '0 0 10px', color: '#A39B8E' }}>
          Discreto no teu ecrã. Sem notificações.
        </p>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        {!iosTip && (
          <button
            onClick={install}
            style={{
              background: '#B8843D',
              color: '#1A1410',
              border: 'none',
              padding: '8px 16px',
              fontFamily: 'inherit',
              fontSize: 14,
              cursor: 'pointer',
              letterSpacing: '0.02em'
            }}
          >
            instalar
          </button>
        )}
        <button
          onClick={dismiss}
          style={{
            background: 'transparent',
            color: '#A39B8E',
            border: 'none',
            padding: '8px 12px',
            fontFamily: 'inherit',
            fontSize: 13,
            cursor: 'pointer'
          }}
        >
          agora não
        </button>
      </div>
    </div>
  );
}
