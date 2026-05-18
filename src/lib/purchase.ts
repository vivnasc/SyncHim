import { createSupabaseAdmin } from './supabase/admin';
import { sendMagicLink, sendOnce } from './resend';
import { trackEvent } from './events';
import type { Locale, No } from './diagnostic';

interface CaptureRaw {
  id: string;
  status: string;
  payer?: { payer_id?: string; email_address?: string };
  purchase_units?: Array<{
    custom_id?: string;
    payments?: { captures?: Array<{ id: string; status: string; amount: { value: string; currency_code: string } }> };
  }>;
}

interface OrderRow {
  order_id: string;
  user_email: string | null;
  tier: number;
  no: string | null;
  status: string;
}

export async function applyPurchase(orderId: string, capture: CaptureRaw) {
  const admin = createSupabaseAdmin();
  const cap = capture.purchase_units?.[0]?.payments?.captures?.[0];
  if (!cap || cap.status !== 'COMPLETED') {
    await admin.from('paypal_orders').update({
      status: capture.status ?? 'UNKNOWN',
      raw: capture as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString()
    }).eq('order_id', orderId);
    return;
  }

  // Decode metadata from custom_id.
  let meta: { email?: string; tier?: number; no?: No | null; locale?: Locale } = {};
  try {
    meta = JSON.parse(capture.purchase_units?.[0]?.custom_id ?? '{}');
  } catch { /* */ }

  // Pick the most reliable order row.
  const { data: orderRow } = await admin
    .from('paypal_orders')
    .select('order_id, user_email, tier, no, status')
    .eq('order_id', orderId)
    .maybeSingle();

  const tier = (meta.tier ?? orderRow?.tier ?? 1) as 1 | 2;
  const no = (meta.no ?? (orderRow as OrderRow | null)?.no) as No | undefined;
  const email = (meta.email ?? orderRow?.user_email ?? capture.payer?.email_address) as string | undefined;
  const locale = (meta.locale ?? 'en') as Locale;

  if (!email) {
    await admin.from('paypal_orders').update({
      status: 'CAPTURED_NO_EMAIL',
      raw: capture as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString()
    }).eq('order_id', orderId);
    return;
  }

  // Idempotency: if already captured, stop.
  if (orderRow?.status === 'COMPLETED') return;

  // Find or create user.
  let userId: string | null = null;
  let nome: string | null = null;
  const { data: existing } = await admin
    .from('users')
    .select('id, nome')
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    userId = existing.id;
    nome = existing.nome ?? null;
  } else {
    const { data: created } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { app: 'synchim', locale, tier }
    });
    userId = created.user?.id ?? null;
  }

  if (!userId) {
    await admin.from('paypal_orders').update({
      status: 'CAPTURED_NO_USER',
      raw: capture as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString()
    }).eq('order_id', orderId);
    return;
  }

  // Patch tier and no_comprado.
  const update: Record<string, unknown> = {
    paid_at: new Date().toISOString(),
    paypal_payer_id: capture.payer?.payer_id ?? null
  };

  if (tier === 2) {
    update.tier = 2;
  } else if (tier === 1) {
    // If user is already tier 1 with another no, append to adicionais.
    const { data: u } = await admin
      .from('users')
      .select('tier, no_comprado, nos_comprados_adicionais')
      .eq('id', userId)
      .maybeSingle();
    if (u && u.tier === 1 && u.no_comprado && u.no_comprado !== no && no) {
      const adicionais = new Set<string>(u.nos_comprados_adicionais ?? []);
      adicionais.add(no);
      update.nos_comprados_adicionais = Array.from(adicionais);
    } else {
      update.tier = 1;
      if (no) update.no_comprado = no;
    }
  }

  await admin.from('users').update(update).eq('id', userId);

  // Unlock session 3 of the bought no.
  if (no) {
    await admin.from('progresso').upsert({
      user_id: userId,
      no,
      sessao_numero: 3,
      desbloqueada_em: new Date().toISOString()
    }, { onConflict: 'user_id,no,sessao_numero' });
  }

  await admin.from('paypal_orders').update({
    status: 'COMPLETED',
    capture_id: cap.id,
    payer_id: capture.payer?.payer_id ?? null,
    raw: capture as unknown as Record<string, unknown>,
    updated_at: new Date().toISOString()
  }).eq('order_id', orderId);

  await trackEvent('compra_completada', { userId, metadata: { tier, no, orderId } });

  // Send paid welcome with magic link.
  try {
    const linkId = await sendMagicLink(email, locale, nome ?? undefined);
    await admin.from('emails_enviados').insert({
      user_id: userId,
      tipo: 'boas_vindas_paga',
      resend_id: linkId ?? null
    }).select();
  } catch {
    try {
      await sendOnce({
        userId,
        to: email,
        kind: 'boas_vindas_paga',
        locale,
        vars: { nome: nome ?? '', link: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/${locale}/login` }
      });
    } catch { /* */ }
  }
}
