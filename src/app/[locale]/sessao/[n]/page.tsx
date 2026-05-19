import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { NOS, type No } from '@/lib/diagnostic';
import { getSession } from '@/lib/content';
import { SessionMarkdown } from '@/components/SessionMarkdown';
import { CompleteSessionButton } from '@/components/CompleteSessionButton';
import { trackEvent } from '@/lib/events';

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

  const t = await getTranslations('session');
  const tNo = await getTranslations('no');

  // Session 2 is the diagnostic — redirect into the form.
  if (nNum === 2) redirect(`/${locale}/diagnostico/perguntas`);

  // Session 1 is recognition, public.
  if (nNum === 1) {
    const session = await getSession(locale, 'fome', 1);
    return (
      <div className="px-6 md:px-10 py-16">
        {session && <SessionMarkdown source={session.content} />}
      </div>
    );
  }

  // Sessions 3-7 require auth.
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const no = searchParams.no as No | undefined;
  if (!no || !NOS.includes(no)) redirect(`/${locale}/dashboard`);

  const admin = createSupabaseAdmin();

  // Check access.
  const { data: hasAccess } = await admin.rpc('tem_acesso_no', {
    p_user_id: user.id,
    p_no: no
  });
  if (!hasAccess) redirect(`/${locale}/dashboard`);

  // Check unlock.
  const { data: unlocked } = await admin.rpc('sessao_desbloqueada', {
    p_user_id: user.id,
    p_no: no,
    p_sessao: nNum
  });
  if (!unlocked) redirect(`/${locale}/dashboard`);

  // Mark started.
  await admin.from('progresso').upsert({
    user_id: user.id,
    no,
    sessao_numero: nNum,
    iniciada_em: new Date().toISOString()
  }, { onConflict: 'user_id,no,sessao_numero' });

  await trackEvent('sessao_iniciada', { userId: user.id, metadata: { no, sessao: nNum } });

  const session = await getSession(locale, no, nNum);
  if (!session) notFound();

  const { data: progressRow } = await admin
    .from('progresso')
    .select('completada_em')
    .eq('user_id', user.id)
    .eq('no', no)
    .eq('sessao_numero', nNum)
    .maybeSingle();

  return (
    <div className="px-6 md:px-10 py-16">
      <div className="max-w-prose mx-auto mb-6 text-ash text-sm tracking-widest uppercase">
        {tNo(no)} · {t('saveAnswer').replace('.', '')} {nNum}
      </div>
      <SessionMarkdown source={session.content} />
      <div className="max-w-prose mx-auto mt-16 border-t border-ash/20 pt-8 flex items-center justify-between">
        {progressRow?.completada_em ? (
          <span className="text-gold font-body">{t('completed')}</span>
        ) : (
          <CompleteSessionButton locale={locale} no={no} sessao={nNum} />
        )}
      </div>
    </div>
  );
}
