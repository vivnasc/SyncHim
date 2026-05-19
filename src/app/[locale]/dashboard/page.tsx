import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { type No } from '@/lib/diagnostic';

export const runtime = 'edge';

export default async function DashboardPage({ params }: { params: { locale: string } }) {
  const locale = params.locale as 'pt' | 'en';
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const admin = createSupabaseAdmin();
  const { data: u } = await admin
    .from('users')
    .select('tier, no_comprado, nos_comprados_adicionais, nome')
    .eq('id', user.id)
    .maybeSingle();

  const t = await getTranslations('dashboard');
  const tNo = await getTranslations('no');

  if (!u) return null;

  const myNos: No[] = [];
  if (u.tier === 2) {
    myNos.push('fome', 'controlo', 'inferioridade', 'desconfianca', 'salvadora', 'abandono', 'invisibilidade');
  } else if (u.tier === 1) {
    if (u.no_comprado) myNos.push(u.no_comprado as No);
    for (const n of (u.nos_comprados_adicionais ?? []) as No[]) {
      if (!myNos.includes(n)) myNos.push(n);
    }
  }

  // Sessions 1 and 2 always available.
  const commonRows = [
    { n: 1 as const, label: t('sessionLabel', { n: '1' }) },
    { n: 2 as const, label: t('sessionLabel', { n: '2' }) }
  ];

  // For each no the user has, list 3-7.
  const noBlocks: Array<{ no: No; sessions: Array<{ n: number; unlocked: boolean; completed: boolean; opensAt: Date | null }> }> = [];
  for (const no of myNos) {
    const { data: prog } = await admin
      .from('progresso')
      .select('sessao_numero, completada_em')
      .eq('user_id', user.id)
      .eq('no', no);
    const map = new Map<number, string | null>();
    (prog ?? []).forEach((p) => map.set(p.sessao_numero, p.completada_em));
    const sessions = [3, 4, 5, 6, 7].map((n) => {
      const completed = !!map.get(n);
      let unlocked = false;
      let opensAt: Date | null = null;
      if (n === 3) unlocked = true;
      else {
        const prev = map.get(n - 1);
        if (prev) {
          const t0 = new Date(prev);
          const open = new Date(t0.getTime() + 3 * 24 * 60 * 60 * 1000);
          unlocked = Date.now() >= open.getTime();
          opensAt = open;
        }
      }
      return { n, unlocked, completed, opensAt };
    });
    noBlocks.push({ no, sessions });
  }

  return (
    <div className="px-6 md:px-10 py-16">
      <div className="max-w-prose mx-auto">
        <h1 className="font-serif text-4xl mb-10">{t('title')}</h1>

        <section className="border-t border-ash/20 pt-8 mb-12">
          <ul className="space-y-3">
            {commonRows.map((row) => (
              <li key={row.n} className="flex items-center justify-between">
                <Link href={`/${locale}/sessao/${row.n}`} className="text-bone hover:text-gold">
                  {row.label}
                </Link>
                <span className="text-ash text-sm">{t('open')}</span>
              </li>
            ))}
          </ul>
        </section>

        {noBlocks.length === 0 ? (
          <section className="border-t border-ash/20 pt-8">
            <p className="text-bone/80 mb-6">{t('tier0Lock')}</p>
            <Link href={`/${locale}/diagnostico`} className="btn btn-ghost">{t('redoDiagnostic')}</Link>
          </section>
        ) : noBlocks.map((block) => (
          <section key={block.no} className="border-t border-ash/20 pt-8 mb-10">
            <h2 className="font-serif text-2xl mb-5 text-gold">{tNo(block.no)}</h2>
            <ul className="space-y-3">
              {block.sessions.map((s) => (
                <li key={s.n} className="flex items-center justify-between">
                  <div>
                    {s.unlocked ? (
                      <Link href={`/${locale}/sessao/${s.n}?no=${block.no}`} className="text-bone hover:text-gold">
                        {t('sessionLabel', { n: String(s.n) })}
                      </Link>
                    ) : (
                      <span className="text-ash">{t('sessionLabel', { n: String(s.n) })}</span>
                    )}
                  </div>
                  <div className="text-sm">
                    {s.completed ? (
                      <span className="text-gold">{t('completed')}</span>
                    ) : s.unlocked ? (
                      <span className="text-bone">{t('open')}</span>
                    ) : s.opensAt ? (
                      <span className="text-ash">{t('locked', { date: s.opensAt.toLocaleDateString(locale === 'pt' ? 'pt-PT' : 'en-GB') })}</span>
                    ) : (
                      <span className="text-ash">—</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <div className="mt-16 text-sm">
          <Link href={`/${locale}/diagnostico`} className="text-ash hover:text-bone">{t('redoDiagnostic')}</Link>
        </div>
      </div>
    </div>
  );
}
