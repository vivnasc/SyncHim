import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import {
  NOS,
  NOS_VENDAVEIS,
  QUESTIONS_PER_NO,
  type No
} from '@/lib/diagnostic';
import { noContentFor } from '@/lib/no-content-variants';
import { questionMapFor } from '@/lib/diagnostic-variants';
import { coerceTarget, type Target } from '@/lib/target';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { trackEvent } from '@/lib/events';
import { NotifyForm } from '@/components/NotifyForm';
import { Vesica } from '@/components/marks/Vesica';
import { EstrelaPersa } from '@/components/marks/EstrelaPersa';
import { FadeIn } from '@/components/FadeIn';

interface ResultCookie {
  user_id: string;
  nome: string | null;
  dominante: No;
  secundario: No | null;
  pontuacoes: Record<No, number>;
  respostas_dominante: Record<string, 0 | 1 | 2 | 3>;
  is_repeat: boolean;
  target?: Target;
}

function Arrow() {
  return <span className="arrow" aria-hidden="true">→</span>;
}

export default async function ResultPage({ params }: { params: { locale: string } }) {
  const locale = params.locale as 'pt' | 'en';
  const raw = cookies().get('synchim_result')?.value;
  if (!raw) redirect(`/${locale}/diagnostico`);
  let payload: ResultCookie;
  try {
    payload = JSON.parse(raw) as ResultCookie;
  } catch {
    redirect(`/${locale}/diagnostico`);
  }

  const t = await getTranslations({ locale: params.locale, namespace: 'result' });
  const tNo = await getTranslations({ locale: params.locale, namespace: 'no' });
  const dominante = payload!.dominante;
  const secundario = payload!.secundario;
  const sellable = NOS_VENDAVEIS.includes(dominante);
  const target = coerceTarget(payload!.target);
  const content = noContentFor(locale, target, dominante);
  const dominanteScore = payload!.pontuacoes[dominante];
  const dominanteName = tNo(dominante);
  const qMap = questionMapFor(locale, target);
  const dominanteQuestions = QUESTIONS_PER_NO[dominante];
  const dominanteAnswers = dominanteQuestions.map((qid) => ({
    qid,
    text: qMap[qid],
    score: payload!.respostas_dominante?.[qid] ?? 0
  }));
  const highCount = dominanteAnswers.filter((a) => a.score >= 2).length;

  const otherNos = NOS
    .filter((n) => n !== dominante)
    .map((n) => ({ no: n, score: payload!.pontuacoes[n] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .filter((n) => n.score > 0);

  await trackEvent('resultado_visualizado', { userId: payload!.user_id, metadata: { dominante } });

  let previous: { no: No; months: number } | null = null;
  if (payload!.is_repeat) {
    const admin = createSupabaseAdmin();
    const { data } = await admin
      .from('diagnosticos')
      .select('no_dominante, created_at')
      .eq('user_id', payload!.user_id)
      .order('created_at', { ascending: false })
      .limit(2);
    if (data && data.length >= 2) {
      const prev = data[1] as { no_dominante: No; created_at: string };
      const months = Math.max(
        1,
        Math.round((Date.now() - new Date(prev.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30))
      );
      previous = { no: prev.no_dominante, months };
    }
  }

  const eyebrow = payload!.nome
    ? t('eyebrowNamed', { nome: payload!.nome })
    : t('eyebrowUnnamed');

  const mirrorIntro =
    highCount === 0
      ? t('mirrorIntroNone')
      : highCount === 1
        ? t('mirrorIntroOne')
        : t('mirrorIntroSome', { n: String(highCount) });

  return (
    <div>
      {/* ============ REVEAL ============ */}
      <section className="px-6 md:px-10 pt-16 md:pt-24 pb-16 md:pb-20 text-center">
        <Vesica className="w-20 h-12 mx-auto text-gold mb-10 reveal reveal-1" />
        <div className="mini-caps mb-10 text-goldBright reveal reveal-1">{eyebrow}</div>
        <h1 className="font-serif text-goldBright leading-none">
          <span className="reveal-name block text-6xl md:text-8xl">{dominanteName}</span>
        </h1>
        <p className="font-body italic text-bone/85 text-xl md:text-2xl reveal reveal-3 leading-snug max-w-2xl mx-auto mt-12">
          {content.lead}
        </p>
      </section>

      {/* ============ DESCRIÇÃO ============ */}
      <FadeIn as="section" className="px-6 md:px-10 py-16 md:py-20">
        <div className="max-w-[40rem] mx-auto space-y-6 font-body text-bone text-lg md:text-xl leading-relaxed">
          {content.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </FadeIn>

      <Vesica className="w-20 h-12 mx-auto text-gold my-4" />

      {/* ============ A FRASE QUE DÓI ============ */}
      <FadeIn as="section" className="px-6 md:px-10 py-16 md:py-20 bg-coal/60">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mini-caps text-bordeaux mb-8">{t('fraseTitle')}</div>
          <p className="font-serif italic text-goldBright text-2xl md:text-3xl leading-snug">
            {content.fraseQueDoi}
          </p>
        </div>
      </FadeIn>

      <Vesica className="w-20 h-12 mx-auto text-gold my-4" />

      {/* ============ ESPELHO ============ */}
      <FadeIn as="section" className="px-6 md:px-10 py-16 md:py-20">
        <div className="max-w-[40rem] mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl text-bone mb-4">{t('mirrorTitle')}</h2>
          <p className="text-ash font-body mb-8 text-sm tracking-wide">{mirrorIntro}</p>
          <ul className="space-y-5">
            {dominanteAnswers.map((a) => {
              const strong = a.score >= 2;
              return (
                <li
                  key={a.qid}
                  className={
                    strong
                      ? 'border-l-2 border-goldBright pl-5 text-bone font-body italic text-lg md:text-xl leading-relaxed'
                      : 'border-l border-separator pl-5 text-bone/55 font-body italic text-lg md:text-xl leading-relaxed'
                  }
                >
                  {a.text}
                </li>
              );
            })}
          </ul>
        </div>
      </FadeIn>

      <Vesica className="w-20 h-12 mx-auto text-gold my-4" />

      {/* ============ FORÇA DO NÓ ============ */}
      <FadeIn as="section" className="px-6 md:px-10 py-16 md:py-20">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-serif text-2xl md:text-3xl text-bone mb-10 text-center">
            {t('forceTitle')}
          </h2>

          <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-8 gap-y-2 border-l-2 border-goldBright pl-6 pb-2 mb-8">
            <span className="font-serif text-3xl md:text-4xl text-goldBright">{dominanteName}</span>
            <span className="font-serif text-3xl md:text-4xl text-goldBright tabular-nums">
              {t('forceScore', { score: String(dominanteScore) })}
            </span>
          </div>

          {otherNos.length > 0 && (
            <div className="mt-6">
              <p className="text-ash text-sm tracking-wide mb-4 font-body">{t('forceOthers')}</p>
              <ul className="space-y-2">
                {otherNos.map((o) => (
                  <li key={o.no} className="flex items-baseline gap-4 font-body">
                    <span className="text-bone/70">{tNo(o.no)}</span>
                    <span className="flex-1 border-b border-dotted border-separator" />
                    <span className="text-ash text-sm tabular-nums">{o.score}/9</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {previous && (
            <p className="mt-10 font-body italic text-bone/70 leading-relaxed text-center">
              {t('history', {
                months: String(previous.months),
                previous: tNo(previous.no),
                current: dominanteName
              })}
            </p>
          )}
        </div>
      </FadeIn>

      <Vesica className="w-20 h-12 mx-auto text-gold my-4" />

      {/* ============ A TRAVESSIA ============ */}
      <FadeIn as="section" className="px-6 md:px-10 py-20 md:py-24 bg-coal/60">
        <div className="max-w-3xl mx-auto">
          <div className="mini-caps mb-6 text-goldBright text-center">{t('travessiaEyebrow')}</div>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-bone text-center leading-[1.2] mb-8 max-w-2xl mx-auto">
            {t('travessiaTitle')}
          </h2>
          <p className="font-body text-bone/85 text-lg leading-relaxed mb-12 max-w-2xl mx-auto text-center">
            {t('travessiaBody')}
          </p>

          {content.travessia && (
            <p className="font-body italic text-ash text-base leading-relaxed mb-12 max-w-xl mx-auto text-center">
              {content.travessia}
            </p>
          )}

          <ol className="space-y-7 mb-12 max-w-xl mx-auto">
            <li className="grid grid-cols-[10rem_1fr] gap-5 items-baseline">
              <div className="text-gold/80 font-serif text-sm tracking-widest uppercase">
                {t('travessiaStep1Label')}
              </div>
              <div className="font-body text-bone/80 leading-relaxed">
                {t('travessiaStep1Body')}
              </div>
            </li>
            <li className="grid grid-cols-[10rem_1fr] gap-5 items-baseline">
              <div className="text-goldBright font-serif text-sm tracking-widest uppercase">
                {t('travessiaStep2Label')}
              </div>
              <div className="font-body text-bone leading-relaxed">
                {t('travessiaStep2Body')}
              </div>
            </li>
            <li className="grid grid-cols-[10rem_1fr] gap-5 items-baseline">
              <div className="text-goldBright font-serif text-sm tracking-widest uppercase">
                {t('travessiaStep3Label')}
              </div>
              <div className="font-body text-bone leading-relaxed">
                {t('travessiaStep3Body')}
              </div>
            </li>
          </ol>

          <p className="font-body italic text-ash leading-relaxed text-center max-w-xl mx-auto">
            {t('travessiaRhythm')}
          </p>
        </div>
      </FadeIn>

      <Vesica className="w-20 h-12 mx-auto text-gold my-4" />

      {/* ============ OFERTA ============ */}
      <FadeIn as="section" className="px-6 md:px-10 py-20 md:py-24">
        <div className="max-w-xl mx-auto">
          {sellable ? (
            <div className="border border-separator bg-coal/40 p-8 md:p-10 text-center">
              <div className="mini-caps text-goldBright mb-6">{t('offerEyebrow')}</div>
              <div className="font-serif text-5xl md:text-6xl text-goldBright mb-4">
                {t('offerPrice')}
              </div>
              <p className="font-body italic text-bone/80 leading-relaxed mb-8 max-w-md mx-auto">
                {t('offerIncludes')}
              </p>
              <Link href={`/${locale}/checkout?no=${dominante}`} className="cta-living large">
                <span>{t('offerCta')}</span>
                <Arrow />
              </Link>
              <p className="mt-6 text-ash text-sm font-body italic">{t('offerFinePrint')}</p>
            </div>
          ) : (
            <div className="border border-separator bg-coal/40 p-8 md:p-10">
              <div className="mini-caps text-goldBright mb-4">{t('offerEyebrow')}</div>
              <h3 className="font-serif text-2xl md:text-3xl text-bone mb-5">
                {t('notReadyTitle')}
              </h3>
              <p className="font-body text-bone/80 leading-relaxed mb-7">
                {t('notReadyBody', { no: dominanteName })}
              </p>
              <NotifyForm locale={locale} no={dominante} email="" />
            </div>
          )}
        </div>
      </FadeIn>

      {/* ============ SECUNDÁRIO (eco) ============ */}
      {secundario && (
        <FadeIn as="section" className="px-6 md:px-10 py-12">
          <div className="max-w-prose mx-auto text-center">
            <div className="mini-caps text-ash mb-3">{t('secondaryTitle')}</div>
            <p className="font-body italic text-bone/70 leading-relaxed">
              {t('secondaryBody', { no: tNo(secundario) })}
            </p>
          </div>
        </FadeIn>
      )}

      <Vesica className="w-16 h-10 mx-auto text-gold/60 my-6" />

      {/* ============ SAÍDA ============ */}
      <FadeIn as="section" className="px-6 md:px-10 pb-16 text-center">
        <div className="max-w-xl mx-auto">
          <p className="font-body italic text-ash leading-relaxed mb-6">{t('or')}</p>
          <Link
            href={`/${locale}/diagnostico`}
            className="text-ash hover:text-goldBright underline-offset-4 hover:underline text-sm tracking-wide transition-colors"
          >
            {t('redo')}
          </Link>
        </div>
      </FadeIn>

      <div className="flex justify-center pt-8 pb-6">
        <EstrelaPersa className="w-12 h-12 text-goldBright" />
      </div>
    </div>
  );
}
