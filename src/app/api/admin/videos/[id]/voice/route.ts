import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { publicUrl, storageBucket } from '@/lib/admin/storage';

export const runtime = 'nodejs';

/**
 * Gera narração TTS para uma cena (ElevenLabs multilingual_v2) e
 * persiste o MP3 em Supabase Storage. Estima duração pelo Content-Length
 * (não preciso, mas chega para o editor); o runner ffprobe-a no render.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminEmailFromRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null) as { sceneIdx?: number; text?: string } | null;
  if (body?.sceneIdx == null || !body.text) return NextResponse.json({ error: 'sceneIdx/text em falta' }, { status: 400 });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) return NextResponse.json({ error: 'elevenlabs não configurado' }, { status: 500 });

  const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg'
    },
    body: JSON.stringify({
      text: body.text,
      model_id: process.env.ELEVENLABS_TTS_MODEL || 'eleven_multilingual_v2',
      voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.15 }
    })
  });
  if (!ttsRes.ok) return NextResponse.json({ error: `elevenlabs ${ttsRes.status}: ${await ttsRes.text()}` }, { status: 500 });

  const mp3 = new Uint8Array(await ttsRes.arrayBuffer());
  const supabase = createSupabaseAdmin();
  const path = `videos/${params.id}/voice/cena-${String(body.sceneIdx + 1).padStart(2, '0')}.mp3`;
  const { error } = await supabase.storage.from(storageBucket()).upload(path, mp3, {
    contentType: 'audio/mpeg', upsert: true
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Estimativa grosseira: 128kbps ≈ 16KB/s
  const durationSec = mp3.length / 16000;

  return NextResponse.json({ url: publicUrl(path), durationSec });
}
