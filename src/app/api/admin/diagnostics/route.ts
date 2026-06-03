import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Auditoria de todas as configurações necessárias para o pipeline de
 * reels funcionar end-to-end. Não devolve valores — só presença/ausência
 * e qual o impacto. Usado pela página /admin/diagnostics.
 */
type Check = {
  name: string;
  group: 'core' | 'pipeline' | 'voz' | 'imagens' | 'musica' | 'opcional';
  present: boolean;
  required: boolean;
  hint?: string;
};

export async function GET(req: NextRequest) {
  if (!getAdminEmailFromRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const env = (name: string) => Boolean(process.env[name]?.trim());

  const checks: Check[] = [
    // CORE — sem isto a app não arranca
    { name: 'NEXT_PUBLIC_SUPABASE_URL', group: 'core', present: env('NEXT_PUBLIC_SUPABASE_URL'), required: true, hint: 'URL do projecto Supabase (https://xxx.supabase.co)' },
    { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', group: 'core', present: env('NEXT_PUBLIC_SUPABASE_ANON_KEY'), required: true, hint: 'anon key do Supabase (settings → API)' },
    { name: 'SUPABASE_URL', group: 'core', present: env('SUPABASE_URL'), required: true, hint: 'mesma URL acima, sem NEXT_PUBLIC_' },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', group: 'core', present: env('SUPABASE_SERVICE_ROLE_KEY'), required: true, hint: 'service_role key (NUNCA exposta no client)' },
    { name: 'ADMIN_EMAILS', group: 'core', present: env('ADMIN_EMAILS'), required: true, hint: 'lista CSV de emails admin (ex: viv.saraiva@gmail.com)' },
    { name: 'ADMIN_PASSWORD', group: 'core', present: env('ADMIN_PASSWORD'), required: true, hint: 'password única partilhada para login admin' },

    // PIPELINE — bulk reels não funciona sem isto
    { name: 'NEXT_PUBLIC_SITE_URL', group: 'pipeline', present: env('NEXT_PUBLIC_SITE_URL'), required: true, hint: 'URL pública da app (https://sync-him.vercel.app)' },
    { name: 'CAMPAIGN_WORKER_TOKEN', group: 'pipeline', present: env('CAMPAIGN_WORKER_TOKEN'), required: true, hint: 'token partilhado entre Vercel e GitHub Actions (também em GH repo secrets)' },
    { name: 'GITHUB_DISPATCH_TOKEN', group: 'pipeline', present: env('GITHUB_DISPATCH_TOKEN'), required: true, hint: 'PAT classic com scope workflow para dispatchar workflows' },
    { name: 'GITHUB_REPO_OWNER', group: 'pipeline', present: env('GITHUB_REPO_OWNER'), required: true, hint: 'vivnasc' },
    { name: 'GITHUB_REPO_NAME', group: 'pipeline', present: env('GITHUB_REPO_NAME'), required: true, hint: 'synchim' },
    { name: 'GITHUB_DISPATCH_REF', group: 'pipeline', present: env('GITHUB_DISPATCH_REF'), required: false, hint: 'branch de referência (default main)' },

    // VOZ
    { name: 'ELEVENLABS_API_KEY', group: 'voz', present: env('ELEVENLABS_API_KEY'), required: true, hint: 'chave da conta ElevenLabs' },
    { name: 'ELEVENLABS_VOICE_ID', group: 'voz', present: env('ELEVENLABS_VOICE_ID'), required: true, hint: 'voice_id do clone PT-PT (Voice Lab → ID)' },
    { name: 'ELEVENLABS_TTS_MODEL', group: 'voz', present: env('ELEVENLABS_TTS_MODEL'), required: false, hint: 'default eleven_v3. Pôr eleven_multilingual_v2 se a conta não tem v3' },
    { name: 'ELEVENLABS_LANGUAGE', group: 'voz', present: env('ELEVENLABS_LANGUAGE'), required: false, hint: 'default pt' },

    // IMAGENS — opcional se usar pool da Biblioteca
    { name: 'REPLICATE_API_TOKEN', group: 'imagens', present: env('REPLICATE_API_TOKEN'), required: false, hint: 'opcional se usares só pool da Biblioteca' },
    { name: 'REPLICATE_MODEL', group: 'imagens', present: env('REPLICATE_MODEL'), required: false, hint: 'opcional' },

    // MÚSICA — opcional se usar tema upload
    { name: 'SUNO_API_URL', group: 'musica', present: env('SUNO_API_URL'), required: false, hint: 'opcional se usares só tema MP3 upload' },
    { name: 'SUNO_API_KEY', group: 'musica', present: env('SUNO_API_KEY'), required: false, hint: 'opcional' },

    // OPCIONAL
    { name: 'ANTHROPIC_API_KEY', group: 'opcional', present: env('ANTHROPIC_API_KEY'), required: false, hint: 'para gerar prompts MJ e copy' },
    { name: 'RESEND_API_KEY', group: 'opcional', present: env('RESEND_API_KEY'), required: false, hint: 'newsletters' },
    { name: 'CRON_SECRET', group: 'opcional', present: env('CRON_SECRET'), required: false, hint: 'protege cron endpoints' },
  ];

  // Estado da tabela settings (música tema)
  const supabase = createSupabaseAdmin();
  const { data: theme } = await supabase.from('settings').select('value').eq('key', 'theme-music').maybeSingle();
  const hasTheme = !!(theme?.value as any)?.musicUrl;

  const missingRequired = checks.filter((c) => c.required && !c.present);
  const ok = missingRequired.length === 0;

  return NextResponse.json({
    ok,
    missingRequired: missingRequired.map((c) => c.name),
    checks,
    runtime: {
      hasMusicTheme: hasTheme,
      vercelEnv: process.env.VERCEL_ENV ?? 'unknown',
      gitSha: (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7),
    },
  });
}
