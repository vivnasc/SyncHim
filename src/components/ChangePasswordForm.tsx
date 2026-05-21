'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { createSupabaseBrowser } from '@/lib/supabase/client';

type Status = 'idle' | 'saving' | 'saved' | 'error';

export function ChangePasswordForm() {
  const locale = useLocale() as 'pt' | 'en';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const labels = locale === 'pt'
    ? {
        eyebrow: 'PASSWORD',
        title: 'Mudar a tua password',
        newLabel: 'Nova password',
        confirmLabel: 'Confirma a nova password',
        hint: 'Pelo menos 8 caracteres.',
        cta: 'Guardar nova password',
        saving: 'A guardar.',
        saved: 'Password actualizada.',
        mismatch: 'As duas passwords não são iguais.',
        short: 'A password tem de ter pelo menos 8 caracteres.',
        genericError: 'Não consegui actualizar. Tenta de novo.'
      }
    : {
        eyebrow: 'PASSWORD',
        title: 'Change your password',
        newLabel: 'New password',
        confirmLabel: 'Confirm the new password',
        hint: 'At least 8 characters.',
        cta: 'Save new password',
        saving: 'Saving.',
        saved: 'Password updated.',
        mismatch: "The two passwords don't match.",
        short: 'Your password needs at least 8 characters.',
        genericError: "Couldn't update. Try again."
      };

  async function submit() {
    setMessage(null);
    if (password.length < 8) {
      setStatus('error');
      setMessage(labels.short);
      return;
    }
    if (password !== confirm) {
      setStatus('error');
      setMessage(labels.mismatch);
      return;
    }
    setStatus('saving');
    try {
      const supabase = createSupabaseBrowser();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        console.error('updateUser failed', error);
        setStatus('error');
        setMessage(labels.genericError);
        return;
      }
      setStatus('saved');
      setMessage(labels.saved);
      setPassword('');
      setConfirm('');
    } catch (e) {
      console.error(e);
      setStatus('error');
      setMessage(labels.genericError);
    }
  }

  return (
    <div>
      <div className="mini-caps text-goldBright mb-3">{labels.eyebrow}</div>
      <h2 className="font-serif text-2xl md:text-3xl text-bone mb-6">{labels.title}</h2>

      <label className="block mb-5">
        <span className="block mini-caps text-ash mb-2">{labels.newLabel}</span>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
        />
      </label>

      <label className="block mb-3">
        <span className="block mini-caps text-ash mb-2">{labels.confirmLabel}</span>
        <input
          className="input"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          minLength={8}
        />
        <span className="block font-body italic text-ash text-xs mt-2">{labels.hint}</span>
      </label>

      {message && (
        <p
          className={`font-body my-4 border-l-2 pl-4 ${
            status === 'saved' ? 'text-goldBright border-goldBright' : 'text-bordeaux border-bordeaux'
          }`}
        >
          {message}
        </p>
      )}

      <button
        onClick={submit}
        disabled={status === 'saving' || !password || !confirm}
        className="cta-living mt-4 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span>{status === 'saving' ? labels.saving : labels.cta}</span>
        {status !== 'saving' && <span className="arrow" aria-hidden="true">→</span>}
      </button>
    </div>
  );
}
