/**
 * SyncHim · helper partilhado para despachar render de carrossel.
 *
 * Extraido de /api/admin/carrosseis/[id]/render para ser reutilizado em
 * bulk-render. Constroi manifest, sobe para Supabase Storage, cria
 * render_jobs row, marca content_items.status='rendering', dispara o
 * workflow GitHub Actions.
 */

import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { uploadJson, publicUrl } from '@/lib/admin/storage';
import { dispatchWorkflow } from '@/lib/admin/dispatch';
import { BRAND, FORMATO_CARROSSEL } from '@/lib/admin/brand';

export interface DispatchResult {
  itemId: string;
  code: string;
  jobId: string;
  manifestUrl: string;
}

export async function dispatchCarouselRender(itemId: string): Promise<DispatchResult> {
  const supabase = createSupabaseAdmin();

  const { data: item } = await supabase
    .from('content_items')
    .select('*')
    .eq('id', itemId)
    .eq('type', 'carousel')
    .maybeSingle();
  if (!item) throw new Error(`item ${itemId} nao encontrado`);

  const { data: slides } = await supabase
    .from('content_slides')
    .select('*')
    .eq('item_id', item.id)
    .order('idx', { ascending: true });
  if (!slides || slides.length === 0) {
    throw new Error(`item ${item.code} sem slides`);
  }

  const jobId = `carrossel-${item.slug}-${Date.now()}`;
  const manifestPath = `render-jobs/${jobId}.json`;
  const resultPath = `render-jobs/${jobId}-result.json`;

  const manifest = {
    jobId,
    kind: 'carousel' as const,
    createdAt: new Date().toISOString(),
    itemId: item.id,
    code: item.code,
    title: item.title,
    slug: item.slug,
    width: FORMATO_CARROSSEL.width,
    height: FORMATO_CARROSSEL.height,
    deviceScaleFactor: 2,
    brand: BRAND,
    storage: {
      bucket: process.env.SUPABASE_STORAGE_BUCKET || 'synchim-assets',
      outputPrefix: `carrosseis/${item.slug}/${jobId}`,
      resultPath,
    },
    slides: slides.map((s: any) => ({
      idx: s.idx,
      layout: s.layout,
      body: s.body,
      design: s.design ?? {},
    })),
  };

  await uploadJson(manifestPath, manifest);
  await uploadJson(resultPath, {
    jobId, status: 'queued', progress: 0, message: 'queued by /admin',
    updatedAt: new Date().toISOString(),
  });

  await supabase.from('render_jobs').insert({
    job_id: jobId,
    item_id: item.id,
    kind: 'carousel',
    status: 'queued',
    progress: 0,
    manifest_url: publicUrl(manifestPath),
    result_url: publicUrl(resultPath),
  });

  await supabase.from('content_items').update({
    status: 'rendering', last_job_id: jobId,
  }).eq('id', item.id);

  try {
    await dispatchWorkflow({
      workflowFile: 'render-carrossel.yml',
      inputs: { jobId, manifestUrl: publicUrl(manifestPath) },
    });
  } catch (e: any) {
    await supabase.from('render_jobs').update({
      status: 'failed', message: e.message,
    }).eq('job_id', jobId);
    await supabase.from('content_items').update({ status: 'failed' }).eq('id', item.id);
    throw e;
  }

  return { itemId: item.id, code: item.code, jobId, manifestUrl: publicUrl(manifestPath) };
}
