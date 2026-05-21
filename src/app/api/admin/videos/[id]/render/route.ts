import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { uploadJson, publicUrl } from '@/lib/admin/storage';
import { dispatchWorkflow } from '@/lib/admin/dispatch';
import { BRAND, FORMATO_VIDEO } from '@/lib/admin/brand';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminEmailFromRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const supabase = createSupabaseAdmin();

  const { data: item } = await supabase
    .from('content_items').select('*').eq('id', params.id).eq('type', 'video').maybeSingle();
  if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const { data: scenes } = await supabase
    .from('content_slides').select('*').eq('item_id', item.id).order('idx', { ascending: true });
  if (!scenes || scenes.length === 0) return NextResponse.json({ error: 'sem cenas' }, { status: 400 });

  const jobId = `video-${item.slug}-${Date.now()}`;
  const manifestPath = `render-jobs/${jobId}.json`;
  const resultPath = `render-jobs/${jobId}-result.json`;

  const manifest = {
    jobId, kind: 'video', subtype: item.subtype,
    createdAt: new Date().toISOString(),
    itemId: item.id, code: item.code, title: item.title, slug: item.slug,
    width: FORMATO_VIDEO.width, height: FORMATO_VIDEO.height, fps: FORMATO_VIDEO.fps,
    brand: BRAND,
    storage: {
      bucket: process.env.SUPABASE_STORAGE_BUCKET || 'synchim-assets',
      outputPrefix: `videos/${item.slug}/${jobId}`,
      resultPath
    },
    musicUrl: item.metadata?.musicUrl ?? null,
    metadata: item.metadata ?? {},
    scenes: scenes.map((s) => ({
      idx: s.idx, layout: s.layout, body: s.body,
      design: s.design ?? {}, voiceUrl: s.voice_url, durationSec: s.duration_sec
    }))
  };

  await uploadJson(manifestPath, manifest);
  await uploadJson(resultPath, { jobId, status: 'queued', progress: 0, updatedAt: new Date().toISOString() });

  await supabase.from('render_jobs').insert({
    job_id: jobId, item_id: item.id, kind: 'video', status: 'queued', progress: 0,
    manifest_url: publicUrl(manifestPath), result_url: publicUrl(resultPath)
  });
  await supabase.from('content_items').update({ status: 'rendering', last_job_id: jobId }).eq('id', item.id);

  try {
    await dispatchWorkflow({
      workflowFile: 'render-video.yml',
      inputs: { jobId, manifestUrl: publicUrl(manifestPath) }
    });
  } catch (e: any) {
    await supabase.from('render_jobs').update({ status: 'failed', message: e.message }).eq('job_id', jobId);
    await supabase.from('content_items').update({ status: 'failed' }).eq('id', item.id);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  return NextResponse.json({ jobId });
}
