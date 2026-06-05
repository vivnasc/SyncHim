import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
export async function POST() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const admin = createSupabaseAdmin();
  const uid = user.id;

  // O projecto Supabase é partilhado com outros produtos: o auth.users é
  // comum a todos. Apagar o auth.users tirava a utilizadora dos OUTROS
  // produtos (e podia cascatear dados deles). Por isso apagamos apenas os
  // dados do SyncHim (schema `synchim`) e deixamos o login partilhado vivo.
  // paypal_orders fica (registo financeiro, ligado por email).
  for (const table of ['diagnosticos', 'respostas', 'progresso', 'emails_enviados', 'eventos']) {
    await admin.from(table).delete().eq('user_id', uid);
  }
  await admin.from('users').delete().eq('id', uid);

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
