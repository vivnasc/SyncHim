'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export function DeleteAccountForm({ locale }: { locale: 'pt' | 'en' }) {
  const t = useTranslations('account');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();
  const word = t('deleteConfirmWord');

  async function submit() {
    if (confirmation !== word) return;
    setLoading(true);
    await fetch('/api/conta/apagar', { method: 'POST' });
    setDone(true);
    router.push(`/${locale}`);
  }

  if (done) return <p className="text-gold">{t('deleted')}</p>;
  return (
    <div className="flex flex-col gap-3 max-w-sm">
      <label className="text-sm text-ash">{t('deleteConfirm')}</label>
      <input
        className="input"
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
        placeholder={word}
      />
      <button
        onClick={submit}
        disabled={confirmation !== word || loading}
        className="btn"
        style={{ borderColor: '#8B2235', color: '#F2E8DC' }}
      >
        {t('deleteCta')}
      </button>
    </div>
  );
}
