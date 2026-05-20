import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { DeleteAccountForm } from '@/components/DeleteAccountForm';
export default async function AccountPage({ params }: { params: { locale: string } }) {
  const locale = params.locale as 'pt' | 'en';
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const admin = createSupabaseAdmin();
  const { data: u } = await admin
    .from('users')
    .select('email, tier, no_comprado')
    .eq('id', user.id)
    .maybeSingle();
  const { data: diag } = await admin
    .from('diagnosticos')
    .select('created_at, no_dominante')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const t = await getTranslations({ locale: params.locale, namespace: 'account' });
  const tNo = await getTranslations({ locale: params.locale, namespace: 'no' });

  const tierLabel =
    u?.tier === 2 ? t('tier2') :
    u?.tier === 1 ? t('tier1', { no: u.no_comprado ? tNo(u.no_comprado as 'fome') : '' }) :
    t('tier0');

  return (
    <div className="px-6 md:px-10 py-16">
      <div className="max-w-prose mx-auto">
        <h1 className="font-serif text-4xl mb-10">{t('title')}</h1>

        <dl className="space-y-3 text-bone font-body">
          <div className="flex justify-between border-b border-ash/20 pb-3">
            <dt className="text-ash">{t('email')}</dt>
            <dd>{u?.email ?? user.email}</dd>
          </div>
          <div className="flex justify-between border-b border-ash/20 pb-3">
            <dt className="text-ash">{t('tier')}</dt>
            <dd>{tierLabel}</dd>
          </div>
        </dl>

        <section className="mt-14">
          <h2 className="font-serif text-2xl mb-5">{t('historyTitle')}</h2>
          {!diag || diag.length === 0 ? (
            <p className="text-ash">{t('noHistory')}</p>
          ) : (
            <ul className="space-y-2 font-body">
              {diag.map((d) => (
                <li key={d.created_at} className="flex justify-between border-b border-ash/10 py-2">
                  <span className="text-ash">{new Date(d.created_at).toLocaleDateString(locale === 'pt' ? 'pt-PT' : 'en-GB')}</span>
                  <span className="text-bone">{tNo(d.no_dominante as 'fome')}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-16 border-t border-ash/20 pt-10">
          <h2 className="font-serif text-2xl mb-3">{t('deleteTitle')}</h2>
          <p className="text-bone/80 mb-6">{t('deleteBody')}</p>
          <DeleteAccountForm locale={locale} />
        </section>
      </div>
    </div>
  );
}
