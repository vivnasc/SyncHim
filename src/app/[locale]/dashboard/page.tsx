import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { type No } from '@/lib/diagnostic';
import { Vesica } from '@/components/marks/Vesica';
import { EstrelaPersa } from '@/components/marks/EstrelaPersa';

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

  const t = await getTranslations({ locale: params.locale, namespace: 'dashboard' });
  const tNo = await getTranslations({ locale: params.locale, namespace: 'no' });

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

  const commonRows = [
    { n: 1 as const, label: t('sessionLabel', { n: '1' }) },
    { n: 2 as const, label: t('sessionLabel', { n: '2' }) }
  ];

  const noBlocks: Array<{
    no: No;
    sessions: Array<{ n: number; unlocked: boolean; completed: boolean; opensAt: Date | null }>;
  }> = [];
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
    <div>
      <section className="px-6 md:px-10 pt-16 md:pt-24 pb-10 text-center">
        <Vesica className="w-20 h-12 mx-auto text-gold mb-8" />
        <div className="mini-caps text-goldBright mb-4">
          {locale === 'pt' ? 'A TUA TRAVESSIA' : 'YOUR CROSSING'}
        </div>
        <h1 className="font-serif text-4xl md:text-5xl text-bone">{t('title')}</h1>
      </section>

      <section className="px-6 md:px-10 py-10 bg-coal/40">
        <div className="max-w-xl mx-auto">
          <div className="mini-caps text-ash mb-5">
            {locale === 'pt' ? 'SESSÕES COMUNS' : 'COMMON SESSIONS'}
          </div>
          <ul>
            {commonRows.map((row) => (
              <li
                key={row.n}
                className="grid grid-cols-[1fr_auto] items-baseline border-b border-separator py-4"
              >
                <Link
                  href={`/${locale}/sessao/${row.n}`}
                  className="font-serif text-xl text-bone hover:text-goldBright transition-colors"
                >
                  {row.label}
                </Link>
                <span className="mini-caps text-goldBright">{t('open')} →</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {noBlocks.length === 0 ? (
        <section className="px-6 md:px-10 py-16">
          <div className="max-w-xl mx-auto border border-separator p-8 md:p-10 text-center">
            <div className="mini-caps text-goldBright mb-4">
              {locale === 'pt' ? 'TRAVESSIA POR ABRIR' : 'CROSSING NOT YET OPEN'}
            </div>
            <p className="font-body text-bone/85 leading-relaxed mb-7">{t('tier0Lock')}</p>
            <Link href={`/${locale}/diagnostico`} className="cta-living">
              <span>{t('redoDiagnostic')}</span>
              <span className="arrow" aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      ) : (
        noBlocks.map((block) => (
          <section key={block.no} className="px-6 md:px-10 py-12">
            <div className="max-w-xl mx-auto">
              <div className="mini-caps text-ash mb-3">
                {locale === 'pt' ? 'TRAVESSIA' : 'CROSSING'}
              </div>
              <h2 className="font-serif text-3xl md:text-4xl text-goldBright mb-8">
                {tNo(block.no)}
              </h2>
              <ul>
                {block.sessions.map((s) => (
                  <li
                    key={s.n}
                    className="grid grid-cols-[1fr_auto] items-baseline border-b border-separator py-4 gap-4"
                  >
                    <div>
                      {s.unlocked ? (
                        <Link
                          href={`/${locale}/sessao/${s.n}?no=${block.no}`}
                          className="font-serif text-xl text-bone hover:text-goldBright transition-colors"
                        >
                          {t('sessionLabel', { n: String(s.n) })}
                        </Link>
                      ) : (
                        <span className="font-serif text-xl text-ash">
                          {t('sessionLabel', { n: String(s.n) })}
                        </span>
                      )}
                    </div>
                    <div className="text-sm">
                      {s.completed ? (
                        <span className="mini-caps text-goldBright">{t('completed')}</span>
                      ) : s.unlocked ? (
                        <span className="mini-caps text-gold">{t('open')} →</span>
                      ) : s.opensAt ? (
                        <span className="mini-caps text-ash">
                          {t('locked', {
                            date: s.opensAt.toLocaleDateString(
                              locale === 'pt' ? 'pt-PT' : 'en-GB'
                            )
                          })}
                        </span>
                      ) : (
                        <span className="mini-caps text-ash">·</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))
      )}

      <section className="px-6 md:px-10 py-10 text-center border-t border-separator mt-8">
        <Link
          href={`/${locale}/diagnostico`}
          className="text-ash hover:text-goldBright text-sm tracking-wide transition-colors"
        >
          {t('redoDiagnostic')}
        </Link>
      </section>

      <div className="flex justify-center py-10">
        <EstrelaPersa className="w-10 h-10 text-goldBright" />
      </div>
    </div>
  );
}
