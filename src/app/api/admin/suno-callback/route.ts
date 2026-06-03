import { NextResponse } from 'next/server';

/**
 * Stub para o callback obrigatório do apibox.erweima.ai.
 * Não fazemos nada com a notificação — o cliente Suno (suno.ts) já faz
 * polling síncrono via /generate/record-info. Mas o provider recusa o
 * pedido se callBackUrl estiver em falta, então enviamos uma URL válida
 * que aceita POST e responde 200.
 */
export async function POST() {
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
