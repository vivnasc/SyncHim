import { EstrelaPersa } from './marks/EstrelaPersa';

/**
 * A Vivianne presente, a abrir cada sessão/bloqueio do percurso.
 * Foto + uma frase na voz dela, como se estivesse a acompanhar.
 *
 * As fotos vivem em /vivianne/percurso/sessao-N.jpeg — para usar imagens
 * geradas específicas no futuro, basta substituir o ficheiro, sem tocar
 * no código.
 */
const LINHAS: Record<number, { pt: string; en: string }> = {
  1: {
    pt: 'Antes de tudo, respira. Não vens corrigir-te. Vens ver-te.',
    en: 'Before anything, breathe. You are not here to fix yourself. You are here to see yourself.'
  },
  2: {
    pt: 'Responde como és, não como gostarias de ser. Ninguém vê isto — só tu e eu.',
    en: 'Answer as you are, not as you wish to be. No one sees this — only you and me.'
  },
  3: {
    pt: 'Chegaste. A partir daqui desço contigo. Não tenhas pressa — eu fico.',
    en: 'You arrived. From here I go down with you. No rush — I stay.'
  },
  4: {
    pt: 'Hoje vai mais fundo. Estou aqui, do teu lado, em cada palavra.',
    en: 'Today it goes deeper. I am here, by your side, in every word.'
  },
  5: {
    pt: 'Este é o espelho. Olha sem te julgares — eu não te julgo.',
    en: 'This is the mirror. Look without judging yourself — I do not judge you.'
  },
  6: {
    pt: 'A prática que segura. Volto contigo a este lugar, sempre que precisares.',
    en: 'The practice that holds. I return to this place with you, whenever you need.'
  },
  7: {
    pt: 'Atravessaste. Quero que sintas o que eu sinto: orgulho em ti.',
    en: 'You crossed. I want you to feel what I feel: proud of you.'
  }
};

export function PresencaVivianne({ sessao, locale }: { sessao: number; locale: 'pt' | 'en' }) {
  const key = LINHAS[sessao] ? sessao : 3;
  const linha = LINHAS[key];

  return (
    <div className="max-w-[40rem] mx-auto flex items-center gap-5 border border-gold/25 bg-coal/40 rounded-2xl p-5 md:p-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/vivianne/percurso/sessao-${key}.jpeg`}
        alt="Vivianne dos Santos"
        loading="lazy"
        className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover ring-1 ring-gold/50 flex-shrink-0"
      />
      <div className="text-left">
        <EstrelaPersa className="w-5 h-5 text-goldBright mb-2" />
        <p className="font-serif italic text-bone/90 text-lg md:text-xl leading-snug">
          {locale === 'pt' ? linha.pt : linha.en}
        </p>
        <p className="mini-caps text-goldBright mt-3">— Vivianne</p>
      </div>
    </div>
  );
}
