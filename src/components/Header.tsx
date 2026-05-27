import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { LocaleSwitcher } from './LocaleSwitcher';
import { createSupabaseServer } from '@/lib/supabase/server';
import { SignOutButton } from './SignOutButton';
import { EstrelaPersa } from './marks/EstrelaPersa';

export async function Header() {
  const locale = await getLocale();
  const t = await getTranslations({ locale: locale, namespace: 'nav' });
  const supabase = createSupabaseServer();
  let userPresent = false;
  try {
    const { data } = await supabase.auth.getUser();
    userPresent = !!data.user;
  } catch { /* */ }

  return (
    <header className="flex items-center justify-between py-6 px-6 md:px-10 border-b border-ash/20">
      <Link
        href={`/${locale}`}
        className="flex items-center gap-3 font-serif text-2xl tracking-wider text-bone hover:text-bone"
      >
        <EstrelaPersa className="w-10 h-10 text-goldBright" strokeWidth={1.2} />
        <span>SyncHim<span className="text-gold">.</span></span>
      </Link>
      <nav className="flex items-center gap-6 text-sm">
        {userPresent ? (
          <>
            <Link href={`/${locale}/dashboard`} className="text-ash hover:text-bone">{t('diagnostic')}</Link>
            <Link href={`/${locale}/conta`} className="text-ash hover:text-bone">{t('account')}</Link>
            <SignOutButton label={t('logout')} />
          </>
        ) : (
          <Link href={`/${locale}/login`} className="text-ash hover:text-bone">{t('enter')}</Link>
        )}
        <LocaleSwitcher />
      </nav>
    </header>
  );
}
