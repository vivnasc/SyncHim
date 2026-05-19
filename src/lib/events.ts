import { createSupabaseAdmin } from './supabase/admin';

export type EventName =
  | 'landing_view'
  | 'diagnostico_iniciado'
  | 'diagnostico_completado'
  | 'resultado_visualizado'
  | 'checkout_iniciado'
  | 'compra_completada'
  | 'sessao_iniciada'
  | 'sessao_completada'
  | 'diagnostico_refeito'
  | 'notify_signup';

export async function trackEvent(
  name: EventName,
  args: { userId?: string; sessionId?: string; metadata?: Record<string, unknown> } = {}
) {
  try {
    const admin = createSupabaseAdmin();
    await admin.from('eventos').insert({
      user_id: args.userId ?? null,
      session_id: args.sessionId ?? null,
      evento: name,
      metadata: args.metadata ?? {}
    });
  } catch {
    // Swallow analytics errors — they should never break flows.
  }
}
