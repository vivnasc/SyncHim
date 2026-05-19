import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServer } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { NOS } from '@/lib/diagnostic';
import { trackEvent } from '@/lib/events';
import { sendOnce } from '@/lib/resend';

export const runtime = 'edge';

const Body = z.object({
  no: z.string(),
  sessao: z.number().int().min(1).max(7),
  bloco_id: z.string().optional(),
  resposta: z.string().optional(),
  complete: z.boolean().optional()
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try { body = Body.parse(await req.json()); } catch {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  if (!NOS.includes(body.no as never)) {
    return NextResponse.json({ error: 'unknown_no' }, { status: 400 });
  }

  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const admin = createSupabaseAdmin();

  if (body.bloco_id) {
    await admin.from('respostas').upsert({
      user_id: user.id,
      sessao_numero: body.sessao,
      no: body.no,
      bloco_id: body.bloco_id,
      resposta: body.resposta ?? '',
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,sessao_numero,no,bloco_id' });
  }

  if (body.complete) {
    await admin.from('progresso').upsert({
      user_id: user.id,
      no: body.no,
      sessao_numero: body.sessao,
      completada_em: new Date().toISOString()
    }, { onConflict: 'user_id,no,sessao_numero' });

    await trackEvent('sessao_completada', { userId: user.id, metadata: { no: body.no, sessao: body.sessao } });

    // Schedule reminder for next session if there is one.
    const nextN = body.sessao + 1;
    if (nextN >= 3 && nextN <= 7) {
      const { data: u } = await admin
        .from('users')
        .select('email, locale')
        .eq('id', user.id)
        .maybeSingle();
      if (u?.email && (u.locale === 'pt' || u.locale === 'en')) {
        const kind: 'sessao_3' | 'sessao_4' | 'sessao_5' | 'sessao_6' | 'sessao_7' =
          nextN === 3 ? 'sessao_3' :
          nextN === 4 ? 'sessao_4' :
          nextN === 5 ? 'sessao_5' :
          nextN === 6 ? 'sessao_6' : 'sessao_7';
        // Emails for openings are best-effort. We deliver immediately;
        // a future job runner could honour the 3-day gating window if desired.
        try { await sendOnce({ userId: user.id, to: u.email, kind, locale: u.locale }); } catch { /* */ }
      }
    }

    if (body.sessao === 7) {
      const { data: u } = await admin
        .from('users')
        .select('email, locale, nome')
        .eq('id', user.id)
        .maybeSingle();
      if (u?.email && (u.locale === 'pt' || u.locale === 'en')) {
        try {
          await sendOnce({
            userId: user.id,
            to: u.email,
            kind: 'carta_final',
            locale: u.locale,
            vars: { nome: u.nome ?? '' }
          });
        } catch { /* */ }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
