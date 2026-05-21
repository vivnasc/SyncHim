import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { sendOnce } from '@/lib/resend';
import type { Locale, No } from '@/lib/diagnostic';
import type { EmailKind } from '@/lib/emails';

export const runtime = 'nodejs';

/**
 * Cron diário (configurado em vercel.json) que avisa cada utilizadora
 * quando a próxima sessão acaba de desbloquear, 3 dias após a
 * conclusão da anterior.
 *
 * Lógica:
 *   - Para cada `progresso` com `completada_em` há >= 3 dias
 *     (e <= 4 dias, evita reenviar passados meses), verifica se a
 *     sessão seguinte (N+1) já tem `emails_enviados.tipo = sessao_{N+1}`.
 *   - Se não, envia o email correspondente.
 *
 * Idempotente por (user_id × email_kind) via tabela emails_enviados.
 *
 * Segurança: Vercel anexa o header `Authorization: Bearer <CRON_SECRET>`
 * automaticamente em chamadas de cron. Se for chamada manual,
 * exige o segredo na query (?secret=...).
 */
export async function GET(req: NextRequest) {
  // Vercel cron: header Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  const secretQuery = req.nextUrl.searchParams.get('secret');
  if (
    (auth !== expected) &&
    (!process.env.CRON_SECRET || secretQuery !== process.env.CRON_SECRET)
  ) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createSupabaseAdmin();
  const now = Date.now();
  const threeDaysAgo = new Date(now - 3 * 24 * 3600 * 1000).toISOString();
  const fourDaysAgo  = new Date(now - 4 * 24 * 3600 * 1000).toISOString();

  // Janela de 1 dia: sessões completadas há entre 3 e 4 dias.
  // O cron corre diariamente — esta janela apanha cada sessão exactamente uma vez.
  const { data: rows } = await admin
    .from('progresso')
    .select('user_id, no, sessao_numero, completada_em')
    .gte('completada_em', fourDaysAgo)
    .lte('completada_em', threeDaysAgo)
    .limit(500);

  const results: Array<{ user: string; sent?: EmailKind; reason?: string }> = [];

  for (const row of rows ?? []) {
    const nextN = (row.sessao_numero as number) + 1;
    if (nextN < 3 || nextN > 7) continue;
    const kind = `sessao_${nextN}` as EmailKind;

    // Lookup user
    const { data: u } = await admin
      .from('users')
      .select('id, email, locale, nome, tier, no_comprado, nos_comprados_adicionais')
      .eq('id', row.user_id)
      .maybeSingle();
    if (!u?.email) { results.push({ user: row.user_id, reason: 'no email' }); continue; }

    // Confirmar que ainda tem acesso ao nó
    const tier = (u.tier as number) ?? 0;
    const owned = new Set<string>([
      u.no_comprado as string | null ?? '',
      ...(((u.nos_comprados_adicionais as string[] | null) ?? []))
    ]);
    const hasAccess = tier >= 2 || owned.has(row.no);
    if (!hasAccess) { results.push({ user: row.user_id, reason: 'no access' }); continue; }

    try {
      const r = await sendOnce({
        userId: u.id,
        to: u.email as string,
        kind,
        locale: (u.locale as Locale) ?? 'pt',
        vars: { nome: (u.nome as string) ?? '', no: row.no as No }
      });
      if (!r.skipped) results.push({ user: u.id, sent: kind });
      else            results.push({ user: u.id, reason: 'already sent' });
    } catch (e: any) {
      results.push({ user: u.id, reason: `send error: ${e?.message}` });
    }
  }

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    processed: rows?.length ?? 0,
    sent: results.filter((r) => r.sent).length,
    details: results
  });
}
