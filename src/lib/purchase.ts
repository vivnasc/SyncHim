import { createSupabaseAdmin } from './supabase/admin';
import { sendPaidWelcome, sendOnce, notifyAdminPurchase } from './resend';
import { trackEvent } from './events';
import { licenseFor } from './license';
import type { Locale, No } from './diagnostic';

const NO_LABELS: Record<Locale, Record<No, string>> = {
  pt: {
    fome: 'Fome', controlo: 'Controlo', inferioridade: 'Inferioridade',
    desconfianca: 'Desconfiança', salvadora: 'Salvadora', abandono: 'Abandono',
    invisibilidade: 'Invisibilidade'
  },
  en: {
    fome: 'Hunger', controlo: 'Grip', inferioridade: 'Smallness',
    desconfianca: 'Suspicion', salvadora: 'Rescuer', abandono: 'Abandonment',
    invisibilidade: 'Vanishing'
  }
};

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

  // Find or create user. Look up via GoTrue admin to catch accounts
  // that exist in auth.users but not in synchim.users (created by
  // other products sharing the same Supabase project).
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
    // Check auth.users directly (may exist from another product).
    const lookupRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`
        },
        cache: 'no-store'
      }
    );
    const lookupJson = lookupRes.ok ? await lookupRes.json().catch(() => null) : null;
    const authUser = Array.isArray(lookupJson?.users)
      ? lookupJson.users.find((u: { email?: string }) => u?.email?.toLowerCase() === email.toLowerCase())
      : null;

    if (authUser?.id) {
      userId = authUser.id as string;
    } else {
      const { data: created } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { app: 'synchim' }
      });
      userId = created.user?.id ?? null;
    }
  }

  if (!userId) {
    await admin.from('paypal_orders').update({
      status: 'CAPTURED_NO_USER',
      raw: capture as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString()
    }).eq('order_id', orderId);
    return;
  }

  // Ensure synchim.users row exists (may be missing if the account was
  // created by another product on the same Supabase project).
  await admin
    .from('users')
    .upsert({ id: userId, email, locale: locale ?? 'pt' }, { onConflict: 'id' });

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

  // Notify admin (ola@viviannedossantos.com)
  try {
    const amount = cap.amount?.value ?? '?';
    await notifyAdminPurchase({ email, tier: String(tier), no: no ?? 'biblioteca', amount, locale });
  } catch { /* don't block on admin notification */ }

  // Send paid welcome: recibo dourado + licença pessoal + magic link.
  const noLabel = no ? NO_LABELS[locale ?? 'pt'][no] : '';
  const produto = tier === 2
    ? (locale === 'pt' ? 'Biblioteca completa · os 7 nós' : 'Full library · all 7 knots')
    : (locale === 'pt' ? `A travessia do nó ${noLabel}` : `The crossing of ${noLabel}`);
  const valor = `US$ ${cap.amount?.value ?? '?'}`;
  const licenca = licenseFor(orderId);
  try {
    const linkId = await sendPaidWelcome({ email, locale, nome: nome ?? undefined, produto, valor, licenca });
    await admin.from('emails_enviados').insert({
      user_id: userId,
      tipo: 'boas_vindas_paga',
      resend_id: linkId ?? null
    });
  } catch {
    try {
      await sendOnce({
        userId,
        to: email,
        kind: 'boas_vindas_paga',
        locale,
        vars: {
          nome: nome ?? '',
          link: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/${locale}/login`,
          produto, valor, licenca, email
        }
      });
    } catch { /* */ }
  }
}
