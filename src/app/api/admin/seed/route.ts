import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { softenForSingle } from '@/lib/admin/soften-for-single';

export const runtime = 'nodejs';

/**
 * Faz parsing dos markdowns em assets/insta-60-carrosseis/ e cria
 * um item + slides por carrossel. Idempotente por code (SC-NNN).
 *
 * Importa todos como `target='ambos'`, neutralizando o texto via
 * softenForSingle (marido → ele, casamento → relação, esposa →
 * mulher). Razão: o produto serve ambos os públicos com a mesma
 * voz e um item deve servir os dois. Quando um carrossel específico
 * precisar de duas variantes, há um botão "duplicar" no editor.
 */
export async function POST(req: NextRequest) {
  if (!getAdminEmailFromRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const supabase = createSupabaseAdmin();

  const sources: { file: string; categoria: string | null; codeBase: number }[] = [
    { file: 'assets/insta-60-carrosseis/insta-60-carrosseis/carrosseis-didaticos.md',     categoria: null,             codeBase: 1  },
    { file: 'assets/insta-60-carrosseis/insta-60-carrosseis/carrosseis-reconhecimento.md', categoria: 'reconhecimento', codeBase: 41 },
    { file: 'assets/insta-60-carrosseis/insta-60-carrosseis/carrosseis-cta.md',           categoria: 'cta',            codeBase: 56 }
  ];

  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;
  let parsed = 0;
  let missingFiles = 0;

  for (const src of sources) {
    const full = path.join(process.cwd(), src.file);
    const text = await fs.readFile(full, 'utf-8').catch(() => '');
    if (!text) { missingFiles++; errors.push(`ficheiro em falta: ${src.file}`); continue; }

    const carrosseis = parseCarrosseis(text);
    parsed += carrosseis.length;

    for (const c of carrosseis) {
      const codeNum = c.postNumber ?? (src.codeBase + carrosseis.indexOf(c));
      const code = `SC-${String(codeNum).padStart(3, '0')}`;

      const { data: existing, error: lookupError } = await supabase
        .from('content_items').select('id').eq('code', code).maybeSingle();
      if (lookupError) {
        // Mais provável: tabela synchim.content_items não existe → migration por aplicar.
        return reportError(req, lookupError.message, {
          hint: 'Aplica supabase/admin-schema.sql no SQL editor do Supabase e confirma que synchim está em "Exposed schemas".'
        });
      }
      if (existing) { skipped++; continue; }

      const categoria = src.categoria ?? guessCategoria(codeNum);

      const { data: item, error: insertError } = await supabase
        .from('content_items')
        .insert({
          type: 'carousel',
          code,
          title: softenForSingle(c.title),
          slug: slugify(c.title) || code.toLowerCase(),
          categoria,
          target: 'ambos',
          status: 'draft',
          caption: c.caption ? softenForSingle(c.caption) : null,
          hashtags: c.hashtags ?? null,
          platforms: ['ig', 'tiktok']
        })
        .select()
        .single();
      if (insertError || !item) {
        errors.push(`fail ${code}: ${insertError?.message}`);
        continue;
      }

      const rows = c.slides.map((body, i) => ({
        item_id: item.id,
        idx: i,
        layout: i === 0 ? 'capa' : (i === c.slides.length - 1 ? 'cta' : 'conteudo'),
        body: softenForSingle(body),
        design: {}
      }));
      if (rows.length > 0) await supabase.from('content_slides').insert(rows);

      imported++;
    }
  }

  // Redireccionar com um query param para a UI mostrar o resumo.
  const url = new URL('/admin/carrosseis', req.url);
  url.searchParams.set('seed', `${imported}/${parsed}`);
  if (skipped > 0) url.searchParams.set('skipped', String(skipped));
  if (missingFiles > 0) url.searchParams.set('missing', String(missingFiles));
  if (errors.length > 0) url.searchParams.set('errors', String(errors.length));
  return NextResponse.redirect(url, { status: 303 });
}

function reportError(req: NextRequest, message: string, opts: { hint?: string } = {}) {
  const url = new URL('/admin/carrosseis', req.url);
  url.searchParams.set('seed_error', message.slice(0, 200));
  if (opts.hint) url.searchParams.set('seed_hint', opts.hint);
  return NextResponse.redirect(url, { status: 303 });
}

function parseCarrosseis(text: string) {
  const blocks = text.split(/\n---\n/);
  const out: { title: string; postNumber: number | null; slides: string[]; caption?: string; hashtags?: string }[] = [];

  for (const block of blocks) {
    const titleMatch = block.match(/^##\s+(?:POST|CARROSSEL)\s+(\d+)\s*[—\-:]\s*(.+)$/im);
    if (!titleMatch) continue;
    const postNumber = parseInt(titleMatch[1], 10);
    const rawTitle = titleMatch[2].trim().replace(/^["“]|["”]$/g, '');

    // Slides: aceita `### Slide N` ou `**Slide N (capa)**:`
    const slidePattern = /(?:^###\s+Slide\s+\d+[^\n]*$|^\*\*Slide\s+\d+[^*]*\*\*:?)/gim;
    const parts = block.split(slidePattern).slice(1);
    const captionIdx = parts.findIndex((p) => /^###?\s+Caption/im.test(p) || p.includes('### Caption'));
    let slides = parts;
    let caption: string | undefined;
    let hashtags: string | undefined;
    if (captionIdx >= 0) {
      const last = slides[captionIdx];
      slides = slides.slice(0, captionIdx);
      const captionMatch = last.match(/(?:###?\s+Caption[^\n]*\n)([\s\S]*?)(?:\n###|$)/i);
      caption = captionMatch?.[1]?.trim();
      const hashMatch = last.match(/###?\s+Hashtags[^\n]*\n([\s\S]*?)$/i);
      hashtags = hashMatch?.[1]?.trim();
    }

    const cleanSlides = slides
      .map(stripSlideBody)
      .filter((s) => s.length > 0);

    if (cleanSlides.length === 0) continue;
    out.push({ title: rawTitle, postNumber, slides: cleanSlides, caption, hashtags });
  }
  return out;
}

function stripSlideBody(s: string): string {
  // Apaga blocos de imagem-base, headings vazios, prefixos `> `
  return s
    .replace(/\*\*Imagem-base:[^\n]*\n?/gi, '')
    .replace(/^#+\s.*$/gm, '')
    .split('\n')
    .map((l) => l.replace(/^>\s?/, ''))
    .join('\n')
    .trim();
}

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);
}

function guessCategoria(n: number): string {
  if (n <= 10) return 'didatico-A';
  if (n <= 20) return 'didatico-B';
  if (n <= 30) return 'didatico-C';
  if (n <= 40) return 'didatico-D';
  if (n <= 55) return 'reconhecimento';
  return 'cta';
}
