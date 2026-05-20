'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error || 'Falhou.');
        return;
      }
      router.replace('/admin');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div>
        <label>Email</label>
        <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
      </div>
      <div>
        <label>Password</label>
        <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="err">{err}</div>
      <button className="btn primary" disabled={busy} type="submit">{busy ? '…' : 'entrar'}</button>
    </form>
  );
}
