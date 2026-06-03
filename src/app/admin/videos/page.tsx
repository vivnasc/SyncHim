import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminEmailFromCookies } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { VIDEO_SUBTIPOS } from '@/lib/admin/brand';
import { BackfillImagePromptsButton } from './BackfillButton';
import { BulkGenerateImagesButton } from './BulkGenerateImagesButton';
import { BulkProcessAllButton } from './BulkProcessAllButton';
import { FullPipelineButton } from './FullPipelineButton';

export const dynamic = 'force-dynamic';

const TARGET_LABELS: Record<string, string> = {
  casada: 'casadas',
  solteira: 'solteiras',
  ambos: 'ambas'
};

export default async function VideosList({
  searchParams
}: {
  searchParams?: { target?: string };
}) {
  if (!getAdminEmailFromCookies()) redirect('/admin/login');
  const supabase = createSupabaseAdmin();
  const filter = searchParams?.target;

  let q = supabase
    .from('content_items')
    .select('id, code, title, subtype, target, status, scheduled_at, platforms, updated_at')
    .eq('type', 'video')
    .order('code', { ascending: true })
    .limit(500);
  if (filter && ['casada', 'solteira', 'ambos'].includes(filter)) {
    q = q.eq('target', filter);
  }
  const { data: items } = await q;

  // Detecta drafts sem nenhum imagePrompt nas cenas (necessitam backfill).
  const draftIds = (items ?? []).filter((i: any) => i.status === 'draft').map((i: any) => i.id);
  let needBackfill: Array<{ id: string; code: string }> = [];
  let needImages: Array<{ id: string; code: string }> = [];
  let needProcess: Array<{ id: string; code: string }> = [];
  let pendingImageCount = 0;
  if (draftIds.length > 0) {
    const { data: scenesData } = await supabase
      .from('content_slides')
      .select('item_id, design, voice_url, body')
      .in('item_id', draftIds);
    type Acc = { hasPrompt: boolean; pendingImg: number; pendingVoice: number; totalScenes: number };
    const byItem = new Map<string, Acc>();
    (scenesData ?? []).forEach((s: any) => {
      const it = byItem.get(s.item_id) ?? { hasPrompt: false, pendingImg: 0, pendingVoice: 0, totalScenes: 0 };
      it.totalScenes++;
      if (s.design?.imagePrompt) {
        it.hasPrompt = true;
        if (!s.design?.imageUrl) it.pendingImg++;
      }
      if (!s.voice_url && s.body?.trim()) it.pendingVoice++;
      byItem.set(s.item_id, it);
    });
    needBackfill = (items ?? []).filter((i: any) =>
      i.status === 'draft' && !byItem.get(i.id)?.hasPrompt
    ).map((i: any) => ({ id: i.id, code: i.code }));
    (items ?? []).forEach((i: any) => {
      const it = byItem.get(i.id);
      if (!it || i.status !== 'draft') return;
      if (it.hasPrompt && it.pendingImg > 0) {
        needImages.push({ id: i.id, code: i.code });
        pendingImageCount += it.pendingImg;
      }
      // Reel pronto para process-all = tem todas as imagens + voz pendente
      // (process-all e idempotente: gera so voz em falta + aplica tema + render)
      if (it.hasPrompt && it.pendingImg === 0) {
        needProcess.push({ id: i.id, code: i.code });
      }
    });
  }
  const estImageCost = pendingImageCount * 0.04;

  const counts = { casada: 0, solteira: 0, ambos: 0, total: 0 };
  (items ?? []).forEach((i: any) => {
    counts[(i.target ?? 'casada') as 'casada' | 'solteira' | 'ambos']++;
    counts.total++;
  });

  return (
    <>
      <div className="row between">
        <div>
          <h1>Vídeos</h1>
          <p className="muted">1080×1920, 30fps. Talking head, kinetic text, hands writing. Tagueados por público.</p>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <FullPipelineButton />
          {needBackfill.length > 0 && <BackfillImagePromptsButton items={needBackfill} />}
          {needImages.length > 0 && <BulkGenerateImagesButton items={needImages} estCost={estImageCost} />}
          {needProcess.length > 0 && <BulkProcessAllButton items={needProcess} />}
          <Link href="/admin/videos/novo" className="btn">+ Novo vídeo</Link>
        </div>
      </div>

      <div className="row" style={{ marginTop: 14, gap: 6 }}>
        <Link href="/admin/videos" className={`btn ${!filter ? 'primary' : ''}`}>todos · {counts.total}</Link>
        <Link href="/admin/videos?target=casada"   className={`btn ${filter === 'casada' ? 'primary' : ''}`}>casadas · {counts.casada}</Link>
        <Link href="/admin/videos?target=solteira" className={`btn ${filter === 'solteira' ? 'primary' : ''}`}>solteiras · {counts.solteira}</Link>
        <Link href="/admin/videos?target=ambos"    className={`btn ${filter === 'ambos' ? 'primary' : ''}`}>ambas · {counts.ambos}</Link>
      </div>

      <table className="t" style={{ marginTop: 18 }}>
        <thead>
          <tr><th>código</th><th>título</th><th>subtipo</th><th style={{ width: 90 }}>público</th><th>estado</th><th>agendado</th></tr>
        </thead>
        <tbody>
          {(items ?? []).map((i) => (
            <tr key={i.id}>
              <td><code>{i.code}</code></td>
              <td><Link href={`/admin/videos/${i.id}`}>{i.title}</Link></td>
              <td className="muted">{i.subtype ? (VIDEO_SUBTIPOS as any)[i.subtype] ?? i.subtype : '—'}</td>
              <td className="muted">{TARGET_LABELS[i.target ?? 'casada']}</td>
              <td><span className={`pill ${i.status}`}>{i.status}</span></td>
              <td className="muted">{i.scheduled_at ? new Date(i.scheduled_at).toLocaleDateString('pt-PT') : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {(!items || items.length === 0) && <p className="muted" style={{ marginTop: 20 }}>Sem vídeos {filter ? `para "${filter}"` : 'ainda'}.</p>}
    </>
  );
}
