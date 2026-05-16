import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { NOS, NOS_VENDAVEIS, type No } from '@/lib/diagnostic';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { trackEvent } from '@/lib/events';
import { NotifyForm } from '@/components/NotifyForm';

interface ResultCookie {
  user_id: string;
  dominante: No;
  secundario: No | null;
  pontuacoes: Record<No, number>;
  is_repeat: boolean;
}

export default async function ResultPage({ params }: { params: { locale: string } }) {
  const locale = params.locale as 'pt' | 'en';
  const raw = cookies().get('synchim_result')?.value;
  if (!raw) redirect(`/${locale}/diagnostico`);
  let payload: ResultCookie;
  try {
    payload = JSON.parse(raw) as ResultCookie;
  } catch {
    redirect(`/${locale}/diagnostico`);
  }

  const t = await getTranslations('result');
  const tNo = await getTranslations('no');
  const dominante = payload!.dominante;
  const sellable = NOS_VENDAVEIS.includes(dominante);

  await trackEvent('resultado_visualizado', { userId: payload!.user_id, metadata: { dominante } });

  // Find previous diagnostic if repeat.
  let previous: { no: No; months: number } | null = null;
  if (payload!.is_repeat) {
    const admin = createSupabaseAdmin();
    const { data } = await admin
      .from('diagnosticos')
      .select('no_dominante, created_at')
      .eq('user_id', payload!.user_id)
      .order('created_at', { ascending: false })
      .limit(2);
    if (data && data.length >= 2) {
      const prev = data[1] as { no_dominante: No; created_at: string };
      const months = Math.max(1, Math.round((Date.now() - new Date(prev.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)));
      previous = { no: prev.no_dominante, months };
    }
  }

  return (
    <div className="px-6 md:px-10 py-20">
      <div className="max-w-prose mx-auto">
        <h1 className="font-serif text-5xl md:text-6xl mb-4">{t('title')}</h1>
        <p className="text-bone/80 text-xl mb-12 font-body">{t('subtitle')}</p>

        <div className="text-center my-14">
          <div className="text-ash text-sm tracking-widest uppercase mb-3">{locale === 'pt' ? 'O teu nó' : 'Your knot'}</div>
          <div className="font-serif text-5xl md:text-6xl text-gold">{tNo(dominante)}</div>
        </div>

        {previous && (
          <p className="text-bone/80 italic font-body my-10">
            {t('history', { months: String(previous.months), previous: tNo(previous.no), current: tNo(dominante) })}
          </p>
        )}

        <section className="my-12 border-t border-ash/20 pt-10">
          <h2 className="font-serif text-2xl mb-6">{t('scoresTitle')}</h2>
          <ul className="space-y-2">
            {NOS.map((no) => {
              const score = payload!.pontuacoes[no];
              const pct = (score / 9) * 100;
              return (
                <li key={no} className="grid grid-cols-[8rem_1fr_2rem] items-center gap-4">
                  <span className={no === dominante ? 'text-gold' : 'text-bone/70'}>{tNo(no)}</span>
                  <span className="block h-[2px] bg-ash/30 relative overflow-hidden">
                    <span
                      className={no === dominante ? 'block h-full bg-gold' : 'block h-full bg-bone/60'}
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className="text-right text-ash text-sm">{score}/9</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="my-14 border-t border-ash/20 pt-10">
          <h2 className="font-serif text-3xl mb-5">{t('upgradeTitle')}</h2>
          <p className="text-bone/80 mb-8 font-body text-lg">{t('upgradeBody')}</p>
          {sellable ? (
            <Link href={`/${locale}/checkout?no=${dominante}`} className="btn btn-primary">
              {t('upgradeCta')}
            </Link>
          ) : (
            <div className="border border-ash/40 p-6">
              <p className="text-bone/80 mb-4">{t('upgradeNotReady')}</p>
              <NotifyForm locale={locale} no={dominante} email="" />
            </div>
          )}
          <div className="mt-12 text-ash text-sm font-body italic">{t('or')}</div>
          <div className="mt-4">
            <Link href={`/${locale}/diagnostico`} className="text-ash hover:text-bone underline-offset-4 hover:underline">
              {t('redo')}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
