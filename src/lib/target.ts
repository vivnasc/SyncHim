/**
 * SyncHim · público + sub-perfil.
 *
 * Bifurcação A/B/C (spec):
 *   A → target='casada',   sub_perfil=null
 *   B → target='solteira', sub_perfil='sozinha'
 *   C → target='solteira', sub_perfil='inicio'
 *
 * `target` selecciona o conteúdo (casada vs solteira).
 * `sub_perfil` apenas afina a saudação inicial do resultado e
 * alimenta analytics.
 *
 * O motor de scoring é idêntico em todos.
 */

export const TARGETS = ['casada', 'solteira'] as const;
export type Target = (typeof TARGETS)[number];

export const SUB_PERFIS = ['sozinha', 'inicio'] as const;
export type SubPerfil = (typeof SUB_PERFIS)[number];

export type ContextoOpcao = 'A' | 'B' | 'C';

export const DEFAULT_TARGET: Target = 'casada';

export function isTarget(v: unknown): v is Target {
  return typeof v === 'string' && (TARGETS as readonly string[]).includes(v);
}

export function isSubPerfil(v: unknown): v is SubPerfil {
  return typeof v === 'string' && (SUB_PERFIS as readonly string[]).includes(v);
}

export function coerceTarget(v: unknown): Target {
  return isTarget(v) ? v : DEFAULT_TARGET;
}

export function coerceSubPerfil(v: unknown): SubPerfil | null {
  return isSubPerfil(v) ? v : null;
}

export function fromOpcao(opcao: ContextoOpcao): { target: Target; subPerfil: SubPerfil | null } {
  if (opcao === 'A') return { target: 'casada',   subPerfil: null };
  if (opcao === 'B') return { target: 'solteira', subPerfil: 'sozinha' };
  return { target: 'solteira', subPerfil: 'inicio' };
}

export function toOpcao(target: Target, subPerfil: SubPerfil | null): ContextoOpcao {
  if (target === 'casada') return 'A';
  if (subPerfil === 'inicio') return 'C';
  return 'B';
}

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
