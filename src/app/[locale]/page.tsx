import Link from 'next/link';
import { trackEvent } from '@/lib/events';
import { Rosaceo } from '@/components/marks/Rosaceo';
import { Vesica } from '@/components/marks/Vesica';
import { EstrelaPersa } from '@/components/marks/EstrelaPersa';

type Section = {
  hero: { eyebrow: string; h1: [string, string, string]; sub: string; cta: string; subCta: string };
  corte: { lines: string[]; ctaLight: string };
  recusa: { lines: string[]; cta: string };
  autora: { lines: string[] };
  porta: { lines: string[]; cta: string; subCta: string };
};

const SECTIONS_PT: Section = {
  hero: {
    eyebrow: 'MARINA VALE',
    h1: ['Não é frieza dele.', 'É outra coisa.', 'E tu já sentes há meses.'],
    sub: 'Em 8 minutos, sabes o nome do que está a estrangular o teu casamento.',
    cta: 'Quero saber o nome',
    subCta: 'Sem cartão. Sem email a perseguir-te depois.'
  },
  corte: {
    lines: [
      'Há uma forma de um casamento morrer que ninguém te ensinou a ver.',
      'Não há briga. Não há traição. Não há crise.',
      'Há **um silêncio que não estava lá antes**.',
      'Ele olha o telemóvel mais do que olha para ti. Já não te procura à noite como procurava. Responde "está tudo bem", e tu sabes que não está, mas insistir cansa.',
      'Por fora, vocês parecem bem. Os teus filhos não percebem. As tuas amigas elogiam-vos.',
      'Por dentro, tu vives em alerta há tanto tempo que já nem te lembras de como era estar em paz com o homem ao teu lado.'
    ],
    ctaLight: 'Saber o que é isto'
  },
  recusa: {
    lines: [
      'Eu sei o que tu já tentaste.',
      'Tentaste falar. Tentaste viagem. Tentaste ler. Tentaste ficar calada. Tentaste fazer-te mais bonita, mais leve, mais como ele queria. Tentaste, em silêncio, contar os dias e perguntar-te se valia a pena ficar.',
      'Não funcionou porque **tudo isso tratava o sintoma**.',
      'A causa está noutro lugar. Está num padrão antigo em ti, não defeito, **cicatriz**, que está a empurrar a sincronia para fora sem tu veres.',
      'Cada mulher tem o seu. O teu tem nome.'
    ],
    cta: 'Quero saber o nome do meu'
  },
  autora: {
    lines: [
      'Eu chamo-me **Marina Vale**.',
      'Não tenho rosto. Não dou entrevistas. Não vendo cursos. Não estou em mais lado nenhum.',
      'Construí SyncHim a partir da minha própria travessia, e do que aprendi acompanhando mulheres no mesmo processo.',
      'Não te vou prometer que o teu marido volta em 21 dias.',
      'Vou prometer-te que **vais ver, pela primeira vez, o que está a acontecer.**',
      'E o que se vê, dissolve.'
    ]
  },
  porta: {
    lines: [
      'O diagnóstico é grátis.',
      '21 perguntas. 8 minutos. Honestidade brutal contigo mesma.',
      'No fim, vais saber o nome do nó.',
      'Se quiseres atravessá-lo, há um caminho a seguir. Se não quiseres, o diagnóstico fica contigo para sempre, e podes refazê-lo quando precisares.',
      'Sem pressão. Sem cartão. Sem ninguém a saber.'
    ],
    cta: 'Começar agora',
    subCta: 'Estarás de volta a este ecrã em 8 minutos.'
  }
};

const SECTIONS_EN: Section = {
  hero: {
    eyebrow: 'MARINA VALE',
    h1: ["It isn't his coldness.", "It's something else.", "And you've felt it for months."],
    sub: "In 8 minutes, you'll know the name of what is strangling your marriage.",
    cta: 'I want to know the name',
    subCta: 'No card. No follow-up email chasing you.'
  },
  corte: {
    lines: [
      'There is a way a marriage dies that no one taught you to see.',
      'No fight. No betrayal. No crisis.',
      "Just **a silence that wasn't there before**.",
      "He looks at his phone more than at you. He no longer reaches for you at night the way he used to. He answers \"everything's fine\", and you know it isn't, but pressing the question wears you out.",
      "From the outside, you look fine. Your children don't see it. Your friends compliment you both.",
      "Inside, you've been on alert for so long you can't remember what it was to be at peace with the man beside you."
    ],
    ctaLight: 'Find out what this is'
  },
  recusa: {
    lines: [
      "I know what you've already tried.",
      'You tried talking. You tried a trip. You tried reading. You tried being silent. You tried being prettier, lighter, more the way he wanted. You tried, in silence, counting the days and asking yourself if it was worth staying.',
      'None of it worked because **all of it treated the symptom**.',
      "The cause is somewhere else. It's in an old pattern in you, not a flaw, a **scar**, that's pushing the sync out without you seeing.",
      'Every woman has hers. Yours has a name.'
    ],
    cta: 'I want to know mine'
  },
  autora: {
    lines: [
      'My name is **Marina Vale**.',
      'No face. No interviews. No courses. Nowhere else.',
      'I built SyncHim from my own crossing, and from what I learned walking with other women through the same process.',
      "I won't promise your husband will come back in 21 days.",
      "I'll promise you'll **see, for the first time, what is happening.**",
      'And what is seen, dissolves.'
    ]
  },
  porta: {
    lines: [
      'The diagnostic is free.',
      '21 questions. 8 minutes. Brutal honesty with yourself.',
      "At the end, you'll know the name of the knot.",
      "If you want to cross it, there is a path. If you don't, the diagnostic stays with you forever, and you can redo it whenever you need.",
      'No pressure. No card. No one watching.'
    ],
    cta: 'Begin now',
    subCta: "You'll be back on this screen in 8 minutes."
  }
};

