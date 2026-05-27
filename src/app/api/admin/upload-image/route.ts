import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { publicUrl, storageBucket } from '@/lib/admin/storage';

export const runtime = 'nodejs';

/**
 * Upload de imagem para Supabase Storage.
 * Aceita FormData com campo `file` (image/*).
 * Query params: ?path=carrosseis/<itemId>/slide-01.png (opcional)
 *
 * Se path não for dado, gera um path baseado em timestamp.
 */
export async function POST(req: NextRequest) {
  if (!getAdminEmailFromRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'campo file em falta' }, { status: 400 });

  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const allowed = ['png', 'jpg', 'jpeg', 'webp', 'avif'];
  if (!allowed.includes(ext)) {
    return NextResponse.json({ error: `formato ${ext} não suportado (usa ${allowed.join(', ')})` }, { status: 400 });
  }

  const remotePath = req.nextUrl.searchParams.get('path')
    || `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;

  const buf = new Uint8Array(await file.arrayBuffer());
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.storage
    .from(storageBucket())
    .upload(remotePath, buf, {
      contentType: file.type || `image/${ext}`,
      upsert: true
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ url: publicUrl(remotePath), path: remotePath });
}
