'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export function CompleteSessionButton({
  locale,
  no,
  sessao
}: { locale: 'pt' | 'en'; no: string; sessao: number }) {
  const t = useTranslations('session');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function complete() {
    setLoading(true);
    await fetch('/api/sessao/responder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ no, sessao, complete: true })
    });
    router.push(`/${locale}/dashboard`);
  }

  return (
    <button onClick={complete} disabled={loading} className="btn btn-primary">
      {loading ? tCommon('loading') : t('complete')}
    </button>
  );
}
