import { LEGAL } from '@/lib/content';
import { SessionMarkdown } from '@/components/SessionMarkdown';
import type { Locale } from '@/lib/diagnostic';
export default function TermsPage({ params }: { params: { locale: string } }) {
  const raw = LEGAL.termos[params.locale as Locale] ?? LEGAL.termos.en;
  return (
    <div className="px-6 md:px-10 py-16">
      <SessionMarkdown source={raw} />
    </div>
  );
}
