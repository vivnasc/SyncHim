'use client';
import { useRouter } from 'next/navigation';

export function SignOutAdmin() {
  const router = useRouter();
  async function logout() {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.replace('/admin/login');
  }
  return (
    <button onClick={logout} className="btn" style={{ alignSelf: 'flex-start' }}>
      sair
    </button>
  );
}
