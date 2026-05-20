import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { DeleteAccountForm } from '@/components/DeleteAccountForm';
import { Vesica } from '@/components/marks/Vesica';
import { EstrelaPersa } from '@/components/marks/EstrelaPersa';

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
    <div>
      <section className="px-6 md:px-10 pt-16 md:pt-24 pb-10 text-center">
        <Vesica className="w-20 h-12 mx-auto text-gold mb-8" />
        <div className="mini-caps text-goldBright mb-4">
          {locale === 'pt' ? 'A TUA CONTA' : 'YOUR ACCOUNT'}
        </div>
        <h1 className="font-serif text-4xl md:text-5xl text-bone">{t('title')}</h1>
      </section>

      <section className="px-6 md:px-10 pb-12">
        <div className="max-w-xl mx-auto">
          <dl className="font-body">
            <div className="grid grid-cols-[8rem_1fr] items-baseline border-b border-separator py-4">
              <dt className="mini-caps text-ash">{t('email')}</dt>
              <dd className="text-bone break-all">{u?.email ?? user.email}</dd>
            </div>
            <div className="grid grid-cols-[8rem_1fr] items-baseline border-b border-separator py-4">
              <dt className="mini-caps text-ash">{t('tier')}</dt>
              <dd className="text-bone">{tierLabel}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="px-6 md:px-10 py-12 bg-coal/40">
        <div className="max-w-xl mx-auto">
          <h2 className="font-serif text-2xl md:text-3xl text-bone mb-6">{t('historyTitle')}</h2>
          {!diag || diag.length === 0 ? (
            <p className="font-body italic text-ash">{t('noHistory')}</p>
          ) : (
            <ul className="font-body">
              {diag.map((d) => (
                <li
                  key={d.created_at}
                  className="grid grid-cols-[8rem_1fr] items-baseline border-b border-separator py-3"
                >
                  <span className="mini-caps text-ash">
                    {new Date(d.created_at).toLocaleDateString(
                      locale === 'pt' ? 'pt-PT' : 'en-GB'
                    )}
                  </span>
                  <span className="text-goldBright font-serif text-lg">
                    {tNo(d.no_dominante as 'fome')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="px-6 md:px-10 py-16 border-t border-separator mt-8">
        <div className="max-w-xl mx-auto">
          <div className="mini-caps text-bordeaux mb-3">
            {locale === 'pt' ? 'IRREVERSÍVEL' : 'IRREVERSIBLE'}
          </div>
          <h2 className="font-serif text-2xl md:text-3xl text-bone mb-4">{t('deleteTitle')}</h2>
          <p className="font-body text-bone/80 leading-relaxed mb-6">{t('deleteBody')}</p>
          <DeleteAccountForm locale={locale} />
        </div>
      </section>

      <div className="flex justify-center py-10">
        <EstrelaPersa className="w-10 h-10 text-goldBright" />
      </div>
    </div>
  );
}
