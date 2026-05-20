import { NextRequest, NextResponse } from 'next/server';
import { isAdminEmail, makeAdminCookieValue, ADMIN_COOKIE } from '@/lib/admin/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { email?: string; password?: string } | null;
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: 'campos em falta' }, { status: 400 });
  }
  if (!isAdminEmail(body.email)) {
    return NextResponse.json({ error: 'sem acesso' }, { status: 403 });
  }
  if (!process.env.ADMIN_PASSWORD || body.password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'credenciais inválidas' }, { status: 401 });
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
