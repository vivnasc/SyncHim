/**
 * SyncHim · Plano semanal de conteúdo.
 *
 * 3 posts/dia × 7 dias = 21 por semana.
 *   - 09:00 — carrossel manhã (didáctico A/B/C/D rotativos)
 *   - 13:00 — carrossel tarde (reconhecimento OU CTA cada 7.o dia)
 *   - 18:00 — reel kinetic com voz ElevenLabs + legenda sincronizada
 *
 * Metricool agenda na hora exacta indicada por post (sem deriva).
 */

export type CarouselSlotType =
  | 'didatico-A'
  | 'didatico-B'
  | 'didatico-C'
  | 'didatico-D'
  | 'reconhecimento'
  | 'cta';

export type ReelSlotType = 'reel-kinetic';

export type SlotType = CarouselSlotType | ReelSlotType;

export interface WeekSlot {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  time: string; // 'HH:MM'
  type: SlotType;
  kind: 'carousel' | 'reel';
  slideCount: number; // para reel = numero de cenas
}

/**
 * Os 7 nós da marca, em ordem canónica.
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
 * Plano fixo de uma semana: 21 slots (7 manhãs carrossel + 7 noites carrossel
 * + 7 reels). Cada slot indica dia, hora, tipo, kind e contagem.
 */
export const WEEK_PLAN: WeekSlot[] = Array.from({ length: 7 }, (_, d) => [
  {
    dayOfWeek: d as WeekSlot['dayOfWeek'],
    time: '09:00',
    type: DIDACTIC_ROTATION[d],
    kind: 'carousel' as const,
    slideCount: 8,
  },
  {
    dayOfWeek: d as WeekSlot['dayOfWeek'],
    time: '13:00',
    type: EVENING_ROTATION[d],
    kind: 'carousel' as const,
    slideCount: EVENING_ROTATION[d] === 'cta' ? 6 : 8,
  },
  {
    dayOfWeek: d as WeekSlot['dayOfWeek'],
    time: '18:00',
    type: 'reel-kinetic' as const,
    kind: 'reel' as const,
    slideCount: 8, // = numero de cenas no reel (~15s @ 1.8s/cena)
  },
]).flat();

export interface CampaignSlot extends WeekSlot {
  weekIndex: number;
  dayOffset: number;
  slotIndexAbs: number;
}

export function buildCampaignPlan(
  weeksCount: number,
  kindFilter?: Array<'carousel' | 'reel'>,
): CampaignSlot[] {
  const safeWeeks = Math.max(1, Math.min(weeksCount, 8));
  const result: CampaignSlot[] = [];
  for (let w = 0; w < safeWeeks; w++) {
    for (let i = 0; i < WEEK_PLAN.length; i++) {
      const base = WEEK_PLAN[i];
      if (kindFilter && !kindFilter.includes(base.kind)) continue;
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

export function knotForSlot(slotIndex: number): Knot {
  return KNOTS[slotIndex % KNOTS.length];
}
