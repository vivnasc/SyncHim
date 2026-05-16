'use client';

import { useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { questionIds, QUESTIONS_PT, QUESTIONS_EN } from '@/lib/diagnostic';
import { Turnstile } from './Turnstile';

const SCALE: Array<{ v: 0 | 1 | 2 | 3; key: '0' | '1' | '2' | '3' }> = [
  { v: 0, key: '0' },
  { v: 1, key: '1' },
  { v: 2, key: '2' },
  { v: 3, key: '3' }
];

export function DiagnosticForm() {
  const t = useTranslations('diagnostic');
  const tCommon = useTranslations('common');
  const locale = useLocale() as 'pt' | 'en';
  const router = useRouter();
  const qMap = locale === 'pt' ? QUESTIONS_PT : QUESTIONS_EN;
  const ids = useMemo(() => questionIds(), []);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, 0 | 1 | 2 | 3>>({});
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = ids.length;
  const onQuestions = step < total;
  const reachedEmail = step === total;

  function selectAnswer(qid: string, v: 0 | 1 | 2 | 3) {
    setAnswers((a) => ({ ...a, [qid]: v }));
    setTimeout(() => setStep((s) => Math.min(s + 1, total)), 180);
  }

  async function submit() {
    setError(null);
    if (Object.keys(answers).length < total) {
      setError(t('errorAllRequired'));
      return;
    }
    if (!email || !consent) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/diagnostico/calcular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, email, name, locale, turnstileToken })
      });
      if (!res.ok) throw new Error('failed');
      const data = await res.json() as { ok: boolean; redirect: string };
      router.push(data.redirect);
    } catch {
      setError('—');
      setSubmitting(false);
    }
  }

  if (onQuestions) {
    const qid = ids[step];
    return (
      <div className="max-w-prose mx-auto px-6 md:px-10 py-16">
        <div className="text-ash text-sm tracking-widest mb-6">{step + 1} / {total}</div>
        <h2 className="font-serif text-2xl md:text-3xl leading-tight mb-10">{qMap[qid]}</h2>
        <div className="flex flex-col gap-3">
          {SCALE.map(({ v, key }) => (
            <button
              key={v}
              type="button"
              onClick={() => selectAnswer(qid, v)}
              className={`text-left px-5 py-4 border transition-colors ${
                answers[qid] === v
                  ? 'border-gold text-bone'
                  : 'border-ash/40 text-bone/80 hover:border-gold/60'
              }`}
            >
              {t(`scale.${key}`)}
            </button>
          ))}
        </div>
        <div className="flex justify-between mt-10 text-sm">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="text-ash disabled:opacity-30"
          >{t('previous')}</button>
          <span className="text-ash">{tCommon('save')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-prose mx-auto px-6 md:px-10 py-16">
      <h2 className="font-serif text-2xl md:text-3xl mb-6">{t('emailPrompt')}</h2>
      <label className="block mb-4">
        <span className="block text-sm text-ash mb-2">{t('nameLabel')}</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="block mb-4">
        <span className="block text-sm text-ash mb-2">{t('emailLabel')}</span>
        <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="flex items-start gap-3 my-6 text-sm text-bone/80">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>{t('consent')}</span>
      </label>
      <Turnstile onToken={setTurnstileToken} />
      {error && <p className="text-bordeaux mb-4">{error}</p>}
      <button
        type="button"
        disabled={!email || !consent || submitting}
        onClick={submit}
        className="btn btn-primary disabled:opacity-50"
      >
        {submitting ? tCommon('loading') : t('submit')}
      </button>
    </div>
  );
}
