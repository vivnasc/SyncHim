import Link from 'next/link';
import Image from 'next/image';
import { trackEvent } from '@/lib/events';
import { Rosaceo } from '@/components/marks/Rosaceo';
import { Vesica } from '@/components/marks/Vesica';
import { EstrelaPersa } from '@/components/marks/EstrelaPersa';
import { FadeIn } from '@/components/FadeIn';
import { NOS } from '@/lib/diagnostic';
import { noContent } from '@/lib/no-content';
import { getTranslations } from 'next-intl/server';

type CopySection = {
  hero: { eyebrow: string; tag: string; h1: [string, string, string]; sub: string; cta: string; subCta: string };
  corte: { number: string; title: string; lines: string[]; ctaLight: string };
  numeros: { items: { value: string; label: string }[] };
  os7: { eyebrow: string; title: string; helper: string; cta: string };
  recusa: { number: string; title: string; lines: string[]; cta: string };
  vozes: { eyebrow: string; title: string; cards: { quote: string; signature: string }[] };
  autora: { eyebrow: string; lines: string[] };
  porta: { number: string; title: string; lines: string[]; cta: string; subCta: string };
};

const PT: CopySection = {
  hero: {
    eyebrow: 'VIVIANNE DOS SANTOS',
    tag: 'Para casadas e solteiras em relações sérias',
    h1: ['Não é frieza dele.', 'É outra coisa.', 'E tu já sentes há meses.'],
    sub: 'Em 8 minutos, sabes o nome do padrão antigo que está a sabotar a tua relação, casada há vinte anos ou a construir agora.',
    cta: 'Quero saber o nome',
    subCta: 'Sem cartão. Sem email a perseguir-te depois.'
  },
  corte: {
    number: '01',
    title: 'O silêncio que ninguém te ensinou a ver.',
    lines: [
      'Há uma forma de um casamento __morrer__ que ninguém te ensinou a ver.',
      'Não há briga. Não há traição. Não há crise.',
      'Há **um silêncio que não estava lá antes**.',
      'Ele olha o telemóvel mais do que olha para ti. Já não te procura à noite como procurava. Responde "está tudo bem", e tu sabes que não está, mas insistir cansa.',
      'Por fora, vocês parecem bem. Os teus filhos não percebem. As tuas amigas elogiam-vos.',
      'Por dentro, tu vives em alerta há tanto tempo que já nem te lembras de como era estar em paz com o homem ao teu lado.'
    ],
    ctaLight: 'Saber o que é isto'
  },
  numeros: {
    items: [
      { value: '7', label: 'Padrões. Um teu.' },
      { value: '21', label: 'Dias de travessia.' },
      { value: '8', label: 'Minutos de diagnóstico.' }
    ]
  },
  os7: {
    eyebrow: 'OS SETE NÓS',
    title: 'Sete padrões antigos. Um deles é o teu.',
    helper: 'Cada mulher carrega um. Não vais escolher. O diagnóstico vai mostrar.',
    cta: 'Saber qual é o meu'
  },
  recusa: {
    number: '02',
    title: 'Já tentaste quase tudo. Por isso continua igual.',
    lines: [
      'Eu sei o que tu já tentaste.',
      'Tentaste falar. Tentaste viagem. Tentaste ler. Tentaste ficar calada. Tentaste fazer-te mais bonita, mais leve, mais como ele queria. Tentaste, em silêncio, contar os dias e perguntar-te se valia a pena ficar.',
      'Não funcionou porque **tudo isso tratava o sintoma**.',
      'A causa está noutro lugar. Está num padrão antigo em ti, não defeito, __cicatriz__, que está a empurrar a sincronia para fora sem tu veres.',
      'Cada mulher tem o seu. O teu tem nome.'
    ],
    cta: 'Quero saber o nome do meu'
  },
  vozes: {
    eyebrow: 'CARTAS QUE RECEBI',
    title: 'Não são depoimentos. São cartas.',
    cards: [
      {
        quote:
          'Há três meses ele voltou a procurar-me à noite. Eu não fiz nada visível. Só dissolvi o nó.',
        signature: 'M., Porto'
      },
      {
        quote:
          'Achei que era ele que tinha mudado. Era eu. E foi a primeira vez que isso não me destruiu.',
        signature: 'A., Cascais'
      },
      {
        quote:
          'Trabalhei sete dias na minha Fome. Ao oitavo, recebi a mensagem que não recebia há meses.',
        signature: 'C., São Paulo'
      }
    ]
  },
  autora: {
    eyebrow: 'QUEM TE ESCREVE',
    lines: [
      'Eu chamo-me **Vivianne dos Santos**.',
      'Escritora, criadora, em formação em psicologia transpessoal, em psicologia e espiritualidade, e em terapia da constelação familiar sistémica.',
      'Não vim dizer-te o que fazer no teu amor. Vim ajudar-te a ver o nó que o sabota, esse que vem de trás, dos padrões que herdaste sem escolher.',
      'Estudo os sistemas que nos formam, e foi disso que nasceu a SyncHim.',
      'Os casais não morrem por falta de amor. Morrem por dessincronia.',
      'E a sincronia começa **quando voltas a ti**.'
    ]
  },
  porta: {
    number: '03',
    title: 'A porta.',
    lines: [
      'O diagnóstico é grátis.',
      '21 perguntas. 8 minutos. Honestidade brutal contigo mesma.',
      'No fim, vais saber o nome do nó.',
      'Sem pressão. Sem cartão. Sem ninguém a saber.'
    ],
    cta: 'Começar agora',
    subCta: 'Estarás de volta a este ecrã em 8 minutos.'
  }
};

