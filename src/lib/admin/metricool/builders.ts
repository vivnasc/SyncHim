/**
 * Builders por contexto. Cada um decide:
 *   - Quais plataformas activar (TRUE/FALSE)
 *   - Qual caption vai em `Text` por plataforma
 *   - Que campos específicos da plataforma preencher
 *
 * Padrão: 1 linha por (post × plataforma).
 *
 * Para SyncHim temos dois contextos:
 *   - carousel (foto, 2-10 slides) → IG CAROUSEL (TikTok não suporta
 *     import de fotos via CSV no Metricool de forma fiável; fica IG-only)
 *   - video (1 MP4 9:16) → IG REEL + TikTok + YouTube Shorts
 */

import { makeRow, normalizeDate, normalizeTime, serializeCsv } from './csv';

export type Platform = 'ig' | 'tiktok' | 'youtube';

export type CsvCarouselPost = {
  date: string;            // YYYY-MM-DD
  time?: string;           // HH:MM (default 10:00)
  title: string;
  slides: string[];        // URLs dos PNGs ordenados (max 10 no IG)
  caption: string;
  hashtags?: string;
  firstComment?: string;
};

export type CsvVideoPost = {
  date: string;
  time?: string;
  title: string;
  videoUrl: string;        // MP4 9:16
  thumbnailUrl?: string;
  captions: Partial<Record<Platform, string>>;
  hashtags?: string;
  platforms: Platform[];
  youtubeTags?: string;
  youtubePlaylist?: string;
};

function appendHashtags(caption: string, hashtags?: string): string {
  if (!hashtags?.trim()) return caption;
  return `${caption}\n\n${hashtags.trim()}`;
}

/** Linha IG para carrossel-foto. */
export function buildCarouselRow(post: CsvCarouselPost): string[] {
  const { row, set } = makeRow();
  set('Date', normalizeDate(post.date));
  set('Time', normalizeTime(post.time || '10:00'));
  set('Text', appendHashtags(post.caption, post.hashtags));
  set('Instagram', 'TRUE');
  set('Instagram Post Type', 'CAROUSEL');
  set('Instagram Show Reel On Feed', 'TRUE');
  // Slides em Picture Url 1..N (max 10 no IG)
  post.slides.slice(0, 10).forEach((url, i) => set(`Picture Url ${i + 1}`, url));
  if (post.firstComment) set('First Comment Text', post.firstComment);
  return row;
}

/** Uma linha por plataforma para vídeo MP4 9:16. */
export function buildVideoRows(post: CsvVideoPost): string[][] {
  const rows: string[][] = [];
  const date = normalizeDate(post.date);
  const time = normalizeTime(post.time || '10:00');

  for (const platform of post.platforms) {
    const { row, set } = makeRow();
    set('Date', date);
    set('Time', time);
    set('Video Thumbnail Url', post.thumbnailUrl);
    set('Picture Url 1', post.videoUrl);

    if (platform === 'ig') {
      set('Instagram', 'TRUE');
      set('Instagram Post Type', 'REEL');
      set('Instagram Show Reel On Feed', 'TRUE');
      set('Text', appendHashtags(post.captions.ig || '', post.hashtags));
    } else if (platform === 'tiktok') {
      set('TikTok', 'TRUE');
      set('TikTok Post Privacy', 'PUBLIC_TO_EVERYONE');
      set('TikTok Auto Add Music', 'FALSE');
      set('TikTok is AI generated content', 'FALSE');
      // Semântica invertida: estes campos são `disable_*`, não `allow_*`.
      set('TikTok disable comments', 'FALSE');
      set('TikTok disable duet', 'TRUE');
      set('TikTok disable stitch', 'TRUE');
      set('TikTok Branded Content', 'FALSE');
      set('TikTok Title', post.title);
      set('Text', appendHashtags(post.captions.tiktok || '', post.hashtags));
    } else if (platform === 'youtube') {
      set('Youtube', 'TRUE');
      set('Youtube Video Type', 'SHORTS');
      set('Youtube Video Privacy', 'PUBLIC');
      set('Youtube video for kids', 'FALSE');
      set('Youtube Video Title', post.title);
      // O Metricool não tem coluna "Description" — o corpo vai em `Text`.
      if (post.youtubeTags) set('Youtube Video Tags', post.youtubeTags);
      if (post.youtubePlaylist) set('Youtube playlist', post.youtubePlaylist);
      set('Text', post.captions.youtube || '');
    }

    rows.push(row);
  }
  return rows;
}

export function buildCsv(opts: {
  carousels?: CsvCarouselPost[];
  videos?: CsvVideoPost[];
}): string {
  const rows: string[][] = [];
  for (const p of opts.carousels ?? []) rows.push(buildCarouselRow(p));
  for (const p of opts.videos ?? []) rows.push(...buildVideoRows(p));
  return serializeCsv(rows);
}
