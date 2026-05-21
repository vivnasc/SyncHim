import type { No } from '@/lib/diagnostic';

/**
 * Mapa de upsell nó → próximo nó (spec).
 * Quando uma utilizadora chega ao fim da Sessão 7 de um nó, o upsell
 * convida-a a atravessar o nó que costuma estar por baixo.
 */
export const PROXIMO_NO: Record<No, No> = {
  fome: 'abandono',
  controlo: 'desconfianca',
  inferioridade: 'invisibilidade',
  desconfianca: 'abandono',
  salvadora: 'inferioridade',
  abandono: 'fome',
  invisibilidade: 'inferioridade'
};

export function precoExtra() {
  return {
    brl: Number(process.env.PRICE_UPGRADE_NO_BRL || 67),
    usd: Number(process.env.PRICE_UPGRADE_NO_USD || 19)
  };
}

export function precoBiblioteca() {
  return {
    diff_brl: Number(process.env.PRICE_TIER2_DIFF_BRL || 170),
    diff_usd: Number(process.env.PRICE_TIER2_DIFF_USD || 48)
  };
}
