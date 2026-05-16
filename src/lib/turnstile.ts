export async function verifyTurnstile(token: string | null | undefined, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // Turnstile not configured — let it pass in dev.
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body
  });
  if (!res.ok) return false;
  const data = await res.json() as { success: boolean };
  return data.success === true;
}
