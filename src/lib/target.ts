/**
 * SyncHim · sistema de público (target).
 *
 * O produto serve duas mulheres distintas com a mesma mecânica de fundo
 * (os 7 nós):
 *
 *   - 'casada':   a base original. Mulher num casamento que está a
 *                 esfriar/dessincronizar. Cenários falam de marido,
 *                 casa, filhos, anos juntos.
 *
 *   - 'solteira': mulher que quer (e merece) um relacionamento sério e
 *                 não está a conseguir construir um. Os mesmos 7 nós
 *                 operam, mas com cenários distintos: chats que esfriam,
 *                 ciclos repetidos, escolhas de homens errados, recuos.
 *
 * IMPORTANTE: o scoring é idêntico (mesmas chaves q1..q21, mesma
 * agregação por nó). A `target` só altera o copy — perguntas, hero,
 * resultado. Isto mantém a base de dados, a análise e o pricing
 * coerentes entre os dois públicos.
 */

export const TARGETS = ['casada', 'solteira'] as const;
export type Target = (typeof TARGETS)[number];

export const DEFAULT_TARGET: Target = 'casada';

export function isTarget(v: unknown): v is Target {
  return typeof v === 'string' && (TARGETS as readonly string[]).includes(v);
}

export function coerceTarget(v: unknown): Target {
  return isTarget(v) ? v : DEFAULT_TARGET;
}

/**
 * Pronome contextual usado em micro-copy para suavizar ("ele" vs.
 * "alguém"/"quem te interessa") quando não há um sujeito específico.
 */
export function pronome(target: Target): { ele: string; dele: string; oCasamento: string; relacao: string } {
  if (target === 'solteira') {
    return {
      ele: 'ele',
      dele: 'dele',
      oCasamento: 'o relacionamento que tentas construir',
      relacao: 'o relacionamento'
    };
  }
  return {
    ele: 'ele',
    dele: 'dele',
    oCasamento: 'o teu casamento',
    relacao: 'o casamento'
  };
}
