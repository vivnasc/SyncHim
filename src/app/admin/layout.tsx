import './admin.css';
import Link from 'next/link';
import { getAdminEmailFromCookies } from '@/lib/admin/auth';
import { SignOutAdmin } from './SignOutAdmin';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'SyncHim · Admin',
  robots: { index: false, follow: false }
};

// IMPORTANT: this layout is nested inside src/app/layout.tsx which already
// renders <html> and <body>. Render only the admin shell here — declaring
// <html>/<body> a second time produced two root elements in the DOM and
// blew up hydration. Same bug as the [locale] layout had earlier.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const email = getAdminEmailFromCookies();
  return (
    <div className="admin-body">
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
              <Link href="/admin/planear">Planear</Link>
              <Link href="/admin/prompts">Prompts MJ</Link>
              <Link href="/admin/metricool">Metricool</Link>
              <Link href="/admin/render-jobs">Render jobs</Link>
              <Link href="/admin/testes">Testes de fluxo</Link>
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
    </div>
  );
}
