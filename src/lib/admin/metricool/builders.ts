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

/**
 * Adiciona a mention (@handle) configurada via env CAPTION_AUTHOR_TAG.
 * Detectada na caption (case-insensitive) — nao duplica se ja la estiver.
 * Vazio ou ausente = no-op.
 */
function appendAuthorTag(caption: string): string {
  const tag = process.env.CAPTION_AUTHOR_TAG?.trim();
  if (!tag) return caption;
  const tagNormalized = tag.toLowerCase();
  if (caption.toLowerCase().includes(tagNormalized)) return caption;
  return `${caption}\n\n${tag}`;
}

function appendHashtags(caption: string, hashtags?: string): string {
  const withTag = appendAuthorTag(caption);
  if (!hashtags?.trim()) return withTag;
  return `${withTag}\n\n${hashtags.trim()}`;
}

/** 2 linhas por carrossel: IG CAROUSEL + TikTok (sempre). */
export function buildCarouselRows(post: CsvCarouselPost): string[][] {
  const date = normalizeDate(post.date);
  const time = normalizeTime(post.time || '12:00');
  const rows: string[][] = [];

  // Linha IG
  const ig = makeRow();
  ig.set('Date', date);
  ig.set('Time', time);
  ig.set('Text', appendHashtags(post.caption, post.hashtags));
  ig.set('Instagram', 'TRUE');
  ig.set('Instagram Post Type', 'CAROUSEL');
  ig.set('Instagram Show Reel On Feed', 'TRUE');
  post.slides.slice(0, 10).forEach((url, i) => ig.set(`Picture Url ${i + 1}`, url));
  if (post.firstComment) ig.set('First Comment Text', post.firstComment);
  rows.push(ig.row);

  // Linha TikTok
  const tk = makeRow();
  tk.set('Date', date);
  tk.set('Time', time);
  tk.set('Text', appendHashtags(post.caption, post.hashtags));
  tk.set('TikTok', 'TRUE');
  tk.set('TikTok Post Privacy', 'PUBLIC_TO_EVERYONE');
  tk.set('TikTok Auto Add Music', 'FALSE');
  tk.set('TikTok is AI generated content', 'FALSE');
  tk.set('TikTok disable comments', 'FALSE');
  tk.set('TikTok disable duet', 'TRUE');
  tk.set('TikTok disable stitch', 'TRUE');
  tk.set('TikTok Branded Content', 'FALSE');
  tk.set('TikTok Title', post.title);
  post.slides.slice(0, 10).forEach((url, i) => tk.set(`Picture Url ${i + 1}`, url));
  rows.push(tk.row);

  return rows;
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
  for (const p of opts.carousels ?? []) rows.push(...buildCarouselRows(p));
  for (const p of opts.videos ?? []) rows.push(...buildVideoRows(p));
  return serializeCsv(rows);
}
