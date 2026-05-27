import { redirect } from 'next/navigation';
import { getAdminEmailFromCookies } from '@/lib/admin/auth';
import { PlanearForm } from './PlanearForm';

export const dynamic = 'force-dynamic';

export default function PlanearPage() {
  if (!getAdminEmailFromCookies()) redirect('/admin/login');

  return (
    <>
      <h1>Planear semana</h1>
      <p className="muted">
        Gera automaticamente 14 carrosseis (7 manhas + 7 noites) para uma
        semana completa. Cada carrossel e gerado via Claude API com prompts MJ
        pre-preenchidos.
      </p>
      <PlanearForm />
    </>
  );
}
