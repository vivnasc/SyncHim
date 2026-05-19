import { getTranslations } from 'next-intl/server';

export const runtime = 'edge';

export default async function SuccessPage() {
  const t = await getTranslations('success');
  return (
    <div className="px-6 md:px-10 py-32 max-w-prose mx-auto">
      <h1 className="font-serif text-5xl mb-6">{t('title')}</h1>
      <p className="font-body text-bone/85 text-lg">{t('body')}</p>
    </div>
  );
}
