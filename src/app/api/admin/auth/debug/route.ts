import { NextResponse } from 'next/server';
import { adminEmails } from '@/lib/admin/auth';

export const runtime = 'nodejs';

/**
 * Diagnóstico de configuração do admin. NÃO expõe valores — só
 * confirma que as envs existem e quantas entradas têm.
 *
 * Usar quando o login não funciona em produção:
 *   curl https://<deploy>.vercel.app/api/admin/auth/debug
 */
export async function GET() {
  const emails = adminEmails();
  return NextResponse.json({
    ADMIN_EMAILS: {
      set: emails.length > 0,
      count: emails.length,
      // mostra primeira letra de cada email + "..." para confirmar visualmente
      // sem expor o endereço completo
      preview: emails.map((e) => `${e[0]}…${e.split('@')[1] ?? ''}`)
    },
    ADMIN_PASSWORD: {
      set: !!process.env.ADMIN_PASSWORD,
      length: (process.env.ADMIN_PASSWORD ?? '').length
    },
    SUPABASE_URL: { set: !!process.env.NEXT_PUBLIC_SUPABASE_URL },
    SUPABASE_SERVICE_ROLE_KEY: { set: !!process.env.SUPABASE_SERVICE_ROLE_KEY },
    SUPABASE_STORAGE_BUCKET: { value: process.env.SUPABASE_STORAGE_BUCKET ?? 'synchim-assets (default)' },
    GITHUB_DISPATCH_TOKEN: { set: !!process.env.GITHUB_DISPATCH_TOKEN },
    GITHUB_REPO_OWNER: { value: process.env.GITHUB_REPO_OWNER ?? null },
    GITHUB_REPO_NAME: { value: process.env.GITHUB_REPO_NAME ?? null },
    ELEVENLABS_API_KEY: { set: !!process.env.ELEVENLABS_API_KEY },
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV ?? null,
    VERCEL_GIT_COMMIT_SHA: (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7) || null
  });
}
