import { getTranslations } from 'next-intl/server';
import { Vesica } from '@/components/marks/Vesica';
import { EstrelaPersa } from '@/components/marks/EstrelaPersa';

export default async function SuccessPage({ params }: { params: { locale: string } }) {
  const t = await getTranslations({ locale: params.locale, namespace: 'success' });

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 md:px-10 py-24 text-center">
      <Vesica className="w-20 h-12 text-gold mb-10" />
      <h1 className="font-serif text-5xl md:text-6xl text-goldBright mb-8">{t('title')}</h1>
      <p className="font-body italic text-bone/85 text-lg md:text-xl leading-relaxed max-w-prose">
        {t('body')}
      </p>
      <EstrelaPersa className="w-12 h-12 text-goldBright mt-16" />
    </div>
  );
}
