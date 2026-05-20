// Cloudflare's official test/development secrets. When one of these is in
// play we never block the request, so preview deploys don't get stuck when
// the widget can't load or the public site key isn't configured.
const TEST_PASS_SECRETS = new Set([
  '1x0000000000000000000000000000000AA',
  '2x0000000000000000000000000000000AA',
  '3x0000000000000000000000000000000AA'
]);

export async function verifyTurnstile(token: string | null | undefined, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  // Not configured or using the always-pass test secret.
  if (!secret || TEST_PASS_SECRETS.has(secret)) return true;
  // Real secret configured but the widget didn't return a token.
  // Most often this means the public site key wasn't set so the widget
  // never rendered. Don't punish the user for our config.
  if (!token) return true;
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.append('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body
    });
    if (!res.ok) return false;
    const data = await res.json() as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
