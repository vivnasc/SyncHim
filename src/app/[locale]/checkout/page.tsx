import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { NOS, NOS_VENDAVEIS, type No } from '@/lib/diagnostic';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { trackEvent } from '@/lib/events';
import { PayPalCheckout } from '@/components/PayPalCheckout';
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

  const t = await getTranslations('checkout');
  const tNo = await getTranslations('no');

  return (
    <div className="px-6 md:px-10 py-20">
      <div className="max-w-prose mx-auto">
        <h1 className="font-serif text-5xl mb-3">{t('title')}</h1>
        <p className="font-body text-bone/80 mb-10">{t('summary')}</p>

        <div className="border border-ash/30 p-6 mb-10">
          <div className="flex items-baseline justify-between mb-2">
            <div className="font-serif text-2xl">{tNo(no!)}</div>
            <div className="font-serif text-2xl text-gold">{t('price')}</div>
          </div>
          <p className="text-ash text-sm">{user.email}</p>
        </div>

        <PayPalCheckout no={no!} email={user.email} locale={locale} />
      </div>
    </div>
  );
}
