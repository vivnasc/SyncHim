import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CookieConsent } from '@/components/CookieConsent';
import { AppTabBar } from '@/components/AppTabBar';
import { createSupabaseServer } from '@/lib/supabase/server';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  if (!locales.includes(params.locale as 'pt' | 'en')) return {};
  const t = await getTranslations({ locale: params.locale, namespace: 'meta' });
  return {
    title: t('title'),
    description: t('description')
  };
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(params.locale as 'pt' | 'en')) notFound();
  setRequestLocale(params.locale);
  const messages = await getMessages();

  let userPresent = false;
  try {
    const { data } = await createSupabaseServer().auth.getUser();
    userPresent = !!data.user;
  } catch { /* */ }

  return (
    <NextIntlClientProvider locale={params.locale} messages={messages}>
      <Header />
      <main data-page className="flex-1">{children}</main>
      <Footer />
      <AppTabBar locale={params.locale as 'pt' | 'en'} userPresent={userPresent} />
      <CookieConsent />
    </NextIntlClientProvider>
  );
}
