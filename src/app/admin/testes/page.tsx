import { redirect } from 'next/navigation';
import { getAdminEmailFromCookies } from '@/lib/admin/auth';
import { TestToolsPanel } from './TestToolsPanel';

export const dynamic = 'force-dynamic';

export default function AdminTestesPage() {
  const email = getAdminEmailFromCookies();
  if (!email) redirect('/admin/login');

  return (
    <>
      <h1>Testes de fluxo</h1>
      <p className="muted">
        Atalhos para validar o funil sem pagar e sem esperar os 3 dias entre sessões.
        Tudo aqui escreve directamente em <code>synchim.users</code> e <code>synchim.progresso</code>.
      </p>
      <TestToolsPanel adminEmail={email} />
    </>
  );
}
