import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendMagicLink } from '@/lib/resend';

export const runtime = 'nodejs';

const Body = z.object({
  email: z.string().email(),
  locale: z.enum(['pt', 'en']).default('en')
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try { body = Body.parse(await req.json()); } catch {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  try {
    await sendMagicLink(body.email, body.locale);
  } catch (e) {
    return NextResponse.json({ error: 'send_failed', detail: String(e) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
