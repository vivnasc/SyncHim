import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './src/i18n';

const PT_COUNTRIES = new Set(['BR', 'PT', 'MZ', 'AO', 'CV', 'GW', 'ST', 'TL']);

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

  const hasLocale = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );

  if (!hasLocale && pathname === '/') {
    const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
    const country = request.headers.get('cf-ipcountry') ?? '';
    const inferred = PT_COUNTRIES.has(country.toUpperCase()) ? 'pt' : 'en';
    const target = (cookieLocale && (locales as readonly string[]).includes(cookieLocale))
      ? cookieLocale
      : inferred;

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
  matcher: ['/((?!api|admin|_next|_vercel|favicon.ico|robots.txt|.*\\..*).*)']
};
