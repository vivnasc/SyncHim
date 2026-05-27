import { Resend } from 'resend';
import { createSupabaseAdmin } from './supabase/admin';
import { renderEmail, type EmailKind } from './emails';
import type { Locale } from './diagnostic';

function client() {
  return new Resend(process.env.RESEND_API_KEY!);
}

const FROM = () => process.env.RESEND_FROM || 'SyncHim <noreply@viviannedossantos.com>';

const ADMIN_EMAIL = 'ola@viviannedossantos.com';

export interface SendOnceArgs {
  userId: string;
  to: string;
  kind: EmailKind;
  locale: Locale;
  vars?: Record<string, string>;
}

export async function sendOnce(args: SendOnceArgs) {
  const admin = createSupabaseAdmin();
  const { data: existing } = await admin
    .from('emails_enviados')
    .select('id')
    .eq('user_id', args.userId)
    .eq('tipo', args.kind)
    .maybeSingle();
  if (existing) return { skipped: true as const };

  const { subject, html, text } = renderEmail(args.kind, args.locale, args.vars ?? {});
  const r = await client().emails.send({
    from: FROM(),
    to: args.to,
    subject,
    html,
    text
  });
  if (r.error) throw new Error(r.error.message);
  await admin.from('emails_enviados').insert({
    user_id: args.userId,
    tipo: args.kind,
    resend_id: r.data?.id ?? null
  });
  return { skipped: false as const, id: r.data?.id };
}

export async function sendMagicLinkEmail(email: string, locale: Locale, actionLink: string, nome?: string) {
  const { subject, html, text } = renderEmail('magic_link', locale, {
    nome: nome ?? '',
    link: actionLink
  });
  const r = await client().emails.send({
    from: FROM(),
    to: email,
    subject,
    html,
    text
  });
  if (r.error) throw new Error(r.error.message);
  return r.data?.id;
}

export async function sendMagicLink(email: string, locale: Locale, nome?: string) {
  const admin = createSupabaseAdmin();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: `${siteUrl}/${locale}/dashboard`,
      data: { app: 'synchim', locale, nome }
    }
  });
  if (error) throw new Error(error.message);
  const actionLink = data?.properties?.action_link;
  if (!actionLink) throw new Error('No action link from Supabase');
  return sendMagicLinkEmail(email, locale, actionLink, nome);
}

export async function notifyAdminPurchase(vars: {
  email: string; tier: string; no: string; amount: string; locale: Locale;
}) {
  const { subject, html, text } = renderEmail('compra_admin', vars.locale, vars);
  const r = await client().emails.send({
    from: FROM(),
    to: ADMIN_EMAIL,
    subject,
    html,
    text
  });
  if (r.error) throw new Error(r.error.message);
  return r.data?.id;
}
