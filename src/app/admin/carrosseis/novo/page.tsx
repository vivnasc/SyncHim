import { redirect } from 'next/navigation';
import { getAdminEmailFromCookies } from '@/lib/admin/auth';
import { CATEGORIAS_CARROSSEL } from '@/lib/admin/brand';
import { NovoCarrosselForm } from './NovoCarrosselForm';

export const dynamic = 'force-dynamic';

export default function NovoCarrossel() {
  if (!getAdminEmailFromCookies()) redirect('/admin/login');
  const categorias = Object.entries(CATEGORIAS_CARROSSEL).map(([key, v]) => ({ key, label: v.label }));
  return (
    <>
      <h1>Novo carrossel</h1>
      <p className="muted">Cria um carrossel em branco. Podes editar slides depois.</p>
      <NovoCarrosselForm categorias={categorias} />
    </>
  );
}
