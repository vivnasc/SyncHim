/**
 * SyncHim · Plano semanal de conteúdo.
 *
 * 2 carrosséis/dia × 7 dias = 14 por semana.
 * Ambos ao meio-dia (12:00) — melhor horário para engagement.
 * Publicados em sequência (Metricool agenda hora exacta por post).
 *
 *   - Post 1: didático (A/B/C/D rotativos)
 *   - Post 2: reconhecimento OU CTA (cada 7.o dia)
 */

export type CarouselSlotType =
  | 'didatico-A'
  | 'didatico-B'
  | 'didatico-C'
  | 'didatico-D'
  | 'reconhecimento'
  | 'cta';

export interface WeekSlot {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  time: '12:00';
  type: CarouselSlotType;
  slideCount: number;
}

/**
 * Os 7 nós da marca, em ordem canónica.
 * Usados para rodar o foco ao longo da semana.
 */
export const KNOTS = [
  'fome',
  'controlo',
  'inferioridade',
  'desconfianca',
  'salvadora',
  'abandono',
  'invisibilidade',
] as const;

export type Knot = (typeof KNOTS)[number];

// Rotação ABCD para os slots da manhã (7 dias)
const DIDACTIC_ROTATION: CarouselSlotType[] = [
  'didatico-A',
  'didatico-B',
  'didatico-C',
  'didatico-D',
  'didatico-A',
  'didatico-B',
  'didatico-C',
];

// Noite: reconhecimento nos 6 primeiros dias, CTA no 7.o
const EVENING_ROTATION: CarouselSlotType[] = [
  'reconhecimento',
  'reconhecimento',
  'reconhecimento',
  'reconhecimento',
  'reconhecimento',
  'reconhecimento',
  'cta',
];

/**
 * Plano fixo de uma semana: 14 slots (7 manhãs + 7 noites).
 * Cada slot indica dia, hora, tipo e n.o de slides.
 */
export const WEEK_PLAN: WeekSlot[] = Array.from({ length: 7 }, (_, d) => [
  {
    dayOfWeek: d as WeekSlot['dayOfWeek'],
    time: '12:00' as const,
    type: DIDACTIC_ROTATION[d],
    slideCount: 8,
  },
  {
    dayOfWeek: d as WeekSlot['dayOfWeek'],
    time: '12:00' as const,
    type: EVENING_ROTATION[d],
    slideCount: EVENING_ROTATION[d] === 'cta' ? 6 : 8,
  },
]).flat();

/**
 * Gera um plano para N semanas (slot por slot, sequencial).
 * Cada item devolvido inclui o weekIndex (0..N-1) e dayOffset absoluto
 * a partir do dia 0 da campanha.
 *
 * Usado para a campanha de 30 dias (~4-5 semanas) sem perder a estrutura
 * rotativa A/B/C/D + reconhecimento/CTA.
 */
export interface CampaignSlot extends WeekSlot {
  weekIndex: number;
  dayOffset: number; // dia absoluto desde startDate (0..N*7-1)
  slotIndexAbs: number; // 0..(N*14-1)
}

export function buildCampaignPlan(weeksCount: number): CampaignSlot[] {
  const safeWeeks = Math.max(1, Math.min(weeksCount, 8));
  const result: CampaignSlot[] = [];
  for (let w = 0; w < safeWeeks; w++) {
    for (let i = 0; i < WEEK_PLAN.length; i++) {
      const base = WEEK_PLAN[i];
      result.push({
        ...base,
        weekIndex: w,
        dayOffset: w * 7 + base.dayOfWeek,
        slotIndexAbs: w * WEEK_PLAN.length + i,
      });
    }
  }
  return result;
}

/**
 * Dado o index do slot (0..13), devolve o nó em foco.
 * Roda pelos 7 nós de modo que cada nó seja tocado pelo menos 2x por semana.
 */
export function knotForSlot(slotIndex: number): Knot {
  return KNOTS[slotIndex % KNOTS.length];
}
