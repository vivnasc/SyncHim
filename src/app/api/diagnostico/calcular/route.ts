import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  pontuar,
  noDominante,
  noSecundario,
  questionIds,
  type Respostas,
  type Locale
} from '@/lib/diagnostic';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { verifyTurnstile } from '@/lib/turnstile';
import { trackEvent } from '@/lib/events';
import { sendOnce } from '@/lib/resend';

export const runtime = 'nodejs';

const Body = z.object({
  answers: z.record(z.string(), z.number().int().min(0).max(3)),
  email: z.string().email(),
  name: z.string().max(120).optional().default(''),
  locale: z.enum(['pt', 'en']),
  turnstileToken: z.string().optional()
});

export async function POST(req: NextRequest) {
  let payload: z.infer<typeof Body>;
  try {
    payload = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for') ?? undefined;
  const ok = await verifyTurnstile(payload.turnstileToken, ip ?? undefined);
  if (!ok) return NextResponse.json({ error: 'turnstile_failed' }, { status: 400 });

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

  // Find or create auth user.
  let userId: string | null = null;
  const { data: existing } = await admin
    .from('users')
    .select('id')
    .eq('email', payload.email)
    .maybeSingle();

  if (existing) {
    userId = existing.id;
  } else {
    const { data: created, error } = await admin.auth.admin.createUser({
      email: payload.email,
      email_confirm: true,
      user_metadata: { nome: payload.name, locale, tier: 0 }
    });
    if (error || !created.user) {
      return NextResponse.json({ error: 'auth_create_failed', detail: error?.message }, { status: 500 });
    }
    userId = created.user.id;
  }

  if (!userId) {
    return NextResponse.json({ error: 'no_user' }, { status: 500 });
  }

  // Update locale & name (in case of return visit).
  await admin
    .from('users')
    .update({ locale, nome: payload.name || null })
    .eq('id', userId);

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
    respostas
  });

  await trackEvent(
    (count ?? 0) > 0 ? 'diagnostico_refeito' : 'diagnostico_completado',
    { userId, metadata: { dominante, secundario, pontuacoes } }
  );

  // Send welcome email (once).
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

  // Stash result in a short-lived cookie so the result page can render before login.
  const res = NextResponse.json({
    ok: true,
    redirect: `/${locale}/resultado`
  });
  res.cookies.set('synchim_result', JSON.stringify({
    user_id: userId,
    dominante,
    secundario,
    pontuacoes,
    is_repeat: (count ?? 0) > 0
  }), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 30
  });
  return res;
}
