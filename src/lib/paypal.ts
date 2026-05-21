const MODE = process.env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox';

const BASE = MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

export type PaypalTier = 1 | 2 | 'upgrade';

export function priceFor(tier: PaypalTier): string {
  switch (tier) {
    case 1: return process.env.PRICE_TIER1_USD ?? '39.00';
    case 2: return process.env.PRICE_TIER2_USD ?? '87.00';
    case 'upgrade': return process.env.PRICE_UPGRADE_NO_USD ?? '19.00';
  }
}

async function token(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID!;
  const secret = process.env.PAYPAL_CLIENT_SECRET!;
  const basic = Buffer.from(`${id}:${secret}`).toString('base64');
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

export interface OrderArgs {
  tier: PaypalTier;
  no?: string;
  email: string;
  locale: 'en' | 'pt';
}

export async function createOrder(args: OrderArgs) {
  const t = await token();
  const amount = priceFor(args.tier);
  const description = args.tier === 2
    ? 'SyncHim, biblioteca completa'
    : args.tier === 'upgrade'
      ? `SyncHim, atravessar o nó ${args.no ?? '?'}`
      : `SyncHim, travessia do nó ${args.no ?? '?'}`;

  // No custom_id, tier='upgrade' fica como 1 com o nó novo: o applyPurchase
  // lê isto, vê que o user já tinha um no_comprado diferente, e adiciona
  // este nó a `nos_comprados_adicionais`. Tier=2 fica como 2.
  const tierForMeta = args.tier === 'upgrade' ? 1 : args.tier;

  const res = await fetch(`${BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${t}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: { currency_code: 'USD', value: amount },
        description,
        custom_id: JSON.stringify({ email: args.email, tier: tierForMeta, no: args.no ?? null, locale: args.locale }).slice(0, 127)
      }],
      application_context: {
        brand_name: 'SyncHim',
        user_action: 'PAY_NOW',
        shipping_preference: 'NO_SHIPPING'
      }
    })
  });
  if (!res.ok) throw new Error(`PayPal create order failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<{ id: string; status: string }>;
}

export async function captureOrder(orderId: string) {
  const t = await token();
  const res = await fetch(`${BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${t}`,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) throw new Error(`PayPal capture failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function getOrder(orderId: string) {
  const t = await token();
  const res = await fetch(`${BASE}/v2/checkout/orders/${orderId}`, {
    headers: { 'Authorization': `Bearer ${t}` }
  });
  if (!res.ok) throw new Error(`PayPal get order failed: ${res.status}`);
  return res.json();
}

export interface WebhookHeaders {
  transmissionId: string;
  transmissionTime: string;
  certUrl: string;
  authAlgo: string;
  transmissionSig: string;
}

export async function verifyWebhook(
  headers: WebhookHeaders,
  rawBody: string
): Promise<boolean> {
  const t = await token();
  const res = await fetch(`${BASE}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${t}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      auth_algo: headers.authAlgo,
      cert_url: headers.certUrl,
      transmission_id: headers.transmissionId,
      transmission_sig: headers.transmissionSig,
      transmission_time: headers.transmissionTime,
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: JSON.parse(rawBody)
    })
  });
  if (!res.ok) return false;
  const data = await res.json() as { verification_status: string };
  return data.verification_status === 'SUCCESS';
}
