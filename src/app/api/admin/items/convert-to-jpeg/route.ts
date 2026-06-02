import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { storageBucket, publicUrl } from '@/lib/admin/storage';
import sharp from 'sharp';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/admin/items/convert-to-jpeg
 * Body: { itemId: string }
 *
 * Para 1 item rendered: descarrega cada PNG em output_urls.pngs, converte
 * para JPEG via Sharp (qualidade 88), faz upload como .jpg ao lado do .png,
 * grava o array de URLs JPEG em content_items.output_urls.jpegs.
 *
 * Necessario porque o Supabase Storage transform endpoint (que dava
 * conversao on-the-fly) requer plano Pro — em free devolve 404.
 *
 * Frontend chama 1 vez por item em loop sequencial.
 *
 * Devolve { itemId, converted, skipped, errors }.
 */
export async function POST(req: NextRequest) {
  if (!getAdminEmailFromRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { itemId?: string } | null;
  if (!body?.itemId) return NextResponse.json({ error: 'itemId em falta' }, { status: 400 });

  const supabase = createSupabaseAdmin();
  const { data: item, error: itemErr } = await supabase
    .from('content_items')
    .select('id, output_urls')
    .eq('id', body.itemId)
    .single();
  if (itemErr || !item) {
    return NextResponse.json({ error: `item nao encontrado: ${itemErr?.message}` }, { status: 404 });
  }

  const pngs: string[] = item.output_urls?.pngs ?? [];
  if (!pngs.length) {
    return NextResponse.json({ itemId: body.itemId, converted: 0, skipped: 0, reason: 'sem pngs' });
  }

  const existingJpegs: string[] = item.output_urls?.jpegs ?? [];
  if (existingJpegs.length === pngs.length) {
    return NextResponse.json({ itemId: body.itemId, converted: 0, skipped: pngs.length, reason: 'ja convertido' });
  }

  // Converte em paralelo (limite 8 = numero tipico de slides)
  const results = await Promise.allSettled(
    pngs.map(async (pngUrl) => {
      const res = await fetch(pngUrl);
      if (!res.ok) throw new Error(`fetch ${pngUrl}: HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const jpegBuf = await sharp(buf).jpeg({ quality: 88, mozjpeg: true }).toBuffer();

      // Path: substitui .png por .jpg, mantem mesmo prefix
      const jpegPath = extractStoragePath(pngUrl).replace(/\.png$/i, '.jpg');
      const { error: upErr } = await supabase.storage
        .from(storageBucket())
        .upload(jpegPath, jpegBuf, {
          contentType: 'image/jpeg',
          upsert: true,
        });
      if (upErr) throw new Error(`upload: ${upErr.message}`);
      return publicUrl(jpegPath);
    }),
  );

  const jpegs = results.map((r) => (r.status === 'fulfilled' ? r.value : null)).filter(Boolean) as string[];
  const errors = results
    .map((r, i) => (r.status === 'rejected' ? { idx: i, error: (r.reason as Error).message } : null))
    .filter(Boolean);

  await supabase
    .from('content_items')
    .update({ output_urls: { ...item.output_urls, jpegs } })
    .eq('id', body.itemId);

  return NextResponse.json({
    itemId: body.itemId,
    converted: jpegs.length,
    skipped: 0,
    failed: errors.length,
    errors,
  });
}

/**
 * Extrai o path interno do bucket de uma URL Supabase Storage publica.
 * https://x.supabase.co/storage/v1/object/public/synchim-assets/foo/bar.png
 * → foo/bar.png
 */
function extractStoragePath(url: string): string {
  const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
  if (!match) throw new Error(`URL nao parsavel: ${url}`);
  return match[1];
}
