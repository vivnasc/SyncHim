import { getCommonSession } from '@/lib/content';
import { SessionMarkdown } from '@/components/SessionMarkdown';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Vesica } from '@/components/marks/Vesica';
import { EstrelaPersa } from '@/components/marks/EstrelaPersa';
import { FadeIn } from '@/components/FadeIn';
import { PresencaVivianne } from '@/components/PresencaVivianne';

export default async function DiagnosticEntry({
  params,
  searchParams
}: {
  params: { locale: string };
  searchParams?: { for?: string };
}) {
  const locale = params.locale as 'pt' | 'en';
  const s1 = await getCommonSession(locale, 1);
  const t = await getTranslations({ locale: params.locale, namespace: 'diagnostic' });
  const tCommon = await getTranslations({ locale: params.locale, namespace: 'common' });
  const targetParam = searchParams?.for === 'solteira' || searchParams?.for === 'casada' ? searchParams.for : null;
  const startHref = targetParam
    ? `/${locale}/diagnostico/perguntas?for=${targetParam}`
    : `/${locale}/diagnostico/perguntas`;

  return (
    <div>
      <section className="px-6 md:px-10 pt-16 md:pt-24 pb-10 text-center">
        <Vesica className="w-20 h-12 mx-auto text-gold mb-8" />
        <div className="mini-caps text-goldBright mb-4">
          {locale === 'pt' ? 'SESSÃO ZERO · GRÁTIS' : 'SESSION ZERO · FREE'}
        </div>
      </section>

      <section className="px-6 md:px-10 pb-10">
        <PresencaVivianne sessao={2} locale={locale} />
      </section>

      <FadeIn as="section" className="px-6 md:px-10 pb-16">
        {s1 && (
          <div className="max-w-[40rem] mx-auto">
            <SessionMarkdown source={s1.content} />
          </div>
        )}
      </FadeIn>

      <FadeIn as="section" className="px-6 md:px-10 pb-24 text-center">
        <Link href={startHref} className="cta-living large">
          <span>{t('start')}</span>
          <span className="arrow" aria-hidden="true">→</span>
        </Link>
        <p className="text-ash italic font-body text-sm mt-6">
          {locale === 'pt'
            ? '21 perguntas. 8 minutos. Só tu vês as respostas.'
            : '21 questions. 8 minutes. Only you see the answers.'}
        </p>
      </FadeIn>

      <div className="flex justify-center pb-8">
        <EstrelaPersa className="w-10 h-10 text-goldBright" />
      </div>
    </div>
  );
}
