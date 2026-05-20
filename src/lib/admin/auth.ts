import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const COOKIE_NAME = 'synchim_admin';
const SESSION_MAX_AGE = 60 * 60 * 24 * 14; // 14 dias

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string): boolean {
  return adminEmails().includes(email.trim().toLowerCase());
}

function signature(email: string): string {
  const secret = process.env.ADMIN_PASSWORD ?? '';
  // HMAC-light: hash do email + secret via Web Crypto seria mais limpo;
  // mantemos simples para correr em Edge sem dependências.
  let h = 0;
  const data = `${email}|${secret}`;
  for (let i = 0; i < data.length; i++) {
    h = (h * 31 + data.charCodeAt(i)) | 0;
  }
  return `${h}`;
}

export function makeAdminCookieValue(email: string): string {
  return `${email}.${signature(email)}`;
}

export function verifyAdminCookieValue(value: string | undefined | null): string | null {
  if (!value) return null;
  const dot = value.lastIndexOf('.');
  if (dot < 0) return null;
  const email = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  if (!isAdminEmail(email)) return null;
  if (signature(email) !== sig) return null;
  return email;
}

export function getAdminEmailFromCookies(): string | null {
  return verifyAdminCookieValue(cookies().get(COOKIE_NAME)?.value);
}

export function getAdminEmailFromRequest(req: NextRequest): string | null {
  return verifyAdminCookieValue(req.cookies.get(COOKIE_NAME)?.value);
}

export const ADMIN_COOKIE = {
  name: COOKIE_NAME,
  maxAge: SESSION_MAX_AGE
};
