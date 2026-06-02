import { NextRequest, NextResponse } from 'next/server';
import { isWorkerAuthenticated } from '@/lib/admin/worker-auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { buildCampaignPlan, knotForSlot } from '@/lib/admin/calendar-plan';
import { generateCarousel, generateReel } from '@/lib/admin/content-generator';
import { generateImage } from '@/lib/admin/replicate';
import { findReusableImage, type SlideLayout, type SlotCategoria } from '@/lib/admin/image-pool';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/admin/campaigns/process-slot
 * Auth: X-Worker-Token
 * Body: { jobId, slotIndex }
 *
 * Worker callback: processa 1 slot completo (texto + imagens conforme
 * settings do job). Actualiza campaign_jobs.progress/current_slot/items_created.
 *
 * Devolve { ok, code, generated, reused, failed } ou { error }.
 */
export async function POST(req: NextRequest) {
  if (!isWorkerAuthenticated(req)) {
    return NextResponse.json({ error: 'unauthorized worker' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    jobId?: string;
    slotIndex?: number;
  } | null;

  if (!body?.jobId || typeof body.slotIndex !== 'number') {
    return NextResponse.json({ error: 'jobId + slotIndex obrigatorios' }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const { data: job, error: jobErr } = await supabase
    .from('campaign_jobs')
    .select('*')
    .eq('job_id', body.jobId)
    .single();
  if (jobErr || !job) {
    return NextResponse.json({ error: `job nao encontrado: ${jobErr?.message}` }, { status: 404 });
  }

  const settings = job.settings as {
    startDate: string;
    weeksCount: number;
    autoImages: boolean;
    model: string;
    reuseStrategy: 'prefer-existing' | 'always-new' | 'reuse-only';
    kindFilter?: Array<'carousel' | 'reel'>;
  };
  const plan = buildCampaignPlan(settings.weeksCount, settings.kindFilter);
  if (body.slotIndex < 0 || body.slotIndex >= plan.length) {
    return NextResponse.json({ error: `slotIndex ${body.slotIndex} fora de range` }, { status: 400 });
  }

  const slot = plan[body.slotIndex];
  const knot = knotForSlot(body.slotIndex);

  // Primeiro tick: marca running
  if (job.status === 'queued') {
    await supabase
      .from('campaign_jobs')
      .update({ status: 'running', message: 'worker started' })
      .eq('job_id', body.jobId);
  }

  // Constroi scheduled_at em CAT
  const tzOffset = process.env.CAMPAIGN_TZ_OFFSET || '+02:00';
  const start = new Date(`${settings.startDate}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() + slot.dayOffset);
  const dateOnly = start.toISOString().slice(0, 10);
  const [h, m] = slot.time.split(':').map(Number);
  const scheduledAt = `${dateOnly}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00${tzOffset}`;

  // Bifurca: reel kinetic ou carrossel
  if (slot.kind === 'reel') {
    let reel;
    try {
      reel = await generateReel(knot, slot.dayOfWeek);
    } catch (err: any) {
      return await fail(supabase, body.jobId, `Reel Claude: ${err.message}`);
    }
    const code = await nextCode(supabase, 'SV-');
    const slug = slugify(reel.title);
    const { data: item, error: itemErr } = await supabase
      .from('content_items')
      .insert({
        type: 'video', subtype: 'kinetic-text',
        title: reel.title, slug, categoria: slot.type, code,
        target: 'ambos', status: 'draft',
        platforms: ['ig', 'tiktok'],
        scheduled_at: scheduledAt,
        caption: reel.caption, hashtags: reel.hashtags,
        metadata: { campaignWeek: slot.weekIndex, campaignWeeks: settings.weeksCount, campaignJobId: body.jobId, knot },
      })
      .select().single();
    if (itemErr || !item) return await fail(supabase, body.jobId, `Insert reel: ${itemErr?.message}`);

    const sceneRows = reel.scenes.map((s, idx) => ({
      item_id: item.id, idx, layout: 'kinetic-line', body: s.text,
      design: s.emphasis ? { emphasis: s.emphasis } : {},
    }));
    await supabase.from('content_slides').insert(sceneRows);

    // Update progress + skip generate-images (nao aplica a reels)
    const prevItems = Array.isArray(job.items_created) ? job.items_created : [];
    const newItems = [...prevItems, { code, id: item.id, slotIndex: body.slotIndex, kind: 'reel' }];
    const progress = Math.round(((body.slotIndex + 1) / job.total_slots) * 100);
    await supabase.from('campaign_jobs').update({
      progress, current_slot: body.slotIndex + 1, items_created: newItems,
      message: `slot ${body.slotIndex + 1}/${job.total_slots} · ${code} (reel)`,
    }).eq('job_id', body.jobId);

    if (body.slotIndex + 1 >= job.total_slots) {
      await supabase.from('campaign_jobs').update({
        status: 'done', finished_at: new Date().toISOString(),
        message: `concluido: ${newItems.length} items criados`,
      }).eq('job_id', body.jobId);
    }
    return NextResponse.json({ ok: true, code, itemId: item.id, slotIndex: body.slotIndex, kind: 'reel' });
  }

  // Carrossel: gera texto com retry para image coverage
  let carousel;
  try {
    carousel = await generateCarousel(slot.type as any, knot, slot.dayOfWeek);
  } catch (err: any) {
    if (err?.code === 'IMAGE_COVERAGE') {
      try { carousel = await generateCarousel(slot.type as any, knot, slot.dayOfWeek); }
      catch (err2: any) {
        return await fail(supabase, body.jobId, `Claude IMAGE_COVERAGE 2x: ${err2.message}`);
      }
    } else {
      return await fail(supabase, body.jobId, `Claude: ${err.message}`);
    }
  }

  // Cria item + slides
  const code = await nextCode(supabase, 'SC-');
  const slug = slugify(carousel.title);
  const { data: item, error: itemErr } = await supabase
    .from('content_items')
    .insert({
      type: 'carousel',
      title: carousel.title,
      slug,
      categoria: slot.type,
      code,
      target: 'ambos',
      status: 'draft',
      platforms: ['ig', 'tiktok'],
      scheduled_at: scheduledAt,
      caption: carousel.caption,
      hashtags: carousel.hashtags,
      metadata: { campaignWeek: slot.weekIndex, campaignWeeks: settings.weeksCount, campaignJobId: body.jobId },
    })
    .select()
    .single();
  if (itemErr || !item) {
    return await fail(supabase, body.jobId, `Supabase insert: ${itemErr?.message}`);
  }

  const slideRows = carousel.slides.map((s, idx) => {
    const prompt = (s.imagePrompt ?? '').trim();
    return {
      item_id: item.id,
      idx,
      layout: s.layout,
      body: s.body,
      design: prompt ? { imagePrompt: prompt } : {},
    };
  });
  await supabase.from('content_slides').insert(slideRows);

  // Imagens (se autoImages e estratégia permite)
  let reused = 0;
  let generated = 0;
  let imgFailed = 0;
  if (settings.autoImages) {
    const { data: createdSlides } = await supabase
      .from('content_slides')
      .select('id, item_id, idx, layout, design')
      .eq('item_id', item.id)
      .order('idx', { ascending: true });
    const pending = (createdSlides ?? []).filter(
      (s: any) => s.design?.imagePrompt && !s.design?.imageUrl,
    );

    const usedInRun = new Set<string>();
    for (const s of pending as any[]) {
      // tentativa de reuso
      let imageUrl: string | null = null;
      let isReused = false;
      if (settings.reuseStrategy !== 'always-new') {
        imageUrl = await findReusableImage(
          s.layout as SlideLayout,
          item.categoria as SlotCategoria,
          usedInRun,
        );
        if (imageUrl) {
          usedInRun.add(imageUrl);
          isReused = true;
        }
      }
      // gera nova se nao houver reuso e estrategia permite
      if (!imageUrl && settings.reuseStrategy !== 'reuse-only') {
        try {
          const img = await generateImage(s.design.imagePrompt as string, {
            aspectRatio: '4:5',
            model: settings.model,
            storagePath: `carrosseis/${item.id}/slide-${String(s.idx + 1).padStart(2, '0')}.png`,
          });
          imageUrl = img.url;
        } catch (e) {
          imgFailed++;
          continue;
        }
      }
      if (imageUrl) {
        await supabase
          .from('content_slides')
          .update({ design: { ...s.design, imageUrl, ...(isReused ? { reused: true } : {}) } })
          .eq('id', s.id);
        if (isReused) reused++; else generated++;
      }
    }
  }

  // Update job: progress + items_created
  const prevItems = Array.isArray(job.items_created) ? job.items_created : [];
  const newItems = [...prevItems, { code, id: item.id, slotIndex: body.slotIndex }];
  const progress = Math.round(((body.slotIndex + 1) / job.total_slots) * 100);
  await supabase
    .from('campaign_jobs')
    .update({
      progress,
      current_slot: body.slotIndex + 1,
      items_created: newItems,
      message: `slot ${body.slotIndex + 1}/${job.total_slots} · ${code} (reused ${reused}, generated ${generated})`,
    })
    .eq('job_id', body.jobId);

  // Ultimo slot: marca done
  if (body.slotIndex + 1 >= job.total_slots) {
    await supabase
      .from('campaign_jobs')
      .update({
        status: 'done',
        finished_at: new Date().toISOString(),
        message: `concluido: ${newItems.length} carrosseis criados`,
      })
      .eq('job_id', body.jobId);
  }

  return NextResponse.json({
    ok: true,
    code,
    itemId: item.id,
    slotIndex: body.slotIndex,
    reused,
    generated,
    imgFailed,
  });
}

async function fail(supabase: any, jobId: string, message: string) {
  await supabase
    .from('campaign_jobs')
    .update({
      status: 'failed',
      error: message,
      finished_at: new Date().toISOString(),
    })
    .eq('job_id', jobId);
  return NextResponse.json({ error: message }, { status: 500 });
}

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);
}

async function nextCode(supabase: any, prefix: 'SC-' | 'SV-'): Promise<string> {
  const { data } = await supabase.from('content_items').select('code')
    .like('code', `${prefix}%`).order('code', { ascending: false }).limit(1);
  const last = data?.[0]?.code as string | undefined;
  const num = last ? parseInt(last.split('-')[1], 10) + 1 : 1;
  return `${prefix}${String(num).padStart(3, '0')}`;
}
