import { getCommonSession } from '@/lib/content';
import { SessionMarkdown } from '@/components/SessionMarkdown';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
export default async function DiagnosticEntry({ params }: { params: { locale: string } }) {
  const locale = params.locale as 'pt' | 'en';
  const s1 = await getCommonSession(locale, 1);
  const t = await getTranslations('diagnostic');

  return (
    <div className="px-6 md:px-10 py-16">
      {s1 && <SessionMarkdown source={s1.content} />}
      <div className="max-w-prose mx-auto mt-12 text-center">
        <Link href={`/${locale}/diagnostico/perguntas`} className="btn btn-primary">
          {t('start')}
        </Link>
      </div>
    </div>
  );
}
