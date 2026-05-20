import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { NOS, NOS_VENDAVEIS, type No } from '@/lib/diagnostic';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { trackEvent } from '@/lib/events';
import { PayPalCheckout } from '@/components/PayPalCheckout';
import { Vesica } from '@/components/marks/Vesica';
import { EstrelaPersa } from '@/components/marks/EstrelaPersa';

export default async function CheckoutPage({
  params,
  searchParams
}: {
  params: { locale: string };
  searchParams: { no?: string };
}) {
  const locale = params.locale as 'pt' | 'en';
  const no = searchParams.no as No | undefined;

  if (!no || !NOS.includes(no)) redirect(`/${locale}/diagnostico`);
  if (!NOS_VENDAVEIS.includes(no!)) redirect(`/${locale}/resultado`);

  const raw = cookies().get('synchim_result')?.value;
  if (!raw) redirect(`/${locale}/diagnostico`);
  const cookieData = JSON.parse(raw) as { user_id: string };

  const admin = createSupabaseAdmin();
  const { data: user } = await admin
    .from('users')
    .select('email')
    .eq('id', cookieData.user_id)
    .maybeSingle();

  if (!user?.email) redirect(`/${locale}/diagnostico`);

  await trackEvent('checkout_iniciado', { userId: cookieData.user_id, metadata: { no } });

  const t = await getTranslations({ locale: params.locale, namespace: 'checkout' });
  const tNo = await getTranslations({ locale: params.locale, namespace: 'no' });

  return (
    <div>
      <section className="px-6 md:px-10 pt-16 md:pt-24 pb-10 text-center">
        <Vesica className="w-20 h-12 mx-auto text-gold mb-8" />
        <div className="mini-caps text-goldBright mb-4">
          {locale === 'pt' ? 'A TRAVESSIA' : 'THE CROSSING'}
        </div>
        <h1 className="font-serif text-4xl md:text-5xl text-bone mb-6">{t('title')}</h1>
        <p className="font-body italic text-bone/80 max-w-xl mx-auto leading-relaxed">
          {t('summary')}
        </p>
      </section>

      <section className="px-6 md:px-10 py-12">
        <div className="max-w-xl mx-auto">
          <div className="border border-separator bg-coal/40 p-8 mb-10">
            <div className="mini-caps text-ash mb-2">
              {locale === 'pt' ? 'NÓ A ATRAVESSAR' : 'KNOT TO CROSS'}
            </div>
            <div className="flex items-baseline justify-between mb-5">
              <div className="font-serif text-3xl text-goldBright">{tNo(no!)}</div>
              <div className="font-serif text-3xl text-bone">{t('price')}</div>
            </div>
            <div className="border-t border-separator pt-4 text-sm font-body">
              <span className="mini-caps text-ash mr-2">
                {locale === 'pt' ? 'CONTA' : 'ACCOUNT'}
              </span>
              <span className="text-bone/85 break-all">{user.email}</span>
            </div>
          </div>

          <PayPalCheckout no={no!} email={user.email} locale={locale} />
        </div>
      </section>

      <div className="flex justify-center py-10">
        <EstrelaPersa className="w-10 h-10 text-goldBright" />
      </div>
    </div>
  );
}
