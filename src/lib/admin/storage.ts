import { createSupabaseAdmin } from '@/lib/supabase/admin';

export function storageBucket(): string {
  return process.env.SUPABASE_STORAGE_BUCKET || 'synchim-assets';
}

export async function uploadJson(path: string, data: unknown): Promise<string> {
  const supabase = createSupabaseAdmin();
  const body = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const { error } = await supabase.storage
    .from(storageBucket())
    .upload(path, body, { contentType: 'application/json', upsert: true });
  if (error) throw new Error(`storage upload failed: ${error.message}`);
  return publicUrl(path);
}

export async function readJson<T>(path: string): Promise<T | null> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.storage.from(storageBucket()).download(path);
  if (error || !data) return null;
  return JSON.parse(await data.text()) as T;
}

export function publicUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, '');
  return `${base}/storage/v1/object/public/${storageBucket()}/${path}`;
}
