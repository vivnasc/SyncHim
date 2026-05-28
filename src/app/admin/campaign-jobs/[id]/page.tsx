import { redirect } from 'next/navigation';
import { getAdminEmailFromCookies } from '@/lib/admin/auth';
import { CampaignJobLive } from './CampaignJobLive';

export const dynamic = 'force-dynamic';

export default function CampaignJobPage({ params }: { params: { id: string } }) {
  if (!getAdminEmailFromCookies()) redirect('/admin/login');
  return (
    <>
      <h1>Campaign job</h1>
      <CampaignJobLive jobId={params.id} />
    </>
  );
}
