import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'edge';

export async function POST() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const admin = createSupabaseAdmin();
  // public.users has ON DELETE CASCADE from auth.users; one call wipes everything.
  await admin.auth.admin.deleteUser(user.id);
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
