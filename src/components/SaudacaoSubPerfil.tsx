import type { SubPerfil } from '@/lib/target';
import type { Locale } from '@/lib/diagnostic';

/**
 * Saudação condicional mostrada no topo do primeiro resultado para
 * sub-perfis B (sozinha) e C (início). Para A (casada), não renderiza.
 *
 * Texto vindo directo da spec de bifurcação.
 */
export function SaudacaoSubPerfil({
  subPerfil,
  locale
}: {
  subPerfil: SubPerfil | null;
  locale: Locale;
}) {
  if (!subPerfil) return null;

  const pt: Record<SubPerfil, { lead: string; body: string[]; tail: string }> = {
    sozinha: {
      lead: 'Tu não estás aqui por causa de um homem específico.',
      body: [
        'Estás aqui porque há um padrão.',
        'As relações que começam e morrem na mesma fase. Os homens que parecem diferentes e afinal são iguais. A sensação de que há algo em ti que afasta o que tu queres.'
      ],
      tail: 'Vamos ver o que é.'
    },
    inicio: {
      lead: 'Conheceste alguém.',
      body: [
        'E em vez de alegria pura, há também medo.',
        'Medo de estragar. Medo de repetir. Medo de que desta vez também não dure.'
      ],
      tail: 'Esse medo tem nome. Vamos vê-lo antes que ele aja por ti.'
    }
  };

  const en: Record<SubPerfil, { lead: string; body: string[]; tail: string }> = {
    sozinha: {
      lead: 'You are not here because of a specific man.',
      body: [
        'You are here because there is a pattern.',
        'Relationships that begin and die in the same phase. Men who seem different and turn out to be the same. The feeling that something in you pushes away what you want.'
      ],
      tail: "Let us see what it is."
    },
    inicio: {
      lead: 'You met someone.',
      body: [
        'And instead of pure joy, there is also fear.',
        'Fear of ruining it. Fear of repeating. Fear that this one will not last either.'
      ],
      tail: 'That fear has a name. Let us see it before it acts on your behalf.'
    }
  };

  const block = (locale === 'pt' ? pt : en)[subPerfil];

  return (
    <div className="max-w-[40rem] mx-auto mb-12 border-l-2 border-gold pl-6 py-2">
      <p className="font-serif text-xl md:text-2xl text-bone leading-snug mb-3">{block.lead}</p>
      {block.body.map((p, i) => (
        <p key={i} className="font-body text-bone/85 leading-relaxed mb-2">{p}</p>
      ))}
      <p className="font-serif italic text-goldBright mt-3">{block.tail}</p>
    </div>
  );
}
