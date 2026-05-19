import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { trackEvent } from '@/lib/events';
const Body = z.object({
  email: z.string().email(),
  no: z.string(),
  locale: z.enum(['pt', 'en']).default('en')
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try { body = Body.parse(await req.json()); } catch {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  const admin = createSupabaseAdmin();
  await admin.from('notify_list').upsert({
    email: body.email,
    no: body.no,
    locale: body.locale
  }, { onConflict: 'email,no' });
  await trackEvent('notify_signup', { metadata: { no: body.no, locale: body.locale } });
  return NextResponse.json({ ok: true });
}
