import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';

export async function Footer() {
  const locale = await getLocale();
  const t = await getTranslations('footer');
  return (
    <footer className="mt-32 py-10 px-6 md:px-10 border-t border-ash/20 text-ash text-sm">
      <div className="max-w-prose mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-5">
          <Link href={`/${locale}/termos`}>{t('terms')}</Link>
          <Link href={`/${locale}/privacidade`}>{t('privacy')}</Link>
          <Link href={`/${locale}/garantia`}>{t('guarantee')}</Link>
        </div>
        <div className="font-serif text-bone">— {t('signature')}</div>
      </div>
    </footer>
  );
}
