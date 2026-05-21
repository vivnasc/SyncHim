import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { NOS } from '@/lib/diagnostic';

export const dynamic = 'force-dynamic';

const Body = z.object({
  action: z.enum(['find', 'grant_no', 'grant_biblioteca', 'grant_extra', 'fast_forward', 'reset']),
  email: z.string().email(),
  no: z.string().optional()
});

async function findAuthUserId(email: string): Promise<string | null> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`
      },
      cache: 'no-store'
    }
  );
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  const found = Array.isArray(data?.users)
    ? data.users.find((u: { email?: string }) => u?.email?.toLowerCase() === email.toLowerCase())
    : null;
  return found?.id ?? null;
}

export async function POST(req: NextRequest) {
  if (!getAdminEmailFromRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let payload: z.infer<typeof Body>;
  try {
    payload = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const userId = await findAuthUserId(payload.email);
  if (!userId) {
    return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
  }

  if (payload.action === 'find') {
    const { data: user } = await admin
      .from('users')
      .select('id, email, tier, no_comprado, nos_comprados_adicionais, target, sub_perfil, paid_at')
      .eq('id', userId)
      .maybeSingle();
    const { data: progresso } = await admin
      .from('progresso')
      .select('no, sessao_numero, iniciada_em, completada_em')
      .eq('user_id', userId)
      .order('no')
      .order('sessao_numero');
    return NextResponse.json({ ok: true, user, progresso });
  }

  if (payload.action === 'reset') {
    await admin.from('progresso').delete().eq('user_id', userId);
    await admin
      .from('users')
      .update({ tier: 0, no_comprado: null, nos_comprados_adicionais: [], paid_at: null })
      .eq('id', userId);
    return NextResponse.json({ ok: true });
  }

  if (payload.action === 'grant_biblioteca') {
    await admin
      .from('users')
      .update({ tier: 2, paid_at: new Date().toISOString() })
      .eq('id', userId);
    return NextResponse.json({ ok: true });
  }

  // The remaining actions all require a valid `no`.
  const no = payload.no;
  if (!no || !(NOS as readonly string[]).includes(no)) {
    return NextResponse.json({ error: 'invalid_no' }, { status: 400 });
  }

  if (payload.action === 'grant_no') {
    await admin
      .from('users')
      .update({ tier: 1, no_comprado: no, paid_at: new Date().toISOString() })
      .eq('id', userId);
    return NextResponse.json({ ok: true });
  }

  if (payload.action === 'grant_extra') {
    const { data: row } = await admin
      .from('users')
      .select('nos_comprados_adicionais')
      .eq('id', userId)
      .maybeSingle();
    const current: string[] = Array.isArray(row?.nos_comprados_adicionais) ? row!.nos_comprados_adicionais : [];
    if (!current.includes(no)) current.push(no);
    await admin
      .from('users')
      .update({ nos_comprados_adicionais: current })
      .eq('id', userId);
    return NextResponse.json({ ok: true });
  }

  if (payload.action === 'fast_forward') {
    // Mark sessions 1..6 as completed 4 days ago so the next one is
    // immediately unlocked by sessao_desbloqueada (which requires the
    // previous session to have been completed at least 3 days ago).
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
    const rows = [1, 2, 3, 4, 5, 6].map((sessao) => ({
      user_id: userId,
      no,
      sessao_numero: sessao,
      iniciada_em: fourDaysAgo,
      completada_em: fourDaysAgo
    }));
    await admin
      .from('progresso')
      .upsert(rows, { onConflict: 'user_id,no,sessao_numero' });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
