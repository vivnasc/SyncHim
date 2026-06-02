import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/admin/settings/{key} — devolve { key, value } ou null. */
export async function GET(req: NextRequest, { params }: { params: { key: string } }) {
  if (!getAdminEmailFromRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const supabase = createSupabaseAdmin();
  const { data } = await supabase.from('settings').select('key, value').eq('key', params.key).maybeSingle();
  return NextResponse.json(data ?? { key: params.key, value: null });
}

/** POST /api/admin/settings/{key} — upsert { value } */
export async function POST(req: NextRequest, { params }: { params: { key: string } }) {
  if (!getAdminEmailFromRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null) as { value?: any } | null;
  if (!body || body.value === undefined) return NextResponse.json({ error: 'value em falta' }, { status: 400 });
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from('settings').upsert({ key: params.key, value: body.value });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, key: params.key });
}
