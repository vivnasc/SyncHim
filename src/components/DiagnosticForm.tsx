'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { questionIds } from '@/lib/diagnostic';
import { questionMapFor } from '@/lib/diagnostic-variants';
import { coerceTarget, type Target } from '@/lib/target';
import { Turnstile } from './Turnstile';

const SCALE: Array<{ v: 0 | 1 | 2 | 3; key: '0' | '1' | '2' | '3' }> = [
  { v: 0, key: '0' },
  { v: 1, key: '1' },
  { v: 2, key: '2' },
  { v: 3, key: '3' }
];

const DRAFT_KEY = 'synchim_draft_v2';
const TARGET_COOKIE = 'synchim_target';

type Draft = {
  step: number;
  answers: Record<string, 0 | 1 | 2 | 3>;
  name: string;
  email: string;
  target: Target | null;
};

function loadDraft(): Partial<Draft> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<Draft>;
  } catch {
    return {};
  }
}

function saveDraft(d: Draft) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* */ }
}

function clearDraft() {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(DRAFT_KEY); } catch { /* */ }
}

function readTargetCookie(): Target | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|; )synchim_target=([^;]+)/);
  if (!m) return null;
  return m[1] === 'solteira' || m[1] === 'casada' ? m[1] : null;
}

function writeTargetCookie(t: Target) {
  document.cookie = `${TARGET_COOKIE}=${t};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
}

export function DiagnosticForm() {
  const t = useTranslations('diagnostic');
  const tCommon = useTranslations('common');
  const locale = useLocale() as 'pt' | 'en';
  const router = useRouter();
  const ids = useMemo(() => questionIds(), []);
  const total = ids.length;

  // step -1 = target picker; 0..total-1 = perguntas; total = email/password form.
  const [hydrated, setHydrated] = useState(false);
  const [target, setTarget] = useState<Target | null>(null);
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState<Record<string, 0 | 1 | 2 | 3>>({});
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hidratar localStorage + cookie/URL na primeira render.
  useEffect(() => {
    const d = loadDraft();
    const url = new URL(window.location.href);
    const param = url.searchParams.get('for');
    const fromUrl = param === 'solteira' || param === 'casada' ? (param as Target) : null;
    const found: Target | null = fromUrl ?? readTargetCookie() ?? (d.target ?? null);

    if (d.answers && Object.keys(d.answers).length) setAnswers(d.answers);
    if (d.name) setName(d.name);
    if (d.email) setEmail(d.email);

    if (found) {
      setTarget(found);
      writeTargetCookie(found);
      // Se o draft tem um step >= 0, retomar; senão começar nas perguntas.
      const restoreStep = typeof d.step === 'number' && d.step >= 0
        ? Math.min(Math.max(d.step, 0), total)
        : 0;
      setStep(restoreStep);
    }
    // Se found === null, mantém-se step === -1 (picker).
    setHydrated(true);
  }, [total]);

  // Autosave.
  useEffect(() => {
    if (!hydrated) return;
    saveDraft({ step, answers, name, email, target });
  }, [step, answers, name, email, target, hydrated]);

  const qMap = useMemo(
    () => questionMapFor(locale, coerceTarget(target)),
    [locale, target]
  );
  const onQuestions = step >= 0 && step < total;
  const progress = step < 0 ? 0 : onQuestions ? (step / total) * 100 : 100;

  function pickTarget(tt: Target) {
    setTarget(tt);
    writeTargetCookie(tt);
    setStep(0);
  }

  function selectAnswer(qid: string, v: 0 | 1 | 2 | 3) {
    setAnswers((a) => ({ ...a, [qid]: v }));
    setTimeout(() => setStep((s) => Math.min(s + 1, total)), 220);
  }

  async function submit() {
    setError(null);
    if (Object.keys(answers).length < total) {
      setError(t('errorAllRequired'));
      return;
    }
    if (!email || !consent) return;
    if (password.length < 8) {
      setError(t('errorPasswordShort'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/diagnostico/calcular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers, email, password, name, locale,
          target: coerceTarget(target),
          turnstileToken
        })
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        console.error('diagnostico/calcular failed', res.status, detail);
        if (detail?.detail?.includes('password') || detail?.detail?.includes('Password')) {
          throw new Error(t('errorPasswordShort'));
        }
        throw new Error(t('errorGeneric'));
      }
      const data = await res.json() as { ok: boolean; redirect: string };
      clearDraft();
      router.push(data.redirect);
    } catch (err) {
      console.error('submit error', err);
      setError(err instanceof Error ? err.message : t('errorGeneric'));
      setSubmitting(false);
    }
  }

  // ----- Step -1: escolher público -----
  if (step === -1) {
    return (
      <div className="min-h-[60vh] flex items-center px-6 md:px-10 py-16">
        <div className="max-w-2xl mx-auto w-full">
          <div className="mini-caps text-goldBright mb-4">
            {locale === 'pt' ? 'ANTES DE COMEÇAR' : 'BEFORE WE START'}
          </div>
          <h2 className="font-serif text-2xl md:text-4xl text-bone leading-[1.25] mb-3">
            {locale === 'pt' ? 'Onde estás, neste momento da tua vida?' : 'Where are you, right now in your life?'}
          </h2>
          <p className="text-ash italic font-body text-sm mb-10">
            {locale === 'pt'
              ? 'As perguntas adaptam-se. Os 7 nós são os mesmos — o cenário onde os reconheces, não.'
              : 'The questions adapt. The 7 knots are the same — the scenery where you recognise them is not.'}
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => pickTarget('casada')}
              className="text-left p-7 border border-separator hover:border-gold hover:bg-coal/30 transition-all group"
            >
              <div className="font-serif text-xl text-bone mb-2 group-hover:text-goldBright transition-colors">
                {locale === 'pt' ? 'Num casamento' : 'In a marriage'}
              </div>
              <p className="font-body text-sm text-bone/70 leading-relaxed">
                {locale === 'pt'
                  ? 'Há anos juntos. Há filhos, ou não. Alguma coisa esfriou e tu já não sabes nomear o quê.'
                  : 'Years together. Maybe children. Something has cooled and you cannot name what.'}
              </p>
            </button>

            <button
              type="button"
              onClick={() => pickTarget('solteira')}
              className="text-left p-7 border border-separator hover:border-gold hover:bg-coal/30 transition-all group"
            >
              <div className="font-serif text-xl text-bone mb-2 group-hover:text-goldBright transition-colors">
                {locale === 'pt' ? 'Solteira, à procura de um sério' : 'Single, looking for something serious'}
              </div>
              <p className="font-body text-sm text-bone/70 leading-relaxed">
                {locale === 'pt'
                  ? 'Conheces homens. Eles esfriam. Repete-se. E começas a desconfiar que talvez não sejam só eles.'
                  : 'You meet men. They cool off. It repeats. And you begin to suspect that maybe it is not only them.'}
              </p>
            </button>
          </div>

          <p className="text-ash text-xs font-body mt-8">
            {locale === 'pt'
              ? 'Podes mudar depois. A escolha é só para enquadrar as perguntas.'
              : 'You can change later. The choice only frames the questions.'}
          </p>
        </div>
      </div>
    );
  }

  if (onQuestions) {
    const qid = ids[step];
    const numero = String(step + 1).padStart(2, '0');
    const totalStr = String(total).padStart(2, '0');

    return (
      <div className="min-h-[60vh] flex flex-col">
        <div className="px-6 md:px-10 pt-10">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-baseline justify-between mb-3 mini-caps text-ash">
              <span>{numero} / {totalStr}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-px bg-separator relative overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-goldBright transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div
          key={qid}
          className="flex-1 flex items-center px-6 md:px-10 py-12 md:py-16 fade-in-section is-visible"
        >
          <div className="max-w-2xl mx-auto w-full">
            <h2 className="font-serif text-2xl md:text-4xl text-bone leading-[1.25] mb-12 max-w-xl">
              {qMap[qid]}
            </h2>
            <div className="flex flex-col gap-3">
              {SCALE.map(({ v, key }) => {
                const selected = answers[qid] === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => selectAnswer(qid, v)}
                    className={`text-left font-body px-5 md:px-6 py-4 md:py-5 border transition-all duration-200 ${
                      selected
                        ? 'border-goldBright bg-coal/60 text-bone'
                        : 'border-separator text-bone/85 hover:border-gold hover:bg-coal/30 hover:translate-x-1'
                    }`}
                  >
                    {t(`scale.${key}`)}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between mt-12 text-sm">
              <button
                type="button"
                disabled={step === 0}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="text-ash disabled:opacity-30 hover:text-goldBright transition-colors"
              >
                ← {t('previous')}
              </button>
              <span className="text-ash italic">{tCommon('save')}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center px-6 md:px-10 py-16">
      <div className="max-w-xl mx-auto w-full">
        <div className="mini-caps text-goldBright mb-6">{tCommon('continue')}</div>
        <h2 className="font-serif text-3xl md:text-4xl text-bone leading-tight mb-10 max-w-md">
          {t('emailPrompt')}
        </h2>

        <label className="block mb-6">
          <span className="block mini-caps text-ash mb-2">{t('nameLabel')}</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={locale === 'pt' ? 'O teu primeiro nome' : 'Your first name'}
            autoComplete="given-name"
          />
        </label>

        <label className="block mb-6">
          <span className="block mini-caps text-ash mb-2">{t('emailLabel')}</span>
          <input
            className="input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@dominio.com"
            autoComplete="email"
          />
        </label>

        <label className="block mb-3">
          <span className="block mini-caps text-ash mb-2">{t('passwordLabel')}</span>
          <input
            className="input"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            minLength={8}
          />
          <span className="block font-body italic text-ash text-xs mt-2">
            {t('passwordHint')}
          </span>
        </label>

        <label className="flex items-start gap-3 my-8 text-sm text-bone/80 font-body cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 accent-goldBright"
          />
          <span>{t('consent')}</span>
        </label>

        <Turnstile onToken={setTurnstileToken} />

        {error && (
          <p className="text-bordeaux font-body my-5 border-l-2 border-bordeaux pl-4">{error}</p>
        )}

        <button
          type="button"
          disabled={!email || !consent || password.length < 8 || submitting}
          onClick={submit}
          className="cta-living large mt-4 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span>{submitting ? tCommon('loading') : t('submit')}</span>
          {!submitting && <span className="arrow" aria-hidden="true">→</span>}
        </button>
      </div>
    </div>
  );
}
