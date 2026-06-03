import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { buildCsv, setAuthorTag, type CsvCarouselPost, type CsvVideoPost, type Platform } from '@/lib/admin/metricool/builders';

export const runtime = 'nodejs';

/**
 * Gera o CSV Metricool a partir de items render-prontos.
 *
 * Body:
 *   { itemIds: string[] }  // ids de content_items
 *
 * Comportamento:
 *   - Carrega cada item + slides + output_urls
 *   - Carrosséis (type=carousel): exige output_urls.pngs[] (≥ 1)
 *   - Vídeos (type=video): exige output_urls.video
 *   - Usa scheduled_at se presente; senão data de hoje 10:00.
 *
 * Devolve text/csv com Content-Disposition: attachment.
 */
export async function POST(req: NextRequest) {
  if (!getAdminEmailFromRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null) as {
    itemIds?: string[];
    platforms?: ('ig' | 'tiktok' | 'youtube')[];  // filtra linhas no CSV
    dateFrom?: string;                             // YYYY-MM-DD, exclui anteriores
  } | null;
  if (!body?.itemIds?.length) return NextResponse.json({ error: 'itemIds em falta' }, { status: 400 });

  const platformFilter = body.platforms && body.platforms.length > 0
    ? new Set(body.platforms)
    : null;

  const supabase = createSupabaseAdmin();

  // Lê tag de menção configurada (settings.caption-author-tag)
  const { data: tagRow } = await supabase
    .from('settings').select('value').eq('key', 'caption-author-tag').maybeSingle();
  setAuthorTag((tagRow?.value as any)?.tag ?? null);

  const { data: items } = await supabase
    .from('content_items')
    .select('id, code, title, type, caption, hashtags, platforms, scheduled_at, output_urls, metadata')
    .in('id', body.itemIds);

  const carousels: CsvCarouselPost[] = [];
  const videos: CsvVideoPost[] = [];
  const skipped: { id: string; reason: string }[] = [];

  for (const it of items ?? []) {
    if (body.dateFrom && it.scheduled_at) {
      if (new Date(it.scheduled_at) < new Date(`${body.dateFrom}T00:00:00Z`)) {
        skipped.push({ id: it.id, reason: `antes de ${body.dateFrom}` });
        continue;
      }
    }
    const { date, time } = splitSchedule(it.scheduled_at);
    if (it.type === 'carousel') {
      const pngs = (it.output_urls?.pngs ?? []) as string[];
      if (!pngs.length) { skipped.push({ id: it.id, reason: 'sem PNGs renderizados' }); continue; }
      carousels.push({
        date, time,
        title: it.title,
        slides: pngs,
        jpegs: (it.output_urls?.jpegs ?? undefined) as string[] | undefined,
        caption: it.caption || it.title,
        hashtags: it.hashtags || undefined
      });
    } else if (it.type === 'video') {
      const video = it.output_urls?.video as string | undefined;
      if (!video) { skipped.push({ id: it.id, reason: 'sem MP4 renderizado' }); continue; }
      const captions: Partial<Record<Platform, string>> = {};
      const text = it.caption || it.title;
      ['ig', 'tiktok', 'youtube'].forEach((p) => { captions[p as Platform] = text; });
      videos.push({
        date, time,
        title: it.title,
        videoUrl: video,
        thumbnailUrl: it.output_urls?.thumbnail,
        captions,
        hashtags: it.hashtags || undefined,
        platforms: (it.platforms ?? []) as Platform[],
        youtubeTags: it.hashtags?.replace(/#/g, '').replace(/\s+/g, ',') || undefined,
        youtubePlaylist: it.metadata?.youtubePlaylist
      });
    }
  }

  const csv = buildCsv({
    carousels, videos,
    platformFilter: platformFilter as Set<'ig' | 'tiktok' | 'youtube'> | undefined,
  });
  const today = new Date().toISOString().slice(0, 10);
  const platformSuffix = body.platforms && body.platforms.length === 1
    ? `-${body.platforms[0]}`
    : '';
  const dateSuffix = body.dateFrom ? `-desde-${body.dateFrom}` : '';
  const filename = `synchim-metricool${platformSuffix}${dateSuffix}-${today}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Skipped': JSON.stringify(skipped)
    }
  });
}

function splitSchedule(iso: string | null): { date: string; time: string } {
  if (!iso) {
    const d = new Date();
    return { date: d.toISOString().slice(0, 10), time: '10:00' };
  }
  const d = new Date(iso);
  return {
    date: d.toISOString().slice(0, 10),
    time: d.toISOString().slice(11, 16)
  };
}
