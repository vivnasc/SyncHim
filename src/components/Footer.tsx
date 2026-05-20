import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { EstrelaPersa } from './marks/EstrelaPersa';

export async function Footer() {
  const locale = await getLocale();
  const t = await getTranslations({ locale: locale, namespace: 'footer' });
  return (
    <footer className="mt-32 px-6 md:px-10 text-ash text-sm">
      <div className="max-w-prose mx-auto flex flex-col items-center gap-5 pt-12 border-t border-separator">
        <EstrelaPersa className="w-8 h-8 text-goldBright mt-4" />
        <div className="font-serif text-bone text-base">{t('signature')}</div>
        <div className="flex gap-5 mt-2 mb-4">
          <Link href={`/${locale}/termos`}>{t('terms')}</Link>
          <Link href={`/${locale}/privacidade`}>{t('privacy')}</Link>
          <Link href={`/${locale}/garantia`}>{t('guarantee')}</Link>
        </div>
      </div>
    </footer>
  );
}