const EN: CopySection = {
  hero: {
    eyebrow: 'VIVIANNE DOS SANTOS',
    tag: 'For married women and singles in serious relationships',
    h1: ["It isn't his coldness.", "It's something else.", "And you've felt it for months."],
    sub: "In 8 minutes, you'll know the name of the old pattern that is sabotaging your relationship, whether you've been married for twenty years or are building one now.",
    cta: 'I want to know the name',
    subCta: 'No card. No follow-up email chasing you.'
  },
  corte: {
    number: '01',
    title: "The silence no one taught you to see.",
    lines: [
      'There is a way a marriage __dies__ that no one taught you to see.',
      'No fight. No betrayal. No crisis.',
      "Just **a silence that wasn't there before**.",
      "He looks at his phone more than at you. He no longer reaches for you at night the way he used to. He answers \"everything's fine\", and you know it isn't, but pressing the question wears you out.",
      "From the outside, you look fine. Your children don't see it. Your friends compliment you both.",
      "Inside, you've been on alert for so long you can't remember what it was to be at peace with the man beside you."
    ],
    ctaLight: 'Find out what this is'
  },
  numeros: {
    items: [
      { value: '7', label: 'Patterns. One is yours.' },
      { value: '21', label: 'Days to cross it.' },
      { value: '8', label: 'Minutes to find it.' }
    ]
  },
  os7: {
    eyebrow: 'THE SEVEN KNOTS',
    title: 'Seven old patterns. One of them is yours.',
    helper: "Every woman carries one. You won't choose. The diagnostic will reveal.",
    cta: 'Find out which is mine'
  },
  recusa: {
    number: '02',
    title: "You've tried almost everything. That's why nothing changes.",
    lines: [
      "I know what you've already tried.",
      'You tried talking. You tried a trip. You tried reading. You tried being silent. You tried being prettier, lighter, more the way he wanted. You tried, in silence, counting the days and asking yourself if it was worth staying.',
      'None of it worked because **all of it treated the symptom**.',
      "The cause is somewhere else. It's in an old pattern in you, not a flaw, a __scar__, that's pushing the sync out without you seeing.",
      'Every woman has hers. Yours has a name.'
    ],
    cta: 'I want to know mine'
  },
  vozes: {
    eyebrow: 'LETTERS I HAVE RECEIVED',
    title: 'These are not testimonials. They are letters.',
    cards: [
      {
        quote:
          'Three months ago he started reaching for me at night again. I did nothing visible. I just dissolved the knot.',
        signature: 'M., Porto'
      },
      {
        quote:
          "I thought it was him who had changed. It was me. And it was the first time that didn't destroy me.",
        signature: 'A., Cascais'
      },
      {
        quote:
          "I worked seven days on my Hunger. On the eighth, I received the message I hadn't received in months.",
        signature: 'C., São Paulo'
      }
    ]
  },
  autora: {
    eyebrow: 'WHO WRITES TO YOU',
    lines: [
      'My name is **Vivianne dos Santos**.',
      'Writer, creator, in training in transpersonal psychology, in psychology and spirituality, and in systemic family constellation therapy.',
      "I did not come to tell you what to do in your love. I came to help you see the knot that sabotages it, the one that comes from before, from the patterns you inherited without choosing.",
      'I study the systems that form us, and from that, SyncHim was born.',
      "Couples don't die from lack of love. They die from desynchrony.",
      'And synchrony begins **when you return to yourself**.'
    ]
  },
  porta: {
    number: '03',
    title: 'The door.',
    lines: [
      'The diagnostic is free.',
      '21 questions. 8 minutes. Brutal honesty with yourself.',
      "At the end, you'll know the name of the knot.",
      'No pressure. No card. No one watching.'
    ],
    cta: 'Begin now',
    subCta: "You'll be back on this screen in 8 minutes."
  }
};

