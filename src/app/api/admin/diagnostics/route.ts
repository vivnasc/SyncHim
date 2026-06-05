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
  group: 'core' | 'pagamentos' | 'pipeline' | 'voz' | 'imagens' | 'musica' | 'opcional';
  present: boolean;
  required: boolean;
  hint?: string;
};

type PaypalProbe = {
  mode: 'live' | 'sandbox';
  authOk: boolean;
  authStatus: number | null;
  clientIdsMatch: boolean | null;
  error?: string;
};

// Faz auth real no PayPal para confirmar que as credenciais do servidor
// funcionam e em que modo. É o teste que falta para perceber porque o
// /checkout dá "Algo correu mal" (a API create-order falha aqui).
async function probePaypal(): Promise<PaypalProbe> {
  const mode = process.env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox';
  const base = mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  const id = process.env.PAYPAL_CLIENT_ID?.trim();
  const secret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  const publicId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim();

  const clientIdsMatch = id && publicId ? id === publicId : null;

  if (!id || !secret) {
    return { mode, authOk: false, authStatus: null, clientIdsMatch, error: 'PAYPAL_CLIENT_ID ou PAYPAL_CLIENT_SECRET em falta' };
  }

  try {
    const basic = Buffer.from(`${id}:${secret}`).toString('base64');
    const res = await fetch(`${base}/v1/oauth2/token`, {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const hint = res.status === 401
        ? `auth recusada (401) — credenciais não são do modo ${mode}. Confirma PAYPAL_MODE vs as chaves.`
        : `PayPal respondeu ${res.status}`;
      return { mode, authOk: false, authStatus: res.status, clientIdsMatch, error: `${hint} ${text}`.trim() };
    }
    return { mode, authOk: true, authStatus: res.status, clientIdsMatch };
  } catch (e) {
    return { mode, authOk: false, authStatus: null, clientIdsMatch, error: String(e) };
  }
}

export async function GET(req: NextRequest) {
  if (!getAdminEmailFromRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const env = (name: string) => Boolean(process.env[name]?.trim());

  const checks: Check[] = [
    // CORE — sem isto a app não arranca
    { name: 'NEXT_PUBLIC_SUPABASE_URL', group: 'core', present: env('NEXT_PUBLIC_SUPABASE_URL'), required: true, hint: 'URL do projecto Supabase (https://xxx.supabase.co)' },
    { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', group: 'core', present: env('NEXT_PUBLIC_SUPABASE_ANON_KEY'), required: true, hint: 'anon key do Supabase (settings → API)' },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', group: 'core', present: env('SUPABASE_SERVICE_ROLE_KEY'), required: true, hint: 'service_role key (NUNCA exposta no client)' },
    { name: 'ADMIN_EMAILS', group: 'core', present: env('ADMIN_EMAILS'), required: true, hint: 'lista CSV de emails admin (ex: viv.saraiva@gmail.com)' },
    { name: 'ADMIN_PASSWORD', group: 'core', present: env('ADMIN_PASSWORD'), required: true, hint: 'password única partilhada para login admin' },

    // PAGAMENTOS — sem isto o /checkout dá "Algo correu mal"
    { name: 'PAYPAL_MODE', group: 'pagamentos', present: env('PAYPAL_MODE'), required: false, hint: 'live ou sandbox. Vazio = sandbox. TEM de bater com as credenciais abaixo' },
    { name: 'PAYPAL_CLIENT_ID', group: 'pagamentos', present: env('PAYPAL_CLIENT_ID'), required: true, hint: 'client id da app PayPal (servidor)' },
    { name: 'PAYPAL_CLIENT_SECRET', group: 'pagamentos', present: env('PAYPAL_CLIENT_SECRET'), required: true, hint: 'secret da app PayPal (servidor)' },
    { name: 'NEXT_PUBLIC_PAYPAL_CLIENT_ID', group: 'pagamentos', present: env('NEXT_PUBLIC_PAYPAL_CLIENT_ID'), required: true, hint: 'mesmo client id, exposto no browser. Mudar exige redeploy' },
    { name: 'PAYPAL_WEBHOOK_ID', group: 'pagamentos', present: env('PAYPAL_WEBHOOK_ID'), required: false, hint: 'para confirmar pagamentos via webhook' },
    { name: 'PRICE_TIER1_USD', group: 'pagamentos', present: env('PRICE_TIER1_USD'), required: false, hint: 'default 39. Valor do nó individual' },

    // PIPELINE — bulk reels não funciona sem isto
    { name: 'NEXT_PUBLIC_SITE_URL', group: 'pipeline', present: env('NEXT_PUBLIC_SITE_URL') || env('VERCEL_URL'), required: false, hint: 'opcional — se faltar usa VERCEL_URL auto-injectada' },
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
  // Nota: SUPABASE_URL (sem prefix) e SUPABASE_SERVICE_ROLE_KEY são usados
  // pelo runner do render dentro do GitHub Actions — devem estar configurados
  // em github.com/vivnasc/synchim/settings/secrets/actions, NÃO no Vercel.

  // Estado da tabela settings (música tema)
  const supabase = createSupabaseAdmin();
  const { data: theme } = await supabase.from('settings').select('value').eq('key', 'theme-music').maybeSingle();
  const hasTheme = !!(theme?.value as any)?.musicUrl;

  const paypal = await probePaypal();

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
      paypal,
    },
  });
}