function formatLine(line: string) {
  return line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**')
      ? <strong key={i} className="text-bone font-medium">{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );
}

export default async function LandingPage({ params }: { params: { locale: string } }) {
  const locale = params.locale as 'pt' | 'en';
  const d = locale === 'pt' ? SECTIONS_PT : SECTIONS_EN;
  await trackEvent('landing_view', { metadata: { locale } });

  return (
    <div>
      {/* ============ HERO ============ */}
      <section className="relative px-6 md:px-10 pt-16 md:pt-24 pb-20 md:pb-28">
        <Rosaceo className="absolute top-6 left-6 w-10 h-10 text-gold" />
        <Rosaceo className="absolute top-6 right-6 w-10 h-10 text-gold" />

        <div className="max-w-prose mx-auto pt-10 md:pt-14">
          <div className="mini-caps mb-10">{d.hero.eyebrow}</div>

          <h1 className="font-serif text-4xl md:text-6xl leading-[1.15] text-bone space-y-6 md:space-y-7">
            <div>{d.hero.h1[0]}</div>
            <div>{d.hero.h1[1]}</div>
            <div>{d.hero.h1[2]}</div>
          </h1>

          <p className="text-xl md:text-2xl text-bone/85 font-body mt-14 leading-relaxed max-w-[34rem]">
            {d.hero.sub}
          </p>

          <div className="mt-10">
            <Link href={`/${locale}/diagnostico`} className="btn btn-primary">
              {d.hero.cta}
            </Link>
            <p className="text-ash italic font-body text-sm mt-5">{d.hero.subCta}</p>
          </div>
        </div>
      </section>

      <Vesica className="w-20 h-12 mx-auto text-gold my-4" />

      {/* ============ O CORTE ============ */}
      <section className="px-6 md:px-10 py-16 md:py-20">
        <div className="max-w-prose mx-auto space-y-6 font-body text-bone text-lg md:text-xl leading-relaxed">
          {d.corte.lines.map((line, i) => (
            <p key={i}>{formatLine(line)}</p>
          ))}
          <div className="pt-8">
            <Link
              href={`/${locale}/diagnostico`}
              className="text-gold border-b border-gold/60 hover:text-goldBright hover:border-goldBright transition-colors"
            >
              {d.corte.ctaLight}
            </Link>
          </div>
        </div>
      </section>

      <Vesica className="w-20 h-12 mx-auto text-gold my-4" />

      {/* ============ A RECUSA ============ */}
      <section className="px-6 md:px-10 py-16 md:py-20 bg-coal/40">
        <div className="max-w-prose mx-auto space-y-6 font-body text-bone text-lg md:text-xl leading-relaxed">
          {d.recusa.lines.map((line, i) => (
            <p key={i}>{formatLine(line)}</p>
          ))}
          <div className="pt-8">
            <Link href={`/${locale}/diagnostico`} className="btn btn-primary">
              {d.recusa.cta}
            </Link>
          </div>
        </div>
      </section>

      <Vesica className="w-20 h-12 mx-auto text-gold my-4" />

      {/* ============ A AUTORA ============ */}
      <section className="px-6 md:px-10 py-16 md:py-20">
        <div className="max-w-reading mx-auto space-y-5 font-body italic text-bone/90 text-lg md:text-xl leading-relaxed">
          {d.autora.lines.map((line, i) => (
            <p key={i}>{formatLine(line)}</p>
          ))}
        </div>
      </section>

      <Vesica className="w-20 h-12 mx-auto text-gold my-4" />

      {/* ============ A PORTA ============ */}
      <section className="px-6 md:px-10 py-20 md:py-28 bg-coal/40">
        <div className="max-w-prose mx-auto text-center space-y-5 font-body text-bone text-lg md:text-xl leading-relaxed">
          {d.porta.lines.map((line, i) => (
            <p key={i} className="max-w-[34rem] mx-auto">{formatLine(line)}</p>
          ))}
          <div className="pt-10">
            <Link href={`/${locale}/diagnostico`} className="btn btn-primary text-lg">
              {d.porta.cta}
            </Link>
            <p className="text-ash italic font-body text-sm mt-5">{d.porta.subCta}</p>
          </div>
        </div>
      </section>

      {/* ============ FECHO COM ESTRELA ============ */}
      <div className="flex justify-center pt-10 pb-4">
        <EstrelaPersa className="w-12 h-12 text-goldBright" />
      </div>
    </div>
  );
}
