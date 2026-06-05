'use client';

import { useEffect, useState } from 'react';
import { InstallInstructions } from './InstallInstructions';
import { EstrelaPersa } from './marks/EstrelaPersa';

type BeforeInstallPromptEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/**
 * Convite gentil para guardar a SyncHim no ecrã, na voz da marca.
 * - Esconde-se se já estiver instalada (standalone).
 * - Android/Chrome: botão de um toque (prompt nativo).
 * - iPhone/Safari: passos calmos (Partilhar → Adicionar ao ecrã inicial).
 * - Outros: link discreto com as instruções.
 */
export function InstallCard({ locale }: { locale: 'pt' | 'en' }) {
  const pt = locale === 'pt';
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [ready, setReady] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) {
      setInstalled(true);
      setReady(true);
      return;
    }
    const ua = navigator.userAgent;
    setIsIOS(/iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    setReady(true);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!ready || installed) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  const iosSteps = pt
    ? [
        'Toca em Partilhar (o quadrado com a seta para cima).',
        'Escolhe "Adicionar ao ecrã inicial".',
        'Toca em "Adicionar". Pronto.'
      ]
    : [
        'Tap Share (the square with an arrow pointing up).',
        'Choose "Add to Home Screen".',
        'Tap "Add". Done.'
      ];

  return (
    <div className="border border-gold/40 bg-coal/50 p-8 md:p-10 text-center">
      <EstrelaPersa className="w-10 h-10 text-goldBright mx-auto mb-6" />
      <div className="mini-caps text-goldBright mb-4">
        {pt ? 'LEVA-A CONTIGO' : 'TAKE IT WITH YOU'}
      </div>
      <h3 className="font-serif text-2xl md:text-3xl text-bone mb-4">
        {pt ? 'Guarda a SyncHim no teu ecrã' : 'Keep SyncHim on your screen'}
      </h3>
      <p className="font-body italic text-bone/80 leading-relaxed max-w-md mx-auto mb-8">
        {pt
          ? 'Para teres as tuas sessões sempre à mão. Abre como uma app, sem barra de browser, e funciona mesmo sem internet.'
          : 'So your sessions are always within reach. It opens like an app, with no browser bar, and works even offline.'}
      </p>

      {deferred ? (
        <button type="button" onClick={install} className="cta-living large">
          <span>{pt ? 'Instalar agora' : 'Install now'}</span>
          <span className="arrow" aria-hidden="true">→</span>
        </button>
      ) : isIOS ? (
        <div className="max-w-sm mx-auto text-left">
          <p className="font-body text-bone/70 text-sm mb-4 text-center">
            {pt ? 'No iPhone, em 3 toques:' : 'On iPhone, in 3 taps:'}
          </p>
          <ol className="space-y-3">
            {iosSteps.map((step, i) => (
              <li key={i} className="font-body text-bone/85 text-sm leading-relaxed flex gap-3">
                <span className="text-goldBright font-serif flex-shrink-0">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => setShowSteps((v) => !v)}
            className="text-goldBright hover:text-gold font-body text-sm underline-offset-4 hover:underline transition-colors"
          >
            {pt ? 'Ver como instalar' : 'See how to install'}
          </button>
          {showSteps && (
            <div className="mt-6 text-left">
              <InstallInstructions locale={locale} />
            </div>
          )}
        </div>
      )}

      <p className="font-body italic text-ash text-xs mt-8">
        {pt
          ? 'Não ocupa quase nada — e apagas quando quiseres.'
          : 'It takes almost no space — and you can delete it anytime.'}
      </p>
    </div>
  );
}
