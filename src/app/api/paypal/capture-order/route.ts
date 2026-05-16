import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { captureOrder } from '@/lib/paypal';
import { applyPurchase } from '@/lib/purchase';

export const runtime = 'nodejs';

const Body = z.object({ orderId: z.string() });

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try { body = Body.parse(await req.json()); } catch {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  try {
    const capture = await captureOrder(body.orderId);
    await applyPurchase(body.orderId, capture);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'capture_failed', detail: String(e) }, { status: 500 });
  }
}
