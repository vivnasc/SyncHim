'use client';

import { useState } from 'react';
import { EstrelaPersa } from './marks/EstrelaPersa';

/**
 * Captura para a lista de espera enquanto as vendas estão fechadas
 * (modo testes). Grava em notify_list via /api/notify.
 */
export function ListaEspera({
  locale,
  no = 'lista-espera',
  email: initialEmail = ''
}: {
  locale: 'pt' | 'en';
  no?: string;
  email?: string;
}) {
  const pt = locale === 'pt';
  const [email, setEmail] = useState(initialEmail);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!email) return;
    setSubmitting(true);
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, no, locale })
      });
    } catch { /* */ }
    setDone(true);
    setSubmitting(false);
  }

  if (done) {
    return (
      <div className="text-center">
        <EstrelaPersa className="w-10 h-10 text-goldBright mx-auto mb-5" />
        <p className="font-serif text-2xl md:text-3xl text-goldBright mb-3">
          {pt ? 'Estás na lista.' : 'You are on the list.'}
        </p>
        <p className="font-body italic text-bone/80 leading-relaxed max-w-sm mx-auto">
          {pt
            ? 'Aviso-te assim que abrir. Obrigada pela paciência.'
            : 'I will let you know the moment it opens. Thank you for your patience.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
      <input
        type="email"
        className="input flex-1"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={pt ? 'O teu email' : 'Your email'}
        autoComplete="email"
      />
      <button
        type="button"
        onClick={submit}
        disabled={submitting || !email}
        className="cta-living disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span>{submitting ? '…' : pt ? 'Avisa-me' : 'Notify me'}</span>
        {!submitting && <span className="arrow" aria-hidden="true">→</span>}
      </button>
    </div>
  );
}
