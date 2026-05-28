import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { generateImage } from '@/lib/admin/replicate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Diagnostico do Replicate. Gera 1 imagem rapida com Flux Schnell para
 * confirmar que REPLICATE_API_TOKEN e valido e que a rede + upload Supabase
 * estao a funcionar end-to-end.
 */
export async function GET(req: NextRequest) {
  if (!getAdminEmailFromRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const keyPresent = !!process.env.REPLICATE_API_TOKEN;
  const keyPrefix = (process.env.REPLICATE_API_TOKEN ?? '').slice(0, 6);
  const model = process.env.REPLICATE_MODEL || 'black-forest-labs/flux-schnell';

  if (!keyPresent) {
    return NextResponse.json(
      { ok: false, stage: 'env', error: 'REPLICATE_API_TOKEN ausente.', model },
      { status: 503 },
    );
  }

  const t0 = Date.now();
  try {
    const img = await generateImage(
      'a single golden persian star floating in deep maroon darkness, cinematic, intimate',
      {
        aspectRatio: '4:5',
        storagePath: `tests/replicate-ping-${Date.now()}.png`,
      },
    );
    return NextResponse.json({
      ok: true,
      stage: 'success',
      model: img.model,
      url: img.url,
      latencyMs: Date.now() - t0,
      keyPrefix: keyPrefix + '...',
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        stage: 'replicate',
        model,
        latencyMs: Date.now() - t0,
        keyPrefix: keyPrefix + '...',
        error: err?.message ?? 'erro desconhecido',
      },
      { status: 500 },
    );
  }
}
