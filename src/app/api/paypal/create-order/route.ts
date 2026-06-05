import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createOrder } from '@/lib/paypal';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { NOS_VENDAVEIS } from '@/lib/diagnostic';
const Body = z.object({
  // tier=1  : Tier 1 inicial (compra do nó dominante)
  // tier=2  : Tier 2 inicial (biblioteca completa)
  // tier='upgrade' : compra de um nó extra (US$ 19 / R$ 67) ou upgrade Tier1→2
  tier: z.union([z.literal(1), z.literal(2), z.literal('upgrade')]),
  no: z.string().optional(),
  email: z.string().email(),
  locale: z.enum(['pt', 'en'])
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try { body = Body.parse(await req.json()); } catch {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  if (body.tier === 1 || body.tier === 'upgrade') {
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
    const amount = body.tier === 1
      ? Number(process.env.PRICE_TIER1_USD ?? '39')
      : body.tier === 2
        ? Number(process.env.PRICE_TIER2_USD ?? '87')
        : Number(process.env.PRICE_UPGRADE_NO_USD ?? '19');
    // No campo `tier` da DB só temos int (1 ou 2). Para o upgrade gravamos
    // como `1` (compra de um nó individual à la carta) e o `no` indica qual.
    const tierForDb = body.tier === 'upgrade' ? 1 : body.tier;
    await admin.from('paypal_orders').insert({
      order_id: order.id,
      user_email: body.email,
      tier: tierForDb,
      no: body.no ?? null,
      amount,
      currency: 'USD',
      status: order.status,
      raw: order as unknown as Record<string, unknown>
    });

    return NextResponse.json({ id: order.id });
  } catch (e: unknown) {
    console.error('[paypal/create-order] falhou', { tier: body.tier, no: body.no, mode: process.env.PAYPAL_MODE ?? 'sandbox', error: String(e) });
    return NextResponse.json({ error: 'paypal_failed', detail: String(e) }, { status: 500 });
  }
}
