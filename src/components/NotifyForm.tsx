'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

export function NotifyForm({ locale, no, email: initialEmail }: { locale: 'pt' | 'en'; no: string; email: string }) {
  const t = useTranslations('result');
  const [email, setEmail] = useState(initialEmail);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!email) return;
    setSubmitting(true);
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, no, locale })
    });
    setDone(true);
    setSubmitting(false);
  }

  if (done) return <p className="text-gold">—</p>;
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <input
        type="email"
        className="input"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email"
      />
      <button onClick={submit} disabled={submitting || !email} className="btn">
        {t('upgradeNotifyCta')}
      </button>
    </div>
  );
}
