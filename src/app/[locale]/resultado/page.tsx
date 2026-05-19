import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import {
  NOS,
  NOS_VENDAVEIS,
  QUESTIONS_PER_NO,
  QUESTIONS_PT,
  QUESTIONS_EN,
  type No
} from '@/lib/diagnostic';
import { noContent } from '@/lib/no-content';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { trackEvent } from '@/lib/events';
import { NotifyForm } from '@/components/NotifyForm';

export const runtime = 'edge';

interface ResultCookie {
  user_id: string;
  nome: string | null;
  dominante: No;
  secundario: No | null;
  pontuacoes: Record<No, number>;
  respostas_dominante: Record<string, 0 | 1 | 2 | 3>;
  is_repeat: boolean;
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

  const t = await getTranslations('result');
  const tNo = await getTranslations('no');
  const dominante = payload!.dominante;
  const secundario = payload!.secundario;
  const sellable = NOS_VENDAVEIS.includes(dominante);
  const content = noContent(locale, dominante);
  const dominanteScore = payload!.pontuacoes[dominante];
  const dominanteName = tNo(dominante);
  const qMap = locale === 'pt' ? QUESTIONS_PT : QUESTIONS_EN;
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
    <div className="px-6 md:px-10 py-24 md:py-32">
      <article className="max-w-reading mx-auto">

        {/* PRE-REVEAL */}
        <section className="reveal reveal-1">
          <div className="text-ash uppercase tracking-widest text-xs mb-6">
            {t('preEyebrow')}
          </div>
          <p className="font-body text-bone/85 text-lg leading-relaxed italic">
            {t('preBody')}
          </p>
        </section>

        <div className="divider-glyph reveal reveal-2"><span>·</span></div>

        {/* REVEAL */}
        <section className="text-center my-2">
          <div className="text-ash uppercase tracking-widest text-xs mb-8 reveal reveal-2">
            {eyebrow}
          </div>
          <h1 className="font-serif text-gold leading-none mb-8">
            <span className="reveal-name text-6xl md:text-7xl">
              {dominanteName}
            </span>
          </h1>
          <p className="font-body italic text-bone/85 text-xl md:text-2xl reveal reveal-3 leading-snug max-w-prose mx-auto">
            {content.essence}
          </p>
        </section>

        <div className="divider-glyph"><span>·</span></div>

        {/* MIRROR */}
        <section>
          <h2 className="font-serif text-3xl md:text-4xl mb-4">{t('mirrorTitle')}</h2>
          <p className="text-ash font-body mb-7 text-sm tracking-wide">{mirrorIntro}</p>
          <ul className="space-y-5">
            {dominanteAnswers.map((a) => {
              const strong = a.score >= 2;
              return (
                <li
                  key={a.qid}
                  className={
                    strong
                      ? 'border-l-2 border-gold pl-5 text-bone font-body italic text-lg leading-relaxed'
                      : 'border-l border-ash/30 pl-5 text-bone/55 font-body italic text-lg leading-relaxed'
                  }
                >
                  {a.text}
                </li>
              );
            })}
          </ul>
        </section>

        <div className="divider-glyph"><span>·</span></div>

        {/* ORIGEM */}
        <section>
          <h2 className="font-serif text-2xl md:text-3xl text-bone/90 mb-5">{t('origemTitle')}</h2>
          {content.origem.split('\n\n').map((p, i) => (
            <p key={i} className="font-body text-bone/85 text-lg leading-relaxed mb-5">
              {p}
            </p>
          ))}
        </section>

        {/* CUSTO (only when present) */}
        {content.custo && (
          <>
            <div className="divider-glyph"><span>·</span></div>
            <section>
              <h2 className="font-serif text-2xl md:text-3xl text-bordeaux mb-5">
                {t('custoTitle')}
              </h2>
              {content.custo.split('\n\n').map((p, i) => (
                <p key={i} className="font-body text-bone/85 text-lg leading-relaxed mb-5">
                  {p}
                </p>
              ))}
            </section>
          </>
        )}

        <div className="divider-glyph"><span>·</span></div>

        {/* FORCE — score conviction */}
        <section>
          <h2 className="font-serif text-2xl md:text-3xl mb-7">{t('forceTitle')}</h2>
          <div className="border-l-2 border-gold pl-6">
            <div className="font-serif text-3xl md:text-4xl text-gold leading-none mb-2">
              {dominanteName}
            </div>
            <div className="text-ash text-sm tracking-widest uppercase">
              {t('forceScore', { score: String(dominanteScore) })}
            </div>
          </div>

