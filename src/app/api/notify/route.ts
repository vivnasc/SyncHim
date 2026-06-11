import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { sendWaitlistEmails } from '@/lib/resend';
import { trackEvent } from '@/lib/events';
const Body = z.object({
  email: z.string().email(),
  no: z.string().optional().default('lista-espera'),
  nome: z.string().max(120).optional().default(''),
  locale: z.enum(['pt', 'en']).default('en')
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try { body = Body.parse(await req.json()); } catch {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  const admin = createSupabaseAdmin();
  // Só as colunas garantidas do notify_list; o nome vai nos emails.
  await admin.from('notify_list').upsert({
    email: body.email,
    no: body.no,
    locale: body.locale
  }, { onConflict: 'email,no' });
  await trackEvent('notify_signup', { metadata: { no: body.no, locale: body.locale } });

  // Confirmação gentil à pessoa + aviso para a Vivianne. Não bloqueia em falha.
  try {
    await sendWaitlistEmails({ email: body.email, nome: body.nome, no: body.no, locale: body.locale });
  } catch { /* */ }

  return NextResponse.json({ ok: true });
}
