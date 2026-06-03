import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { publicUrl, storageBucket } from '@/lib/admin/storage';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Upload de música tema da campanha (sem ligar a reel específico).
 *
 * Aceita multipart/form-data com campo "file" (mp3/wav/m4a, max 25MB).
 * Persiste em campaign/theme-music.mp3 e guarda em settings.theme-music
 * com { musicUrl, musicPrompt }. Todos os reels passam a poder reutilizar
 * via "Reutilizar (sem gerar nova)" ou via bulk process-all que aplica
 * automaticamente o tema quando o reel não tem música própria.
 */
export async function POST(req: NextRequest) {
  if (!getAdminEmailFromRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'campo "file" em falta' }, { status: 400 });
  }
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: `ficheiro >25MB (${(file.size / 1024 / 1024).toFixed(1)}MB)` }, { status: 413 });
  }

  const buf = new Uint8Array(await file.arrayBuffer());
  const supabase = createSupabaseAdmin();
  const remotePath = 'campaign/theme-music.mp3';
  const { error: upErr } = await supabase.storage
    .from(storageBucket())
    .upload(remotePath, buf, { contentType: 'audio/mpeg', upsert: true });
  if (upErr) return NextResponse.json({ error: `storage: ${upErr.message}` }, { status: 500 });

  const musicUrl = publicUrl(remotePath);
  const value = { musicUrl, musicPrompt: `upload campanha (${file.name})` };
  const { error: setErr } = await supabase.from('settings').upsert({ key: 'theme-music', value });
  if (setErr) return NextResponse.json({ error: `settings: ${setErr.message}` }, { status: 500 });

  return NextResponse.json({ ok: true, musicUrl, fileName: file.name, sizeMB: +(file.size / 1024 / 1024).toFixed(2) });
}
