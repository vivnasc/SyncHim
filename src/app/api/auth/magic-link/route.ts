import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { sendMagicLinkEmail } from '@/lib/resend';

const Body = z.object({
  email: z.string().email(),
  locale: z.enum(['pt', 'en']).default('en')
});

function looksLikePlaceholder(key: string | undefined): boolean {
  if (!key) return true;
  const k = key.toLowerCase();
  return k.includes('placeholder') || k.includes('your-') || k === 're_' || k.length < 16;
}

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try { body = Body.parse(await req.json()); } catch {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  // Always generate the link via Supabase first. If we can't do that,
  // there is nothing to fall back on.
  const admin = createSupabaseAdmin();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: body.email,
    options: {
      redirectTo: `${siteUrl}/${body.locale}/dashboard`,
      data: { app: 'synchim', locale: body.locale }
    }
  });
  if (error || !data?.properties?.action_link) {
    return NextResponse.json(
      { error: 'link_generation_failed', detail: error?.message ?? 'no link' },
      { status: 500 }
    );
  }
  const actionLink = data.properties.action_link;

  // Try to send via Resend. If the key is missing/placeholder or the
  // send fails, surface the link in the response so the user can still
  // sign in. This keeps preview deploys usable without a real Resend
  // setup.
  const resendKey = process.env.RESEND_API_KEY;
  if (looksLikePlaceholder(resendKey)) {
    return NextResponse.json({ ok: true, fallbackLink: actionLink, reason: 'resend_not_configured' });
  }

  try {
    await sendMagicLinkEmail(body.email, body.locale, actionLink);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('magic-link send failed', e);
    return NextResponse.json({ ok: true, fallbackLink: actionLink, reason: 'send_failed' });
  }
}
