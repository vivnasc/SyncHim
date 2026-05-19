'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

export function SignOutButton({ label }: { label: string }) {
  const router = useRouter();
  const locale = useLocale();
  async function signOut() {
    await fetch('/api/auth/signout', { method: 'POST' });
    router.push(`/${locale}`);
    router.refresh();
  }
  return (
    <button onClick={signOut} className="text-ash hover:text-bone">{label}</button>
  );
}