          {otherNos.length > 0 && (
            <div className="mt-10">
              <p className="text-ash text-sm tracking-wide mb-4 font-body">{t('forceOthers')}</p>
              <ul className="space-y-2">
                {otherNos.map((o) => (
                  <li key={o.no} className="flex items-baseline gap-4 font-body">
                    <span className="text-bone/70">{tNo(o.no)}</span>
                    <span className="flex-1 border-b border-dotted border-ash/25" />
                    <span className="text-ash text-sm tabular-nums">{o.score}/9</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {previous && (
            <p className="mt-10 font-body italic text-bone/70 leading-relaxed">
              {t('history', {
                months: String(previous.months),
                previous: tNo(previous.no),
                current: dominanteName
              })}
            </p>
          )}
        </section>

        <div className="divider-glyph"><span>·</span></div>

        {/* TRAVESSIA */}
        <section>
          <h2 className="font-serif text-3xl md:text-4xl mb-8">{t('travessiaTitle')}</h2>

          {content.travessia && (
            <p className="font-body text-bone/85 text-lg leading-relaxed mb-10">
              {content.travessia}
            </p>
          )}

          <ol className="space-y-7 mb-10">
            <li className="grid grid-cols-[8rem_1fr] gap-5 items-baseline">
              <div className="text-gold/90 font-serif text-sm tracking-widest uppercase">
                {t('travessiaStep1Label')}
              </div>
              <div className="font-body text-bone/85 leading-relaxed">
                {t('travessiaStep1Body')}
              </div>
            </li>
            <li className="grid grid-cols-[8rem_1fr] gap-5 items-baseline">
              <div className="text-gold font-serif text-sm tracking-widest uppercase">
                {t('travessiaStep2Label')}
              </div>
              <div className="font-body text-bone leading-relaxed">
                {t('travessiaStep2Body')}
              </div>
            </li>
            <li className="grid grid-cols-[8rem_1fr] gap-5 items-baseline">
              <div className="text-gold font-serif text-sm tracking-widest uppercase">
                {t('travessiaStep3Label')}
              </div>
              <div className="font-body text-bone leading-relaxed">
                {t('travessiaStep3Body')}
              </div>
            </li>
          </ol>

          <p className="font-body italic text-ash leading-relaxed mb-12">
            {t('travessiaRhythm')}
          </p>

          {sellable ? (
            <div className="border-t border-ash/25 pt-10">
              <div className="flex items-baseline gap-4 mb-6">
                <div className="font-serif text-3xl md:text-4xl text-bone">{t('offerPrice')}</div>
              </div>
              <Link
                href={`/${locale}/checkout?no=${dominante}`}
                className="btn btn-primary inline-block"
              >
                {t('offerCta')}
              </Link>
              <p className="mt-5 text-ash text-sm font-body italic">{t('offerFinePrint')}</p>
            </div>
          ) : (
            <div className="border border-ash/30 px-6 py-7 mt-6">
              <h3 className="font-serif text-xl mb-3">{t('notReadyTitle')}</h3>
              <p className="font-body text-bone/80 leading-relaxed mb-6">
                {t('notReadyBody', { no: dominanteName })}
              </p>
              <NotifyForm locale={locale} no={dominante} email="" />
            </div>
          )}
        </section>

        {/* SECONDARY */}
        {secundario && (
          <>
            <div className="divider-glyph"><span>·</span></div>
            <section>
              <h3 className="font-serif text-xl text-bone/85 mb-3">{t('secondaryTitle')}</h3>
              <p className="font-body text-bone/70 italic leading-relaxed">
                {t('secondaryBody', { no: tNo(secundario) })}
              </p>
            </section>
          </>
        )}

        <div className="divider-glyph"><span>·</span></div>

        {/* EXIT */}
        <section className="text-center">
          <p className="font-body italic text-ash leading-relaxed mb-5">{t('or')}</p>
          <Link
            href={`/${locale}/diagnostico`}
            className="text-ash hover:text-bone underline-offset-4 hover:underline text-sm tracking-wide"
          >
            {t('redo')}
          </Link>
        </section>

      </article>
    </div>
  );
}
