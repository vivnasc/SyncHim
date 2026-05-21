'use client';

import Link from 'next/link';
import type { No } from '@/lib/diagnostic';

type Props = {
  locale: 'pt' | 'en';
  noActual: No;
  proximo: No;
  /** 1 = Tier 1, 2 = Tier 2 */
  tier: number;
  /** preços em USD (Vercel envs); BRL mostrado em paralelo se quiseres */
  upgradeNoUsd: number;
  upgradeNoBrl: number;
  bibliotecaDiffUsd: number;
  bibliotecaDiffBrl: number;
};

/**
 * Bloco de upsell que aparece depois do conteúdo da Sessão 7.
 *
 * Para Tier 1:
 *   - Atravessar próximo nó (US$ 19)
 *   - Biblioteca completa (US$ 48 diff para Tier 2)
 *   - Ficar só com este nó (sem CTA)
 *
 * Para Tier 2:
 *   - Refazer o diagnóstico
 */
export function UpsellSessao7({
  locale, noActual, proximo, tier,
  upgradeNoUsd, upgradeNoBrl, bibliotecaDiffUsd, bibliotecaDiffBrl
}: Props) {
  if (tier >= 2) {
    return (
      <div className="max-w-[40rem] mx-auto py-12">
        <div className="mini-caps text-goldBright mb-3">
          {locale === 'pt' ? 'A BIBLIOTECA É TUA' : 'THE LIBRARY IS YOURS'}
        </div>
        <h3 className="font-serif text-2xl text-bone mb-3">
          {locale === 'pt' ? 'Refazer o diagnóstico' : 'Retake the diagnostic'}
        </h3>
        <p className="font-body text-bone/80 mb-6 leading-relaxed">
          {locale === 'pt'
            ? 'O próximo nó sobe quando o primeiro afrouxa. Tu já tens acesso aos sete.'
            : 'The next knot rises when the first one loosens. You already have access to all seven.'}
        </p>
        <Link href={`/${locale}/diagnostico`} className="cta-living">
          <span>{locale === 'pt' ? 'Refazer agora' : 'Retake now'}</span>
          <span className="arrow" aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

  const proximoLabel: Record<No, string> = locale === 'pt' ? {
    fome: 'a Fome', controlo: 'o Controlo', inferioridade: 'a Inferioridade',
    desconfianca: 'a Desconfiança', salvadora: 'a Salvadora',
    abandono: 'o Abandono', invisibilidade: 'a Invisibilidade'
  } : {
    fome: 'Hunger', controlo: 'Control', inferioridade: 'Inferiority',
    desconfianca: 'Distrust', salvadora: 'the Saviour',
    abandono: 'Abandonment', invisibilidade: 'Invisibility'
  };

  return (
    <div className="max-w-[40rem] mx-auto py-12 space-y-10">
      {/* 1. Atravessar próximo nó */}
      <div className="border-l-2 border-gold pl-6 py-2">
        <div className="mini-caps text-goldBright mb-2">
          {locale === 'pt' ? 'ATRAVESSA O TEU PRÓXIMO NÓ' : 'CROSS YOUR NEXT KNOT'}
        </div>
        <h3 className="font-serif text-2xl text-bone mb-3">
          {locale === 'pt'
            ? `O caminho de ${proximoLabel[proximo]} está pronto.`
            : `The path of ${proximoLabel[proximo]} is ready.`}
        </h3>
        <p className="font-body text-bone/80 mb-5 leading-relaxed">
          {locale === 'pt'
            ? 'Mesmas 7 sessões e 5 práticas, dirigidas à raiz exacta deste nó.'
            : 'The same 7 sessions and 5 practices, aimed at the exact root of this knot.'}
        </p>
        <Link
          href={`/${locale}/checkout?no=${proximo}&tipo=extra`}
          className="cta-living"
        >
          <span>
            {locale === 'pt'
              ? `Quero atravessar ${proximoLabel[proximo]}, R$ ${upgradeNoBrl} / US$ ${upgradeNoUsd}`
              : `Cross ${proximoLabel[proximo]}, R$ ${upgradeNoBrl} / US$ ${upgradeNoUsd}`}
          </span>
          <span className="arrow" aria-hidden="true">→</span>
        </Link>
      </div>

      {/* 2. Biblioteca completa */}
      <div className="border-l-2 border-ash/30 pl-6 py-2">
        <div className="mini-caps text-ash mb-2">
          {locale === 'pt' ? 'OU O MAPA INTEIRO' : 'OR THE WHOLE MAP'}
        </div>
        <h3 className="font-serif text-xl text-bone mb-3">
          {locale === 'pt' ? 'A biblioteca completa' : 'The complete library'}
        </h3>
        <p className="font-body text-bone/75 text-sm mb-4 leading-relaxed">
          {locale === 'pt'
            ? 'Os 7 nós. O diagnóstico para refazeres sempre. Cada nó que aparecer ao longo da vida, tu atravessa-lo.'
            : 'All 7 knots. The diagnostic to retake forever. Every knot that surfaces along your life, you cross it.'}
        </p>
        <Link
          href={`/${locale}/checkout?tipo=biblioteca`}
          className="cta-ghost"
        >
          <span>
            {locale === 'pt'
              ? `Quero a biblioteca, diferença de R$ ${bibliotecaDiffBrl} / US$ ${bibliotecaDiffUsd}`
              : `I want the library, difference of R$ ${bibliotecaDiffBrl} / US$ ${bibliotecaDiffUsd}`}
          </span>
          <span className="arrow" aria-hidden="true">→</span>
        </Link>
      </div>

      {/* 3. Ficar só com este nó */}
      <p className="font-serif italic text-gold/80 text-center text-sm">
        {locale === 'pt'
          ? `Ou fica com o que conquistaste. ${proximoLabel[proximo].replace(/^(a|o)\s+/i, '')} pode esperar. ${proximoLabel[noActual].replace(/^(a|o)\s+/i, '')} que tu atravessaste é tua para sempre.`
          : `Or stay with what you crossed. ${proximoLabel[noActual]} is yours forever.`}
      </p>
    </div>
  );
}
