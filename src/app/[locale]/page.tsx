import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { trackEvent } from '@/lib/events';
const SECTIONS_PT = {
  recognition: [
    'Provavelmente foi de noite que clicaste. Provavelmente o teu marido estava ao lado, a dormir, ou no telemóvel, ou na outra divisão da casa, e tu, mesmo na mesma casa, estavas sozinha.',
    'Não é a primeira vez.',
    'Há quanto tempo é que tu sentes isto? Não a briga. Não a crise. **Isto.** A coisa silenciosa, sem nome, que mora entre vocês há meses ou anos.',
    'Por fora está tudo bem. Ninguém percebe. Os filhos não percebem. As tuas amigas elogiam-vos.',
    'Por dentro tu sabes.'
  ],
  whyOther: 'Já tentaste quase tudo. Nada disto vai funcionar.',
  failures: [
    ['"Não responda em 3 horas."', 'Performar não-disponibilidade enquanto por dentro estás desesperada. Ele sente.'],
    ['"Active o instinto herói dele."', 'Manipulação rasa. Funciona dias. Depois piora.'],
    ['"Energia feminina."', 'Conceito vago importado. Sem método.'],
    ['Terapia que só conversa.', 'Boa quando há método. Cara e lenta sem.'],
    ['"Aceita que acabou."', 'Rendição prematura. Antes de te renderes, vê o nó.']
  ],
  different: [
    'SyncHim não te ensina a fingir. Não te dá frases para mandar. Não te diz para te fazeres de difícil.',
    'Em vez disso, vai mostrar-te qual é o **padrão antigo em ti** que está a tirar o teu casamento de sincronia, sem tu veres. Cada mulher tem o seu. Vais descobrir o teu. E vais aprender a dissolvê-lo, no silêncio, sem ele perceber que estás a fazer nada.',
    'Quando a sincronia volta, ele volta. Não porque o manipulaste. Porque deixaste de o empurrar para longe sem perceberes.'
  ],
  authorBlock: 'Quem te escreve é Marina Vale. Sem rosto, sem voz pública. Não vendo a minha história. Vendo um método que atravessei e refinei.',
  closing: 'Sem urgência. Sem desconto. O preço é este. O diagnóstico fica aqui, e é teu.'
};

const SECTIONS_EN = {
  recognition: [
    'It was probably night when you clicked. Your husband was probably next to you, asleep, or on his phone, or in another room, and you, even in the same house, were alone.',
    "It's not the first time.",
    'How long have you felt this? Not the fight. Not the crisis. **This.** This silent thing, without a name, that has lived between you for months or years.',
    "From the outside, everything is fine. No one notices. The children don't notice. Your friends compliment you both.",
    'Inside, you know.'
  ],
  whyOther: "You've tried almost everything. None of this will work.",
  failures: [
    ['"Don\'t reply for 3 hours."', 'Performing unavailability while inside you are desperate. He feels it.'],
    ['"Activate his hero instinct."', 'Shallow manipulation. Works for days. Then gets worse.'],
    ['"Feminine energy."', 'A vague imported concept. No method.'],
    ['Talk therapy alone.', 'Good when there is method. Expensive and slow without.'],
    ['"Accept that it\'s over."', 'Premature surrender. Before you give up, see the knot.']
  ],
  different: [
    "SyncHim doesn't teach you to pretend. Doesn't give you sentences to send. Doesn't tell you to play hard to get.",
    'Instead, it shows you the **old pattern in you** that is pulling your marriage out of sync, without you seeing it. Each woman has her own. You will find yours. And you will learn to dissolve it, in silence, without him knowing you are doing anything.',
    'When sync returns, he returns. Not because you manipulated him. Because you stopped pushing him away without knowing.'
  ],
  authorBlock: "Marina Vale writes to you. No face, no public voice. I don't sell my story. I sell a method I crossed and refined.",
  closing: 'No urgency. No discount. The price is the price. The diagnostic stays here, and it is yours.'
};

function formatLine(line: string) {
  return line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**')
      ? <strong key={i} className="text-bone">{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );
}

export default async function LandingPage({ params }: { params: { locale: string } }) {
  const t = await getTranslations({ locale: params.locale, namespace: 'landing' });
  const locale = params.locale as 'pt' | 'en';
  const data = locale === 'pt' ? SECTIONS_PT : SECTIONS_EN;
  await trackEvent('landing_view', { metadata: { locale } });

  return (
    <div className="px-6 md:px-10">
      <section className="max-w-prose mx-auto py-24 md:py-32">
        <h1 className="font-serif text-5xl md:text-6xl leading-[1.05] mb-8">
          {t('heroLine1')}<br />
          {t('heroLine2')}
        </h1>
        <p className="text-xl md:text-2xl text-bone/80 font-body mb-12 leading-relaxed">
          {t('subhead')}
        </p>
        <Link href={`/${locale}/diagnostico`} className="btn btn-primary">
          {t('cta')}
        </Link>
        <p className="text-ash text-sm mt-4 max-w-md">{t('subCta')}</p>
      </section>

      <section className="max-w-prose mx-auto py-16 border-t border-ash/20">
        <div className="prose-mv space-y-5">
          {data.recognition.map((line, i) => (
            <p key={i}>{formatLine(line)}</p>
          ))}
        </div>
      </section>

      <section className="max-w-prose mx-auto py-16 border-t border-ash/20">
        <h2 className="font-serif text-3xl md:text-4xl mb-10">{data.whyOther}</h2>
        <ul className="space-y-6">
          {data.failures.map(([title, body], i) => (
            <li key={i}>
              <div className="font-serif text-xl text-bone mb-1">{title}</div>
              <div className="text-bone/75">{body}</div>
            </li>
          ))}
        </ul>
      </section>

      <section className="max-w-prose mx-auto py-16 border-t border-ash/20">
        <div className="prose-mv space-y-5">
          {data.different.map((line, i) => (
            <p key={i}>{formatLine(line)}</p>
          ))}
        </div>
      </section>

      <section className="max-w-prose mx-auto py-16 border-t border-ash/20">
        <p className="text-bone/80 italic font-body">{data.authorBlock}</p>
      </section>

      <section className="max-w-prose mx-auto py-20 border-t border-ash/20 text-center">
        <p className="text-bone/80 mb-8">{data.closing}</p>
        <Link href={`/${locale}/diagnostico`} className="btn btn-primary">
          {t('cta')}
        </Link>
      </section>
    </div>
  );
}
