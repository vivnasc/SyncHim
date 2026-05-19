import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createOrder } from '@/lib/paypal';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { NOS_VENDAVEIS } from '@/lib/diagnostic';

export const runtime = 'edge';

const Body = z.object({
  tier: z.union([z.literal(1), z.literal(2)]),
  no: z.string().optional(),
  email: z.string().email(),
  locale: z.enum(['pt', 'en'])
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try { body = Body.parse(await req.json()); } catch {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  if (body.tier === 1) {
    if (!body.no || !NOS_VENDAVEIS.includes(body.no as never)) {
      return NextResponse.json({ error: 'no_not_sellable' }, { status: 400 });
    }
  }

  try {
    const order = await createOrder({
      tier: body.tier,
      no: body.no,
      email: body.email,
      locale: body.locale
    });

    const admin = createSupabaseAdmin();
    await admin.from('paypal_orders').insert({
      order_id: order.id,
      user_email: body.email,
      tier: body.tier,
      no: body.no ?? null,
      amount: body.tier === 1 ? Number(process.env.PRICE_TIER1_USD ?? '39') : Number(process.env.PRICE_TIER2_USD ?? '87'),
      currency: 'USD',
      status: order.status,
      raw: order as unknown as Record<string, unknown>
    });

    return NextResponse.json({ id: order.id });
  } catch (e: unknown) {
    return NextResponse.json({ error: 'paypal_failed', detail: String(e) }, { status: 500 });
  }
}
