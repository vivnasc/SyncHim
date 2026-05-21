import { NextRequest, NextResponse } from 'next/server';
import { isAdminEmail, makeAdminCookieValue, ADMIN_COOKIE, adminEmails } from '@/lib/admin/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { email?: string; password?: string } | null;
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: 'campos em falta' }, { status: 400 });
  }

  // Diagnóstico explícito — se uma env está em falta, dizer claramente.
  const list = adminEmails();
  if (list.length === 0) {
    return NextResponse.json(
      { error: 'ADMIN_EMAILS não configurado em Vercel. Settings → Environment Variables → Production.' },
      { status: 503 }
    );
  }
  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: 'ADMIN_PASSWORD não configurado em Vercel.' },
      { status: 503 }
    );
  }

  if (!isAdminEmail(body.email)) {
    return NextResponse.json(
      { error: `Email não está em ADMIN_EMAILS (lista actual tem ${list.length} entradas).` },
      { status: 403 }
    );
  }
  if (body.password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Password errada.' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE.name, makeAdminCookieValue(body.email.toLowerCase()), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ADMIN_COOKIE.maxAge
  });
  return res;
}
