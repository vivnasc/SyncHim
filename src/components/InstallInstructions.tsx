'use client';

import { useState } from 'react';

export function InstallInstructions({ locale }: { locale: 'pt' | 'en' }) {
  const [expanded, setExpanded] = useState(false);

  const ios = locale === 'pt' ? {
    title: 'iPhone / iPad (Safari)',
    steps: [
      'Abre no Safari (não funciona noutro browser).',
      'Toca no ícone de Partilhar (quadrado com seta para cima).',
      'Escolhe "Adicionar ao ecrã inicial".',
      'Confirma o nome e toca em "Adicionar".'
    ]
  } : {
    title: 'iPhone / iPad (Safari)',
    steps: [
      'Open in Safari (other browsers won\'t work).',
      'Tap the Share icon (square with an arrow pointing up).',
      'Choose "Add to Home Screen".',
      'Confirm the name and tap "Add".'
    ]
  };

  const android = locale === 'pt' ? {
    title: 'Android (Chrome)',
    steps: [
      'Abre no Chrome.',
      'Toca nos três pontos (menu) no canto superior direito.',
      'Escolhe "Instalar aplicação" ou "Adicionar ao ecrã inicial".',
      'Confirma.'
    ]
  } : {
    title: 'Android (Chrome)',
    steps: [
      'Open in Chrome.',
      'Tap the three dots (menu) in the top-right corner.',
      'Choose "Install app" or "Add to Home Screen".',
      'Confirm.'
    ]
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card {...ios} />
      <Card {...android} />
    </div>
  );
}

function Card({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="border border-separator bg-coal/40 p-6">
      <h4 className="font-serif text-lg text-bone mb-4">{title}</h4>
      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li key={i} className="font-body text-bone/80 text-sm leading-relaxed flex gap-3">
            <span className="text-goldBright font-serif text-sm flex-shrink-0">{i + 1}.</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function InstallBanner({ locale }: { locale: 'pt' | 'en' }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-separator bg-coal/40 mt-6">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <span className="font-serif text-bone text-base">
          {locale === 'pt'
            ? 'Instalar a SyncHim no telemóvel'
            : 'Install SyncHim on your phone'}
        </span>
        <span className={`text-goldBright transition-transform ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>
      {open && (
        <div className="px-5 pb-5">
          <InstallInstructions locale={locale} />
        </div>
      )}
    </div>
  );
}