function formatLine(line: string) {
  // **bold** → strong, __word__ → bordeaux emphasis
  const parts = line.split(/(\*\*[^*]+\*\*|__[^_]+__)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**')) {
      return <strong key={i} className="text-bone font-medium">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('__')) {
      return <span key={i} className="text-bordeaux font-medium">{part.slice(2, -2)}</span>;
    }
    return <span key={i}>{part}</span>;
  });
}

function Arrow() {
  return (
    <span className="arrow" aria-hidden="true">
      →
    </span>
  );
}

export default async function LandingPage({ params }: { params: { locale: string } }) {
  const locale = params.locale as 'pt' | 'en';
  const d = locale === 'pt' ? PT : EN;
  const tNo = await getTranslations({ locale, namespace: 'no' });
  await trackEvent('landing_view', { metadata: { locale } });

  return (
    <div>
      {/* ============ HERO ============ */}
      <section className="relative px-6 md:px-10 pt-12 md:pt-16 pb-20 md:pb-28 overflow-hidden">
        <Rosaceo className="absolute top-6 left-6 w-10 h-10 text-gold opacity-70" />
        <Rosaceo className="absolute top-6 right-6 w-10 h-10 text-gold opacity-70" />

        <div className="max-w-6xl mx-auto pt-12 md:pt-20 grid md:grid-cols-[1fr_minmax(0,440px)] gap-10 md:gap-16 items-center">
          {/* Left column: copy */}
          <FadeIn className="order-2 md:order-1">
            <div className="mini-caps mb-2 text-goldBright">{d.hero.eyebrow}</div>
            <div className="font-body italic text-ash text-sm mb-10">{d.hero.tag}</div>

            <h1 className="font-serif text-bone">
              <span className="block text-4xl md:text-5xl lg:text-6xl leading-[1.1] mb-5 md:mb-6">
                {d.hero.h1[0]}
              </span>
              <span className="block text-4xl md:text-5xl lg:text-6xl leading-[1.1] mb-5 md:mb-6">
                {d.hero.h1[1]}
              </span>
              <span className="block text-3xl md:text-4xl lg:text-5xl leading-[1.15] italic text-bone/85">
                {d.hero.h1[2]}
              </span>
            </h1>

            <p className="font-body text-bone/85 text-lg md:text-xl mt-10 leading-relaxed max-w-[34rem]">
              {d.hero.sub}
            </p>

            <div className="mt-10">
              <Link href={`/${locale}/diagnostico`} className="cta-living large">
                <span>{d.hero.cta}</span>
                <Arrow />
              </Link>
              <p className="text-ash italic font-body text-sm mt-5">{d.hero.subCta}</p>
              <p className="text-ash/60 font-body text-xs mt-3">
                {locale === 'pt'
                  ? 'Vive no teu telefone. Discreto. Sem notificações. Sem ninguém a ver.'
                  : 'Lives on your phone. Discreet. No notifications. No one watching.'}
              </p>
              <p className="text-ash font-body text-sm mt-4 max-w-[34rem]">
                {locale === 'pt' ? (
                  <>
                    Não estás casada? Os mesmos 7 nós operam em quem ainda procura. {' '}
                    <Link href={`/${locale}/diagnostico?for=solteira`} className="cta-ghost" style={{ display: 'inline' }}>
                      Começar como solteira <span className="arrow" aria-hidden="true">→</span>
                    </Link>
                  </>
                ) : (
                  <>
                    Not married? The same 7 knots operate in those still looking. {' '}
                    <Link href={`/${locale}/diagnostico?for=solteira`} className="cta-ghost" style={{ display: 'inline' }}>
                      Start as single <span className="arrow" aria-hidden="true">→</span>
                    </Link>
                  </>
                )}
              </p>
            </div>
          </FadeIn>

          {/* Right column: author photo */}
          <FadeIn delay={250} className="order-1 md:order-2">
            <div className="relative aspect-[2/3] max-w-[420px] mx-auto md:mx-0 md:ml-auto">
              <div className="absolute inset-0 ring-1 ring-separator" />
              <Image
                src="/vivianne/hero.jpeg"
                alt="Vivianne dos Santos"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 440px"
                className="object-cover object-top grayscale-[0.05] contrast-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/40 via-transparent to-transparent" />
            </div>
          </FadeIn>
        </div>
      </section>

      <Vesica className="w-20 h-12 mx-auto text-gold my-4" />

      {/* ============ 01, O CORTE ============ */}
      <FadeIn as="section" className="px-6 md:px-10 py-20 md:py-24">
        <div className="max-w-6xl mx-auto grid md:grid-cols-[180px_1fr] gap-10">
          <div className="md:pt-3">
            <div className="font-serif text-bordeaux text-6xl md:text-7xl leading-none">
              {d.corte.number}
            </div>
          </div>
          <div>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-bone leading-[1.15] mb-10 max-w-3xl">
              {d.corte.title}
            </h2>
            <div className="space-y-5 font-body text-bone text-lg md:text-xl leading-relaxed max-w-[40rem]">
              {d.corte.lines.map((line, i) => (
                <p key={i}>{formatLine(line)}</p>
              ))}
            </div>
            <div className="mt-10">
              <Link href={`/${locale}/diagnostico`} className="cta-ghost">
                <span>{d.corte.ctaLight}</span>
                <Arrow />
              </Link>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* ============ NÚMEROS ============ */}
      <FadeIn as="section" className="px-6 md:px-10 py-16 md:py-20 bg-coal/60">
        <div className="max-w-5xl mx-auto grid grid-cols-3 gap-6 md:gap-12 text-center">
          {d.numeros.items.map((n, i) => (
            <div key={i}>
              <div className="font-serif text-gold text-6xl md:text-7xl lg:text-8xl leading-none mb-3">
                {n.value}
              </div>
              <div className="mini-caps text-ash">{n.label}</div>
            </div>
          ))}
        </div>
      </FadeIn>

      <Vesica className="w-20 h-12 mx-auto text-gold my-4" />

      {/* ============ OS 7 NÓS (tease) ============ */}
      <FadeIn as="section" className="px-6 md:px-10 py-20 md:py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="mini-caps mb-4 text-goldBright">{d.os7.eyebrow}</div>
            <h2 className="font-serif text-3xl md:text-4xl text-bone mb-5 max-w-2xl mx-auto leading-tight">
              {d.os7.title}
            </h2>
            <p className="font-body italic text-ash text-base md:text-lg max-w-xl mx-auto">
              {d.os7.helper}
            </p>
          </div>

          <ol className="grid md:grid-cols-2 gap-px bg-separator border border-separator max-w-3xl mx-auto">
            {NOS.map((no, i) => {
              const c = noContent(locale, no);
              return (
                <li key={no} className="bg-ink p-6 md:p-7">
                  <div className="flex items-baseline gap-4">
                    <span className="font-serif text-gold/60 text-sm tabular-nums">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="font-serif text-bone text-xl md:text-2xl">
                      {tNo(no)}
                    </span>
                  </div>
                  <p className="font-body italic text-ash text-sm md:text-base mt-2 leading-snug">
                    {c.lead}
                  </p>
                </li>
              );
            })}
          </ol>

          <div className="text-center mt-12">
            <Link href={`/${locale}/diagnostico`} className="cta-living">
              <span>{d.os7.cta}</span>
              <Arrow />
            </Link>
          </div>
        </div>
      </FadeIn>

      <Vesica className="w-20 h-12 mx-auto text-gold my-4" />

      {/* ============ 02, A RECUSA ============ */}
      <FadeIn as="section" className="px-6 md:px-10 py-20 md:py-24 bg-coal/60 relative overflow-hidden">
        <div className="max-w-6xl mx-auto grid md:grid-cols-[1fr_minmax(0,380px)] gap-10 md:gap-16 items-start">
          <div>
            <div className="font-serif text-bordeaux text-6xl md:text-7xl leading-none mb-6">
              {d.recusa.number}
            </div>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-bone leading-[1.15] mb-10 max-w-2xl">
              {d.recusa.title}
            </h2>
            <div className="space-y-5 font-body text-bone text-lg md:text-xl leading-relaxed max-w-[40rem]">
              {d.recusa.lines.map((line, i) => (
                <p key={i}>{formatLine(line)}</p>
              ))}
            </div>
            <div className="mt-10">
              <Link href={`/${locale}/diagnostico`} className="cta-living">
                <span>{d.recusa.cta}</span>
                <Arrow />
              </Link>
            </div>
          </div>
          <div className="relative aspect-[3/4] max-w-[380px] mx-auto md:mx-0 hidden md:block">
            <div className="absolute inset-0 ring-1 ring-separator" />
            <Image
              src="/vivianne/escrita.jpeg"
              alt=""
              fill
              sizes="380px"
              className="object-cover"
            />
          </div>
        </div>
      </FadeIn>

      <Vesica className="w-20 h-12 mx-auto text-gold my-4" />

      {/* ============ VOZES (cartas) ============ */}
      <FadeIn as="section" className="px-6 md:px-10 py-20 md:py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="mini-caps mb-4 text-goldBright">{d.vozes.eyebrow}</div>
            <h2 className="font-serif text-3xl md:text-4xl text-bone leading-tight max-w-2xl mx-auto">
              {d.vozes.title}
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {d.vozes.cards.map((card, i) => (
              <FadeIn key={i} delay={i * 150} className="bg-coal/40 border border-separator p-7 md:p-8 flex flex-col">
                <p className="font-body italic text-bone/90 text-lg leading-relaxed mb-6">
                  &ldquo;{card.quote}&rdquo;
                </p>
                <div className="mt-auto pt-4 border-t border-separator">
                  <span className="mini-caps text-gold">{card.signature}</span>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </FadeIn>

      <Vesica className="w-20 h-12 mx-auto text-gold my-4" />

      {/* ============ A AUTORA ============ */}
      <FadeIn as="section" className="px-6 md:px-10 py-20 md:py-24">
        <div className="max-w-6xl mx-auto grid md:grid-cols-[minmax(0,360px)_1fr] gap-10 md:gap-16 items-center">
          <div className="relative aspect-[3/4] max-w-[360px] mx-auto md:mx-0">
            <div className="absolute inset-0 ring-1 ring-separator" />
            <Image
              src="/vivianne/quem-sou.jpeg"
              alt="Vivianne dos Santos"
              fill
              sizes="(max-width: 768px) 100vw, 360px"
              className="object-cover"
            />
          </div>
          <div>
            <div className="mini-caps mb-6 text-goldBright">{d.autora.eyebrow}</div>
            <div className="space-y-5 font-body italic text-bone/90 text-lg md:text-xl leading-relaxed">
              {d.autora.lines.map((line, i) => (
                <p key={i}>{formatLine(line)}</p>
              ))}
            </div>
          </div>
        </div>
      </FadeIn>

      <Vesica className="w-20 h-12 mx-auto text-gold my-4" />

      {/* ============ 03, A PORTA ============ */}
      <FadeIn as="section" className="px-6 md:px-10 py-24 md:py-32 bg-coal/60 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="font-serif text-bordeaux text-6xl md:text-7xl leading-none mb-6">
            {d.porta.number}
          </div>
          <h2 className="font-serif text-4xl md:text-5xl text-bone mb-10">
            {d.porta.title}
          </h2>
          <div className="space-y-5 font-body text-bone text-lg md:text-xl leading-relaxed">
            {d.porta.lines.map((line, i) => (
              <p key={i}>{formatLine(line)}</p>
            ))}
          </div>
          <div className="mt-12">
            <Link href={`/${locale}/diagnostico`} className="cta-living large">
              <span>{d.porta.cta}</span>
              <Arrow />
            </Link>
            <p className="text-ash italic font-body text-sm mt-6">{d.porta.subCta}</p>
            <p className="text-ash/60 font-body text-xs mt-3">
              {locale === 'pt'
                ? 'Vive no teu telefone. Discreto. Sem notificações. Sem ninguém a ver.'
                : 'Lives on your phone. Discreet. No notifications. No one watching.'}
            </p>
          </div>
        </div>
      </FadeIn>

      {/* ============ FECHO ============ */}
      <div className="flex flex-col items-center pt-14 pb-6 gap-4">
        <EstrelaPersa className="w-14 h-14 text-goldBright" />
      </div>
    </div>
  );
}
