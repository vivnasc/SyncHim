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
        Gera 21 items por semana: 14 carrosseis (09h didáctico + 13h reconhecimento/CTA)
        e 7 reels kinetic (18h, voz ElevenLabs + legenda sincronizada). Podes filtrar por
        tipo (só carrosseis, só reels, ou tudo). Suporta 1 semana ou campanhas até 8 semanas.
      </p>
      <PlanearForm />
    </>
  );
}
