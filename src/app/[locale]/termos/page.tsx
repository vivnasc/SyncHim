import { LEGAL } from '@/lib/content';
import { SessionMarkdown } from '@/components/SessionMarkdown';
import type { Locale } from '@/lib/diagnostic';
import { Vesica } from '@/components/marks/Vesica';
import { EstrelaPersa } from '@/components/marks/EstrelaPersa';

export default function TermsPage({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const raw = LEGAL.termos[locale] ?? LEGAL.termos.en;
  return (
    <div>
      <section className="px-6 md:px-10 pt-16 md:pt-24 pb-8 text-center">
        <Vesica className="w-20 h-12 mx-auto text-gold mb-8" />
        <div className="mini-caps text-goldBright">
          {locale === 'pt' ? 'TERMOS' : 'TERMS'}
        </div>
      </section>
      <section className="px-6 md:px-10 pb-16">
        <div className="max-w-[40rem] mx-auto">
          <SessionMarkdown source={raw} />
        </div>
      </section>
      <div className="flex justify-center py-10">
        <EstrelaPersa className="w-10 h-10 text-goldBright" />
      </div>
    </div>
  );
}
