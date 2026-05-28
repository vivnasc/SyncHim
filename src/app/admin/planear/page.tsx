import { redirect } from 'next/navigation';
import { getAdminEmailFromCookies } from '@/lib/admin/auth';
import { PlanearForm } from './PlanearForm';

export const dynamic = 'force-dynamic';

export default function PlanearPage() {
  if (!getAdminEmailFromCookies()) redirect('/admin/login');

  return (
    <>
      <h1>Planear campanha</h1>
      <p className="muted">
        Gera 14 carrosseis por semana (7 manhas + 7 noites, todos 12:00 — Metricool
        agenda a hora final por post). Suporta 1 semana ou a campanha completa de
        30 dias (5 semanas, 70 carrosseis). Cada carrossel é gerado via Claude com
        prompts MJ pré-preenchidos por slide.
      </p>
      <PlanearForm />
    </>
  );
}
