import './admin.css';
import Link from 'next/link';
import { getAdminEmailFromCookies } from '@/lib/admin/auth';
import { SignOutAdmin } from './SignOutAdmin';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'SyncHim · Admin',
  robots: { index: false, follow: false }
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const email = getAdminEmailFromCookies();
  return (
    <html lang="pt">
      <body className="admin-body">
        {email ? (
          <div className="admin-shell">
            <aside className="admin-side">
              <div className="admin-brand">
                <span className="brand-mark">✦</span>
                <span>SyncHim · Estúdio</span>
              </div>
              <nav className="admin-nav">
                <Link href="/admin">Painel</Link>
                <Link href="/admin/carrosseis">Carrosséis</Link>
                <Link href="/admin/videos">Vídeos</Link>
                <Link href="/admin/calendario">Calendário</Link>
                <Link href="/admin/metricool">Metricool</Link>
                <Link href="/admin/render-jobs">Render jobs</Link>
              </nav>
              <div className="admin-foot">
                <span className="muted">{email}</span>
                <SignOutAdmin />
              </div>
            </aside>
            <main className="admin-main">{children}</main>
          </div>
        ) : (
          <main className="admin-main">{children}</main>
        )}
      </body>
    </html>
  );
}
