/**
 * SyncHim · Metricool CSV importer
 *
 * Padrão herdado do repo Escola dos Véus (carousel-social/metricool-csv.ts).
 * O Metricool aceita o CSV via Planning → Calendar → Import CSV; este
 * módulo só gera o ficheiro. Sem API. Sem OAuth. Custo zero.
 *
 * Armadilhas comprovadas:
 *  - 1 linha por (post × plataforma); NÃO 1 linha com flags múltiplas.
 *  - `Time` exige HH:MM:SS (sufixar :00 se vier HH:MM).
 *  - `Date` em YYYY-MM-DD; Metricool converte para o fuso da conta.
 *  - Cada plataforma activa = "TRUE", outras = "FALSE" (não vazias).
 *  - Vídeo MP4 vai em `Picture Url 1` (o nome é confuso, mas é correcto).
 *  - Linhas separadas por CRLF; ficheiro termina com CRLF.
 *  - `csvEscape` quoting RFC-4180: aspas se contém vírgula, aspas, \n ou \r.
 *
 * ⚠️ CSV_HEADER abaixo é PLACEHOLDER. Antes do primeiro export real:
 *    1. Carrega um CSV vazio no painel Metricool (Planning → Import CSV).
 *    2. Copia a linha de cabeçalho exacta.
 *    3. Substitui o array `CSV_HEADER` por essa lista.
 *    4. Confirma que `CSV_HEADER.length === 93` (ou o valor actual).
 *
 *    Sem este passo, o Metricool aceita o ficheiro mas cria posts em
 *    draft sem erro visível.
 */

/**
 * Header oficial do Metricool (93 colunas), confirmado pela editora ao
 * descarregar um CSV vazio do painel. Ver `csv_data.csv` na raiz do repo.
 *
 * Notas:
 *   - `Twitter/X` (com a barra) é o nome exacto da coluna.
 *   - `GBP` = Google Business Profile.
 *   - `First Comment Text` (não "First Comment").
 *   - TikTok usa `disable comments|duet|stitch` (não "Allow Comments" como
 *     nos repos antigos do Véus). A semântica é invertida.
 *   - Não há colunas Mastodon nem GoogleMyBusiness Cta/Event/Offer neste
 *     header — o painel da Vivianne tem só estas 11 plataformas activas.
 */
export const CSV_HEADER: string[] = [
  'Text',
  'Date',
  'Time',
  'Draft',
  'Facebook',
  'Twitter/X',
  'LinkedIn',
  'GBP',
  'Instagram',
  'Pinterest',
  'TikTok',
  'Youtube',
  'Threads',
  'Bluesky',
  'Picture Url 1',
  'Picture Url 2',
  'Picture Url 3',
  'Picture Url 4',
  'Picture Url 5',
  'Picture Url 6',
  'Picture Url 7',
  'Picture Url 8',
  'Picture Url 9',
  'Picture Url 10',
  'Alt text picture 1',
  'Alt text picture 2',
  'Alt text picture 3',
  'Alt text picture 4',
  'Alt text picture 5',
  'Alt text picture 6',
  'Alt text picture 7',
  'Alt text picture 8',
  'Alt text picture 9',
  'Alt text picture 10',
  'Document title',
  'Shortener',
  'Video Thumbnail Url',
  'Video Cover Frame',
  'Twitter/X Can reply',
  'Twitter/X Type',
  'Twitter/X Poll Duration minutes',
  'Twitter/X Poll Option 1',
  'Twitter/X Poll Option 2',
  'Twitter/X Poll Option 3',
  'Twitter/X Poll Option 4',
  'Pinterest Board',
  'Pinterest Pin Title',
  'Pinterest Pin Link',
  'Pinterest Pin New Format',
  'Instagram Post Type',
  'Instagram Show Reel On Feed',
  'Youtube Video Title',
  'Youtube Video Type',
  'Youtube Video Privacy',
  'Youtube video for kids',
  'Youtube Video Category',
  'Youtube Video Tags',
  'Youtube playlist',
  'GBP Post Type',
  'Facebook Post Type',
  'Facebook Title',
  'First Comment Text',
  'TikTok Title',
  'TikTok disable comments',
  'TikTok disable duet',
  'TikTok disable stitch',
  'TikTok Post Privacy',
  'TikTok Branded Content',
  'TikTok Your Brand',
  'TikTok Auto Add Music',
  'TikTok Photo Cover Index',
  'TikTok musicId',
  'TikTok music title',
  'TikTok music author',
  'TikTok music previewUrl',
  'TikTok music thumbnailUrl',
  'TikTok music soundVolume',
  'TikTok music originalVolume',
  'TikTok music startMillis',
  'TikTok music endMillis',
  'TikTok is AI generated content',
  'LinkedIn Type',
  'LinkedIn Poll Question',
  'LinkedIn Poll Option 1',
  'LinkedIn Poll Option 2',
  'LinkedIn Poll Option 3',
  'LinkedIn Poll Option 4',
  'LinkedIn Poll Duration',
  'LinkedIn Show link preview',
  'LinkedIn Images as Carousel',
  'Threads Reply Control',
  'Threads Is Spoiler',
  'Threads Post Type'
];

export const PLATAFORMA_FLAGS = [
  'Facebook', 'Twitter/X', 'LinkedIn', 'GBP', 'Instagram',
  'Pinterest', 'TikTok', 'Youtube', 'Threads', 'Bluesky'
] as const;

/** RFC-4180 quoting. Envolve em aspas se necessário, duplica internas. */
export function csvEscape(value: unknown): string {
  if (value == null) return '';
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/** Garante HH:MM:SS para o campo `Time`. */
export function normalizeTime(t: string): string {
  if (!t) return '10:00:00';
  if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(t)) return t;
  // ISO datetime? extrair HH:MM
  const m = t.match(/T(\d{2}:\d{2})/);
  if (m) return `${m[1]}:00`;
  return '10:00:00';
}

/** Garante YYYY-MM-DD. */
export function normalizeDate(d: string): string {
  if (!d) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  return new Date(d).toISOString().slice(0, 10);
}

/**
 * Helper para construir uma linha do CSV. Devolve um array do mesmo tamanho
 * que CSV_HEADER, com `col(name, value)` para preencher por nome.
 */
export function makeRow() {
  const row: string[] = new Array(CSV_HEADER.length).fill('');
  const indexByName = new Map<string, number>();
  CSV_HEADER.forEach((h, i) => indexByName.set(h, i));

  function set(name: string, value: unknown): void {
    const i = indexByName.get(name);
    if (i == null) {
      // Coluna desconhecida — provavelmente o header local ficou desalinhado.
      // Logamos em vez de explodir para não bloquear o export inteiro.
      console.warn(`[metricool] coluna desconhecida: ${name}`);
      return;
    }
    row[i] = value == null ? '' : String(value);
  }

  // Marca todas as plataformas como FALSE por defeito (evita campos vazios).
  for (const p of PLATAFORMA_FLAGS) set(p, 'FALSE');
  set('Draft', 'FALSE');

  return { row, set };
}

/** Serializa o CSV final com CRLF e CRLF terminal. */
export function serializeCsv(rows: string[][]): string {
  const lines = [CSV_HEADER.map(csvEscape).join(',')];
  for (const r of rows) lines.push(r.map(csvEscape).join(','));
  return lines.join('\r\n') + '\r\n';
}
