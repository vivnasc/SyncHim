import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { NOS, type No } from '@/lib/diagnostic';
import { getSession } from '@/lib/content';
import { expandDynamic } from '@/lib/session-dynamic';
import { PROXIMO_NO, precoExtra, precoBiblioteca } from '@/lib/upsell';
import { SessionMarkdown } from '@/components/SessionMarkdown';
import { UpsellSessao7 } from '@/components/UpsellSessao7';
import { CompleteSessionButton } from '@/components/CompleteSessionButton';
import { trackEvent } from '@/lib/events';
import { Vesica } from '@/components/marks/Vesica';
import { EstrelaPersa } from '@/components/marks/EstrelaPersa';
import { PresencaVivianne } from '@/components/PresencaVivianne';

export default async function SessionPage({
  params,
  searchParams
}: {
  params: { locale: string; n: string };
  searchParams: { no?: string };
}) {
  const locale = params.locale as 'pt' | 'en';
  const nNum = Number(params.n);
  if (!Number.isInteger(nNum) || nNum < 1 || nNum > 7) notFound();

  const t = await getTranslations({ locale: params.locale, namespace: 'session' });
  const tSession = await getTranslations({ locale: params.locale, namespace: 'dashboard' });
  const tNo = await getTranslations({ locale: params.locale, namespace: 'no' });

  if (nNum === 2) redirect(`/${locale}/diagnostico/perguntas`);

  if (nNum === 1) {
    const session = await getSession(locale, 'fome', 1);
    return (
      <div>
        <section className="px-6 md:px-10 pt-16 md:pt-24 pb-8 text-center">
          <Vesica className="w-20 h-12 mx-auto text-gold mb-8" />
          <div className="mini-caps text-goldBright">
            {tSession('sessionLabel', { n: '1' })}
          </div>
        </section>
        <section className="px-6 md:px-10 pb-10">
          <PresencaVivianne sessao={1} locale={locale} />
        </section>
        <section className="px-6 md:px-10 pb-16">
          {session && (
            <div className="max-w-[40rem] mx-auto">
              <SessionMarkdown source={session.content} />
            </div>
          )}
        </section>
        <div className="flex justify-center py-10">
          <EstrelaPersa className="w-10 h-10 text-goldBright" />
        </div>
      </div>
    );
  }

  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const no = searchParams.no as No | undefined;
  if (!no || !NOS.includes(no)) redirect(`/${locale}/dashboard`);

  const admin = createSupabaseAdmin();

  const { data: hasAccess } = await admin.rpc('tem_acesso_no', {
    p_user_id: user.id,
    p_no: no
  });
  if (!hasAccess) redirect(`/${locale}/dashboard`);

  const { data: unlocked } = await admin.rpc('sessao_desbloqueada', {
    p_user_id: user.id,
    p_no: no,
    p_sessao: nNum
  });
  if (!unlocked) redirect(`/${locale}/dashboard`);

  await admin.from('progresso').upsert({
    user_id: user.id,
    no,
    sessao_numero: nNum,
    iniciada_em: new Date().toISOString()
  }, { onConflict: 'user_id,no,sessao_numero' });

  await trackEvent('sessao_iniciada', { userId: user.id, metadata: { no, sessao: nNum } });

  // Conteúdo Tier 1 varia por target (casada | solteira).
  const { data: profile } = await admin
    .from('users')
    .select('target')
    .eq('id', user.id)
    .maybeSingle();
  const target = (profile?.target === 'solteira' ? 'solteira' : 'casada') as 'casada' | 'solteira';

  const session = await getSession(locale, no, nNum, target);
  if (!session) notFound();

  // Sessão 7: expande [Mostrar ...] com as respostas guardadas da utilizadora.
  const renderedContent = nNum === 7
    ? await expandDynamic(session.content, user.id, no)
    : session.content;

  const { data: progressRow } = await admin
    .from('progresso')
    .select('completada_em')
    .eq('user_id', user.id)
    .eq('no', no)
    .eq('sessao_numero', nNum)
    .maybeSingle();

  // Para a sessão 7, lemos o tier da utilizadora, define qual upsell mostrar.
  let userTier = 1;
  if (nNum === 7) {
    const { data: u } = await admin.from('users').select('tier').eq('id', user.id).maybeSingle();
    userTier = (u?.tier as number | undefined) ?? 1;
  }

  return (
    <div>
      <section className="px-6 md:px-10 pt-16 md:pt-24 pb-8 text-center">
        <Vesica className="w-20 h-12 mx-auto text-gold mb-8" />
        <div className="mini-caps text-goldBright mb-3">
          {tNo(no)} · {tSession('sessionLabel', { n: String(nNum) })}
        </div>
      </section>

      <section className="px-6 md:px-10 pb-10">
        <PresencaVivianne sessao={nNum} locale={locale} />
      </section>

      <section className="px-6 md:px-10 pb-16">
        <div className="max-w-[40rem] mx-auto">
          <SessionMarkdown source={renderedContent} />
        </div>
      </section>

      <section className="px-6 md:px-10 py-10 border-t border-separator">
        <div className="max-w-[40rem] mx-auto flex items-center justify-between gap-6">
          {progressRow?.completada_em ? (
            <span className="mini-caps text-goldBright">{t('completed')}</span>
          ) : (
            <CompleteSessionButton locale={locale} no={no} sessao={nNum} />
          )}
        </div>
      </section>

      {nNum === 7 && (
        <section className="px-6 md:px-10 py-10 border-t border-separator">
          <UpsellSessao7
            locale={locale}
            noActual={no}
            proximo={PROXIMO_NO[no]}
            tier={userTier}
            upgradeNoUsd={precoExtra().usd}
            upgradeNoBrl={precoExtra().brl}
            bibliotecaDiffUsd={precoBiblioteca().diff_usd}
            bibliotecaDiffBrl={precoBiblioteca().diff_brl}
          />
        </section>
      )}

      <div className="flex justify-center py-10">
        <EstrelaPersa className="w-10 h-10 text-goldBright" />
      </div>
    </div>
  );
}
