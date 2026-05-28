import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Diagnostico rapido da configuracao Claude.
 * Faz uma chamada minima (1 tool call, ~1-2s) para confirmar que:
 *   - ANTHROPIC_API_KEY existe e e valida
 *   - O modelo configurado responde
 *   - A rede Vercel->Anthropic esta a funcionar
 *
 * Devolve sempre detalhe util para diagnostico em produccao.
 */
export async function GET(req: NextRequest) {
  if (!getAdminEmailFromRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
  const keyPresent = !!process.env.ANTHROPIC_API_KEY;
  const keyPrefix = (process.env.ANTHROPIC_API_KEY ?? '').slice(0, 8);

  if (!keyPresent) {
    return NextResponse.json(
      { ok: false, stage: 'env', error: 'ANTHROPIC_API_KEY ausente no Vercel.', model },
      { status: 503 },
    );
  }

  const t0 = Date.now();
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const resp = await client.messages.create({
      model,
      max_tokens: 32,
      messages: [{ role: 'user', content: 'Responde apenas com a palavra: ok' }],
    });
    const text = resp.content
      .filter((c): c is Anthropic.TextBlock => c.type === 'text')
      .map((c) => c.text)
      .join('')
      .trim();

    return NextResponse.json({
      ok: true,
      stage: 'success',
      model,
      reply: text,
      latencyMs: Date.now() - t0,
      keyPrefix: keyPrefix + '...',
      stopReason: resp.stop_reason,
      usage: resp.usage,
    });
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status ?? 500;
    return NextResponse.json(
      {
        ok: false,
        stage: 'claude',
        model,
        latencyMs: Date.now() - t0,
        keyPrefix: keyPrefix + '...',
        error: err?.message ?? 'erro desconhecido',
        type: err?.error?.type ?? err?.name ?? null,
        details: err?.error ?? null,
      },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
