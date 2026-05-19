import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhook, getOrder } from '@/lib/paypal';
import { applyPurchase } from '@/lib/purchase';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const headers = {
    transmissionId: req.headers.get('paypal-transmission-id') ?? '',
    transmissionTime: req.headers.get('paypal-transmission-time') ?? '',
    certUrl: req.headers.get('paypal-cert-url') ?? '',
    authAlgo: req.headers.get('paypal-auth-algo') ?? '',
    transmissionSig: req.headers.get('paypal-transmission-sig') ?? ''
  };

  const verified = await verifyWebhook(headers, raw);
  if (!verified) {
    return NextResponse.json({ error: 'signature_failed' }, { status: 400 });
  }

  type WebhookEvent = {
    event_type: string;
    resource?: { supplementary_data?: { related_ids?: { order_id?: string } }; id?: string };
  };
  let evt: WebhookEvent;
  try { evt = JSON.parse(raw) as WebhookEvent; } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (evt.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
    const orderId = evt.resource?.supplementary_data?.related_ids?.order_id;
    if (!orderId) return NextResponse.json({ ok: true });
    try {
      const full = await getOrder(orderId);
      await applyPurchase(orderId, full);
    } catch (e) {
      return NextResponse.json({ error: 'apply_failed', detail: String(e) }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
