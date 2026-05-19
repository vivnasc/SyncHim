import { LEGAL } from '@/lib/content';
import { SessionMarkdown } from '@/components/SessionMarkdown';
import type { Locale } from '@/lib/diagnostic';
export default function GuaranteePage({ params }: { params: { locale: string } }) {
  const raw = LEGAL.garantia[params.locale as Locale] ?? LEGAL.garantia.en;
  return (
    <div className="px-6 md:px-10 py-16">
      <SessionMarkdown source={raw} />
    </div>
  );
}
