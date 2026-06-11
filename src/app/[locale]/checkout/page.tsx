import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { NOS, NOS_VENDAVEIS, type No } from '@/lib/diagnostic';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServer } from '@/lib/supabase/server';
import { trackEvent } from '@/lib/events';
import { PayPalCheckout } from '@/components/PayPalCheckout';
import { ListaEspera } from '@/components/ListaEspera';
import { SALES_OPEN } from '@/lib/flags';
import { Vesica } from '@/components/marks/Vesica';
import { EstrelaPersa } from '@/components/marks/EstrelaPersa';

type Tipo = 'tier1' | 'extra' | 'biblioteca';

export default async function CheckoutPage({
  params,
  searchParams
}: {
  params: { locale: string };
  searchParams: { no?: string; tipo?: string };
}) {
  const locale = params.locale as 'pt' | 'en';
  const no = searchParams.no as No | undefined;
  const tipo: Tipo = (searchParams.tipo === 'extra' || searchParams.tipo === 'biblioteca')
    ? searchParams.tipo
    : 'tier1';

  // Modo testes: vendas fechadas → lista de espera em vez de PayPal.
  if (!SALES_OPEN) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 md:px-10 py-24 text-center">
        <Vesica className="w-20 h-12 text-gold mb-8" />
        <div className="mini-caps text-goldBright mb-4">
          {locale === 'pt' ? 'EM PREPARAÇÃO' : 'COMING SOON'}
        </div>
        <h1 className="font-serif text-4xl md:text-5xl text-bone mb-6 max-w-xl">
          {locale === 'pt'
            ? 'A travessia ainda não está aberta.'
            : 'The crossing is not open yet.'}
        </h1>
        <p className="font-body italic text-bone/80 max-w-md mx-auto leading-relaxed mb-10">
          {locale === 'pt'
            ? 'Estou a afinar os últimos detalhes. Deixa o teu email e sou eu a avisar-te, em primeira mão, no momento em que abrir.'
            : 'I am tuning the last details. Leave your email and I will personally let you know the moment it opens.'}
        </p>
        <ListaEspera locale={locale} no={no ?? 'lista-espera'} />
        <EstrelaPersa className="w-10 h-10 text-goldBright mt-16" />
      </div>
    );
  }

  // tier1 e extra precisam de nó válido. biblioteca não.
  if (tipo !== 'biblioteca') {
    if (!no || !NOS.includes(no)) redirect(`/${locale}/diagnostico`);
    if (!NOS_VENDAVEIS.includes(no!)) redirect(`/${locale}/resultado`);
  }

  // Identidade da utilizadora: para tier1 vem do cookie do resultado;
  // para extra/biblioteca a utilizadora já está autenticada após Tier 1.
  let email: string | null = null;
  let userId: string | null = null;
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    email = user.email ?? null;
    userId = user.id;
  } else {
    const raw = cookies().get('synchim_result')?.value;
    if (raw) {
      const cookieData = JSON.parse(raw) as { user_id: string };
      userId = cookieData.user_id;
      const admin = createSupabaseAdmin();
      const { data: u } = await admin.from('users').select('email').eq('id', userId).maybeSingle();
      email = u?.email ?? null;
    }
  }
  if (!email || !userId) redirect(`/${locale}/diagnostico`);

  await trackEvent('checkout_iniciado', { userId, metadata: { no, tipo } });

  const t = await getTranslations({ locale: params.locale, namespace: 'checkout' });
  const tNo = await getTranslations({ locale: params.locale, namespace: 'no' });

  const usd = tipo === 'biblioteca'
    ? Number(process.env.PRICE_TIER2_USD ?? '87')
    : tipo === 'extra'
      ? Number(process.env.PRICE_UPGRADE_NO_USD ?? '19')
      : Number(process.env.PRICE_TIER1_USD ?? '39');

  const eyebrow = tipo === 'biblioteca'
    ? (locale === 'pt' ? 'A BIBLIOTECA COMPLETA' : 'THE FULL LIBRARY')
    : tipo === 'extra'
      ? (locale === 'pt' ? 'PRÓXIMO NÓ' : 'NEXT KNOT')
      : (locale === 'pt' ? 'A TRAVESSIA' : 'THE CROSSING');

  return (
    <div>
      <section className="px-6 md:px-10 pt-16 md:pt-24 pb-10 text-center">
        <Vesica className="w-20 h-12 mx-auto text-gold mb-8" />
        <div className="mini-caps text-goldBright mb-4">{eyebrow}</div>
        <h1 className="font-serif text-4xl md:text-5xl text-bone mb-6">{t('title')}</h1>
        <p className="font-body italic text-bone/80 max-w-xl mx-auto leading-relaxed">
          {t('summary')}
        </p>
      </section>

      <section className="px-6 md:px-10 py-12">
        <div className="max-w-xl mx-auto">
          <div className="border border-separator bg-coal/40 p-8 mb-10">
            {tipo === 'biblioteca' ? (
              <>
                <div className="mini-caps text-ash mb-2">
                  {locale === 'pt' ? 'BIBLIOTECA COMPLETA' : 'FULL LIBRARY'}
                </div>
                <div className="flex items-baseline justify-between mb-5">
                  <div className="font-serif text-2xl text-goldBright">
                    {locale === 'pt' ? '7 nós, vitalício' : '7 knots, lifetime'}
                  </div>
                  <div className="font-serif text-3xl text-bone">US$ {usd}</div>
                </div>
              </>
            ) : (
              <>
                <div className="mini-caps text-ash mb-2">
                  {tipo === 'extra'
                    ? (locale === 'pt' ? 'PRÓXIMO NÓ' : 'NEXT KNOT')
                    : (locale === 'pt' ? 'NÓ A ATRAVESSAR' : 'KNOT TO CROSS')}
                </div>
                <div className="flex items-baseline justify-between mb-5">
                  <div className="font-serif text-3xl text-goldBright">{tNo(no!)}</div>
                  <div className="font-serif text-3xl text-bone">US$ {usd}</div>
                </div>
              </>
            )}
            <div className="border-t border-separator pt-4 text-sm font-body">
              <span className="mini-caps text-ash mr-2">
                {locale === 'pt' ? 'CONTA' : 'ACCOUNT'}
              </span>
              <span className="text-bone/85 break-all">{email}</span>
            </div>
          </div>

          <PayPalCheckout
            no={tipo === 'biblioteca' ? '' : no!}
            tipo={tipo}
            email={email}
            locale={locale}
          />
        </div>
      </section>

      <div className="flex justify-center py-10">
        <EstrelaPersa className="w-10 h-10 text-goldBright" />
      </div>
    </div>
  );
}
