import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { publicUrl, storageBucket } from '@/lib/admin/storage';
import { ttsWithTimestamps } from '@/lib/admin/elevenlabs-timestamps';

export const runtime = 'nodejs';

/**
 * Gera narração TTS para uma cena (ElevenLabs with-timestamps) e
 * persiste o MP3 em Supabase Storage. Devolve o URL, duração estimada
 * e word-level timings que ficam guardados em design.wordTimes para
 * o karaoke kinetic.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminEmailFromRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null) as { sceneIdx?: number; text?: string } | null;
  if (body?.sceneIdx == null || !body.text) return NextResponse.json({ error: 'sceneIdx/text em falta' }, { status: 400 });

  let result;
  try {
    result = await ttsWithTimestamps(body.text);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  const supabase = createSupabaseAdmin();
  const path = `videos/${params.id}/voice/cena-${String(body.sceneIdx + 1).padStart(2, '0')}.mp3`;
  const { error } = await supabase.storage.from(storageBucket()).upload(path, result.audio, {
    contentType: 'audio/mpeg', upsert: true
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Persistir wordTimes em design da cena para o karaoke
  const { data: scene } = await supabase
    .from('content_slides')
    .select('id, design')
    .eq('item_id', params.id)
    .eq('idx', body.sceneIdx)
    .maybeSingle();
  const url = publicUrl(path);
  if (scene) {
    await supabase.from('content_slides').update({
      voice_url: url,
      duration_sec: result.durationSec,
      design: { ...(scene.design ?? {}), wordTimes: result.wordTimes },
    }).eq('id', scene.id);
  }

  return NextResponse.json({
    url,
    durationSec: result.durationSec,
    wordTimes: result.wordTimes,
    modelUsed: result.modelUsed,
    language: result.language,
  });
}
