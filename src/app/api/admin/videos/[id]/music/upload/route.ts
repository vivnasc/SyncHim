import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { publicUrl, storageBucket } from '@/lib/admin/storage';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Upload manual de música ambiente para um reel.
 * Aceita multipart/form-data com campo "file" (mp3/wav/m4a).
 * Persiste em videos/<id>/music/ambient.mp3 e actualiza metadata.musicUrl.
 *
 * Saída de emergência quando o Suno falha ou queres usar pista própria.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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
  const remotePath = `videos/${params.id}/music/ambient.mp3`;
  const { error: upErr } = await supabase.storage
    .from(storageBucket())
    .upload(remotePath, buf, { contentType: 'audio/mpeg', upsert: true });
  if (upErr) return NextResponse.json({ error: `storage: ${upErr.message}` }, { status: 500 });

  const musicUrl = publicUrl(remotePath);
  const { data: item } = await supabase.from('content_items').select('metadata').eq('id', params.id).maybeSingle();
  const metadata = { ...(item?.metadata ?? {}), musicUrl, musicPrompt: `upload manual (${file.name})` };
  await supabase.from('content_items').update({ metadata }).eq('id', params.id);

  return NextResponse.json({ ok: true, musicUrl, fileName: file.name, sizeMB: +(file.size / 1024 / 1024).toFixed(2) });
}
