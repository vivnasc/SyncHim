import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminEmailFromCookies } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Lista de campaign_jobs (geracoes em background). Cada linha linka para
 * a pagina de detalhe que faz polling.
 */
export default async function CampaignJobsList() {
  if (!getAdminEmailFromCookies()) redirect('/admin/login');
  const supabase = createSupabaseAdmin();
  const { data: jobs } = await supabase
    .from('campaign_jobs')
    .select('job_id, status, progress, current_slot, total_slots, message, created_at, finished_at')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <>
      <h1>Campaign jobs</h1>
      <p className="muted">
        Geracoes em background no GitHub Actions. Browser pode fechar sem
        afectar o progresso. Refresh manual para actualizar (auto-poll na
        pagina de detalhe).
      </p>

      {(!jobs || jobs.length === 0) && (
        <div className="card" style={{ marginTop: 18 }}>
          <p className="muted">Sem jobs ainda. Em <Link href="/admin/planear">/admin/planear</Link> clica em &ldquo;Planear background&rdquo;.</p>
        </div>
      )}

      {jobs && jobs.length > 0 && (
        <table className="t" style={{ marginTop: 16 }}>
          <thead>
            <tr>
              <th>job</th><th>estado</th><th>progresso</th><th>slot</th>
              <th>mensagem</th><th>criado</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.job_id}>
                <td><Link href={`/admin/campaign-jobs/${j.job_id}`}>
                  <code style={{ fontSize: 11 }}>{j.job_id.slice(9, 22)}…</code>
                </Link></td>
                <td><span className={`pill ${j.status}`}>{j.status}</span></td>
                <td>{j.progress}%</td>
                <td className="muted">{j.current_slot}/{j.total_slots}</td>
                <td className="muted" style={{ fontSize: 12, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {j.message}
                </td>
                <td className="muted">{new Date(j.created_at).toLocaleString('pt-PT')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
