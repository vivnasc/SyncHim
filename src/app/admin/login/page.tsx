import { redirect } from 'next/navigation';
import { getAdminEmailFromCookies } from '@/lib/admin/auth';
import { LoginForm } from './LoginForm';

export default function AdminLoginPage() {
  if (getAdminEmailFromCookies()) redirect('/admin');
  return (
    <div className="login-wrap">
      <h1>Estúdio SyncHim</h1>
      <p className="muted">Acesso restrito à produção de conteúdo.</p>
      <LoginForm />
    </div>
  );
}
