import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  pontuar,
  noDominante,
  noSecundario,
  questionIds,
  QUESTIONS_PER_NO,
  type Respostas,
  type Locale
} from '@/lib/diagnostic';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServer } from '@/lib/supabase/server';
import { trackEvent } from '@/lib/events';
import { sendOnce } from '@/lib/resend';
const Body = z.object({
  answers: z.record(z.string(), z.number().int().min(0).max(3)),
  email: z.string().email(),
  password: z.string().min(8).max(120),
  name: z.string().max(120).optional().default(''),
  locale: z.enum(['pt', 'en']),
  target: z.enum(['casada', 'solteira']).optional().default('casada'),
  subPerfil: z.enum(['sozinha', 'inicio']).nullable().optional().default(null),
  opcao: z.enum(['A', 'B', 'C']).nullable().optional().default(null)
});

export async function POST(req: NextRequest) {
  let payload: z.infer<typeof Body>;
  try {
    payload = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const ids = questionIds();
  for (const id of ids) {
    if (typeof payload.answers[id] !== 'number') {
      return NextResponse.json({ error: 'incomplete' }, { status: 400 });
    }
  }
  const respostas = payload.answers as Respostas;
  const pontuacoes = pontuar(respostas);
  const dominante = noDominante(pontuacoes);
  const secundario = noSecundario(pontuacoes, dominante);

  const admin = createSupabaseAdmin();
  const locale = payload.locale as Locale;

  // Find or create auth user. We look up via GoTrue admin (auth.users) instead
  // of the synchim.users mirror, because admin accounts created in the Supabase
  // dashboard may exist in auth.users but never get a row in synchim.users.
  let userId: string | null = null;
  let createdNow = false;

  const lookupRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(payload.email)}`,
    {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`
      },
      cache: 'no-store'
    }
  );
  const lookupJson = lookupRes.ok ? await lookupRes.json().catch(() => null) : null;
  const existingAuth = Array.isArray(lookupJson?.users)
    ? lookupJson.users.find((u: { email?: string }) => u?.email?.toLowerCase() === payload.email.toLowerCase())
    : null;

  if (existingAuth?.id) {
    userId = existingAuth.id as string;
    await admin.auth.admin.updateUserById(userId, { password: payload.password });
  } else {
    const { data: created, error } = await admin.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
      user_metadata: { app: 'synchim' }
    });
    if (error || !created.user) {
      return NextResponse.json({ error: 'auth_create_failed', detail: error?.message }, { status: 500 });
    }
    userId = created.user.id;
    createdNow = true;
  }

  if (!userId) {
    return NextResponse.json({ error: 'no_user' }, { status: 500 });
  }

  // Ensure a row exists in synchim.users (the trigger may not have run for
  // accounts created directly in the dashboard). Upsert is idempotent.
  await admin
    .from('users')
    .upsert(
      {
        id: userId,
        email: payload.email,
        locale,
        nome: payload.name || null,
        target: payload.target,
        sub_perfil: payload.subPerfil
      },
      { onConflict: 'id' }
    );

  // Detect if repeat.
  const { count } = await admin
    .from('diagnosticos')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  await admin.from('diagnosticos').insert({
    user_id: userId,
    no_dominante: dominante,
    no_secundario: secundario,
    pontuacoes,
    respostas,
    target: payload.target,
    sub_perfil: payload.subPerfil
  });

  await trackEvent(
    (count ?? 0) > 0 ? 'diagnostico_refeito' : 'diagnostico_completado',
    { userId, metadata: { dominante, secundario, pontuacoes } }
  );

  // Send welcome email (once). Doesn't block on failure.
  try {
    await sendOnce({
      userId,
      to: payload.email,
      kind: 'boas_vindas_t0',
      locale,
      vars: { nome: payload.name || '' }
    });
  } catch {
    /* don't block on email */
  }

  // Sign her in immediately so she lands on /resultado already logged in
  // and can reach /dashboard, /conta etc. without a second password step.
  const userSupabase = createSupabaseServer();
  await userSupabase.auth.signInWithPassword({
    email: payload.email,
    password: payload.password
  });

  void createdNow; // silences unused warning while we may surface it later

  // Stash result in a short-lived cookie so the result page can render before login.
  const res = NextResponse.json({
    ok: true,
    redirect: `/${locale}/resultado`
  });
  const [qA, qB, qC] = QUESTIONS_PER_NO[dominante];
  const respostasDominante = {
    [qA]: respostas[qA],
    [qB]: respostas[qB],
    [qC]: respostas[qC]
  };

  res.cookies.set('synchim_result', JSON.stringify({
    user_id: userId,
    nome: payload.name || null,
    dominante,
    secundario,
    pontuacoes,
    respostas_dominante: respostasDominante,
    is_repeat: (count ?? 0) > 0,
    target: payload.target,
    sub_perfil: payload.subPerfil
  }), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 30
  });
  return res;
}
