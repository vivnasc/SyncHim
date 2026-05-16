'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

export function LocaleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  function switchTo(target: 'pt' | 'en') {
    if (target === locale) return;
    const segments = pathname.split('/').filter(Boolean);
    segments[0] = target;
    document.cookie = `NEXT_LOCALE=${target}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    router.push(`/${segments.join('/')}`);
  }

  return (
    <div className="flex gap-3 text-sm tracking-widest uppercase">
      <button
        onClick={() => switchTo('pt')}
        className={locale === 'pt' ? 'text-bone' : 'text-ash hover:text-bone'}
      >PT</button>
      <span className="text-ash">·</span>
      <button
        onClick={() => switchTo('en')}
        className={locale === 'en' ? 'text-bone' : 'text-ash hover:text-bone'}
      >EN</button>
    </div>
  );
}
