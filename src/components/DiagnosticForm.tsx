'use client';

import { useEffect, useMemo, useState } from 'react';
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

type Contexto = 'casada' | 'sozinha' | 'inicio';
type Phase = 'bifurcacao' | 'perguntas' | 'email';

const DRAFT_KEY = 'synchim_draft_v2';

type Draft = {
  phase: Phase;
  step: number;
  answers: Record<string, 0 | 1 | 2 | 3>;
  name: string;
  email: string;
  contexto: Contexto | null;
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
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch { /* quota or disabled */ }
}

function clearDraft() {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(DRAFT_KEY); } catch { /* */ }
}

const BIFURCACAO = {
  pt: {
    eyebrow: 'ANTES DAS 21 PERGUNTAS',
    title: 'Onde estás, agora, na tua vida amorosa?',
    helper: 'Não há resposta certa. Só preciso de saber para te falar a ti, e não a uma mulher genérica.',
    options: [
      {
        v: 'casada' as const,
        label: 'Estou num casamento ou relação séria.',
        sub: 'E algo nele já não funciona como antes.'
      },
      {
        v: 'sozinha' as const,
        label: 'Estou sozinha.',
        sub: 'Quero entender porque ainda não tenho a relação que quero, ou porque as que tenho nunca duram.'
      },
      {
        v: 'inicio' as const,
        label: 'Estou no início de algo.',
        sub: 'Conheci alguém, ou estou a namorar há pouco, e não quero estragar mais este.'
      }
    ]
  },
  en: {
    eyebrow: 'BEFORE THE 21 QUESTIONS',
    title: 'Where are you, right now, in your love life?',
    helper: "There's no right answer. I just need to know so I speak to you, and not to a generic woman.",
    options: [
      {
        v: 'casada' as const,
        label: "I'm in a marriage or serious relationship.",
        sub: 'And something in it no longer works the way it used to.'
      },
      {
        v: 'sozinha' as const,
        label: "I'm alone.",
        sub: "I want to understand why I still don't have the relationship I want, or why the ones I have never last."
      },
      {
        v: 'inicio' as const,
        label: "I'm at the beginning of something.",
        sub: "I met someone, or we're dating recently, and I don't want to ruin this one too."
      }
    ]
  }
};

export function DiagnosticForm() {
  const t = useTranslations('diagnostic');
  const tCommon = useTranslations('common');
  const locale = useLocale() as 'pt' | 'en';
  const router = useRouter();
  const qMap = locale === 'pt' ? QUESTIONS_PT : QUESTIONS_EN;
  const ids = useMemo(() => questionIds(), []);
  const total = ids.length;

  const [hydrated, setHydrated] = useState(false);
  const [phase, setPhase] = useState<Phase>('bifurcacao');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, 0 | 1 | 2 | 3>>({});
  const [contexto, setContexto] = useState<Contexto | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = loadDraft();
    if (d.phase) setPhase(d.phase);
    if (d.contexto) setContexto(d.contexto);
    if (d.answers && Object.keys(d.answers).length) setAnswers(d.answers);
    if (d.name) setName(d.name);
    if (d.email) setEmail(d.email);
    if (typeof d.step === 'number') {
      setStep(Math.min(Math.max(d.step, 0), total));
    }
    setHydrated(true);
  }, [total]);

  useEffect(() => {
    if (!hydrated) return;
    saveDraft({ phase, step, answers, name, email, contexto });
  }, [phase, step, answers, name, email, contexto, hydrated]);

  function chooseContext(c: Contexto) {
    setContexto(c);
    setTimeout(() => setPhase('perguntas'), 220);
  }

  function selectAnswer(qid: string, v: 0 | 1 | 2 | 3) {
    setAnswers((a) => ({ ...a, [qid]: v }));
    setTimeout(() => {
      setStep((s) => {
        const next = s + 1;
        if (next >= total) {
          setPhase('email');
          return total;
        }
        return next;
      });
    }, 220);
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
        body: JSON.stringify({ answers, email, password, name, locale, turnstileToken, contexto: contexto ?? 'casada' })
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

  // ============ BIFURCAÇÃO ============
  if (phase === 'bifurcacao') {
    const copy = BIFURCACAO[locale];
    return (
      <div className="min-h-[60vh] flex items-center px-6 md:px-10 py-16">
        <div className="max-w-2xl mx-auto w-full">
          <div className="mini-caps text-goldBright mb-6">{copy.eyebrow}</div>
          <h2 className="font-serif text-3xl md:text-4xl text-bone leading-[1.2] mb-6 max-w-xl">
            {copy.title}
          </h2>
          <p className="font-body italic text-bone/80 leading-relaxed mb-10 max-w-lg">
            {copy.helper}
          </p>

          <div className="flex flex-col gap-3">
            {copy.options.map((opt) => {
              const selected = contexto === opt.v;
              return (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => chooseContext(opt.v)}
                  className={`text-left font-body px-5 md:px-6 py-5 border transition-all duration-200 ${
                    selected
                      ? 'border-goldBright bg-coal/60 text-bone'
                      : 'border-separator text-bone/85 hover:border-gold hover:bg-coal/30 hover:translate-x-1'
                  }`}
                >
                  <div className="font-serif text-lg md:text-xl mb-1">{opt.label}</div>
                  <div className="text-ash text-sm italic">{opt.sub}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ============ 21 PERGUNTAS ============
  if (phase === 'perguntas') {
    const qid = ids[step];
    const numero = String(step + 1).padStart(2, '0');
    const totalStr = String(total).padStart(2, '0');
    const progress = (step / total) * 100;

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
                onClick={() => {
                  if (step === 0) {
                    setPhase('bifurcacao');
                  } else {
                    setStep((s) => Math.max(0, s - 1));
                  }
                }}
                className="text-ash hover:text-goldBright transition-colors"
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

  // ============ EMAIL + PASSWORD ============
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
