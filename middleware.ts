import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './src/i18n';

const intlMiddleware = createMiddleware({
  locales: [...locales],
  defaultLocale,
  localePrefix: 'always',
  localeDetection: false
});

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /admin é não-i18n. Deixa passar.
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return NextResponse.next();
  }
  // /offline é a fallback page do service worker, sem locale prefix.
  if (pathname === '/offline') {
    return NextResponse.next();
  }

  const hasLocale = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );

  if (!hasLocale && pathname === '/') {
    // PT é o default global. EN só se a utilizadora tiver escolhido
    // explicitamente via LocaleSwitcher (cookie NEXT_LOCALE).
    const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
    const target = (cookieLocale && (locales as readonly string[]).includes(cookieLocale))
      ? cookieLocale
      : defaultLocale;

    const url = request.nextUrl.clone();
    url.pathname = `/${target}`;
    const res = NextResponse.redirect(url);
    res.cookies.set('NEXT_LOCALE', target, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax'
    });
    return res;
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|admin|offline|_next|_vercel|favicon.ico|robots.txt|sw.js|manifest.webmanifest|.*\\..*).*)']
};
