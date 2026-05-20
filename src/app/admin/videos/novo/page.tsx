import { redirect } from 'next/navigation';
import { getAdminEmailFromCookies } from '@/lib/admin/auth';
import { VIDEO_SUBTIPOS } from '@/lib/admin/brand';
import { NovoVideoForm } from './NovoVideoForm';

export const dynamic = 'force-dynamic';

export default function NovoVideo() {
  if (!getAdminEmailFromCookies()) redirect('/admin/login');
  const subtipos = Object.entries(VIDEO_SUBTIPOS).map(([key, label]) => ({ key, label }));
  return (
    <>
      <h1>Novo vídeo</h1>
      <p className="muted">Cria um vídeo. O subtipo define o template de render.</p>
      <NovoVideoForm subtipos={subtipos} />
    </>
  );
}
