'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

/**
 * Navegação inferior estilo app nativo. Só fica visível quando a PWA
 * corre instalada (display-mode: standalone) — controlado por CSS em
 * globals.css. No browser normal está escondida e o site usa o Header.
 */
export function AppTabBar({ locale, userPresent }: { locale: 'pt' | 'en'; userPresent: boolean }) {
  const t = useTranslations('nav');
  const pathname = usePathname() || '';
  const seg = pathname.replace(`/${locale}`, '') || '/';

  const items = [
    {
      href: `/${locale}/dashboard`,
      label: t('home'),
      active: seg === '/' || seg.startsWith('/dashboard'),
      icon: (
        <path d="M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
      )
    },
    {
      href: `/${locale}/diagnostico`,
      label: t('diagnostic'),
      active: seg.startsWith('/diagnostico') || seg.startsWith('/resultado'),
      icon: (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="m14.8 9.2-2 4.2-4 1.8 2-4.2z" />
        </>
      )
    },
    {
      href: userPresent ? `/${locale}/conta` : `/${locale}/login`,
      label: t('account'),
      active: seg.startsWith('/conta') || seg.startsWith('/login'),
      icon: (
        <>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
        </>
      )
    }
  ];

  return (
    <nav className="app-tabbar" aria-label="App">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          className={`app-tab${it.active ? ' is-active' : ''}`}
          aria-current={it.active ? 'page' : undefined}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            {it.icon}
          </svg>
          <span>{it.label}</span>
        </Link>
      ))}
    </nav>
  );
}
