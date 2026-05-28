/**
 * Auth para workers internos (GitHub Actions runners) chamarem APIs do
 * SyncHim sem cookie de admin. Usa header X-Worker-Token comparado contra
 * env CAMPAIGN_WORKER_TOKEN.
 *
 * Configurar:
 * - Gerar token forte: openssl rand -hex 32
 * - Vercel env: CAMPAIGN_WORKER_TOKEN=<valor>
 * - GitHub repo secrets: CAMPAIGN_WORKER_TOKEN=<mesmo valor>
 */

import { NextRequest } from 'next/server';

export function isWorkerAuthenticated(req: NextRequest): boolean {
  const expected = process.env.CAMPAIGN_WORKER_TOKEN;
  if (!expected) return false;
  const got = req.headers.get('x-worker-token');
  if (!got) return false;
  // comparison constant-time-ish (lengths iguais primeiro)
  if (got.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) {
    diff |= got.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
