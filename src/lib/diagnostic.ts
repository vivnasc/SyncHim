export const NOS = [
  'fome',
  'controlo',
  'inferioridade',
  'desconfianca',
  'salvadora',
  'abandono',
  'invisibilidade'
] as const;

export type No = (typeof NOS)[number];

// Todos os 7 nós são vendáveis: o conteúdo Tier 1+2 (sessões 3-7 +
// práticas) existe pelo menos na variante 'solteira' para todos, e a
// variante 'casada' cai para 'solteira' via fallback no content loader
// enquanto a editora completa a escrita dedicada por contexto.
export const NOS_VENDAVEIS: readonly No[] = NOS;

export type Locale = 'pt' | 'en';

export const QUESTIONS_PER_NO: Record<No, [string, string, string]> = {
  fome: ['q1', 'q2', 'q3'],
  controlo: ['q4', 'q5', 'q6'],
  inferioridade: ['q7', 'q8', 'q9'],
  desconfianca: ['q10', 'q11', 'q12'],
  salvadora: ['q13', 'q14', 'q15'],
  abandono: ['q16', 'q17', 'q18'],
  invisibilidade: ['q19', 'q20', 'q21']
};

export const TIEBREAK_ORDER: readonly No[] = [
  'fome',
  'controlo',
  'invisibilidade',
  'inferioridade',
  'abandono',
  'desconfianca',
  'salvadora'
];

export type Respostas = Record<string, 0 | 1 | 2 | 3>;
export type Pontuacoes = Record<No, number>;

export function pontuar(respostas: Respostas): Pontuacoes {
  const out = {} as Pontuacoes;
  for (const no of NOS) {
    const [a, b, c] = QUESTIONS_PER_NO[no];
    out[no] = (respostas[a] ?? 0) + (respostas[b] ?? 0) + (respostas[c] ?? 0);
  }
  return out;
}

export function noDominante(pontuacoes: Pontuacoes): No {
  let dominante: No = TIEBREAK_ORDER[0];
  let maior = pontuacoes[dominante];
  for (const no of TIEBREAK_ORDER) {
    if (pontuacoes[no] > maior) {
      dominante = no;
      maior = pontuacoes[no];
    }
  }
  return dominante;
}

export function noSecundario(pontuacoes: Pontuacoes, dominante: No): No | null {
  let segundo: No | null = null;
  let maior = -1;
  for (const no of TIEBREAK_ORDER) {
    if (no === dominante) continue;
    if (pontuacoes[no] > maior) {
      segundo = no;
      maior = pontuacoes[no];
    }
  }
  if (maior <= 0) return null;
  return segundo;
}

export const QUESTIONS_PT: Record<string, string> = {
  q1: 'Quando ele demora a responder a uma mensagem, eu reviso a conversa para perceber o que disse de errado.',
  q2: 'Quando estamos os dois calados, eu sinto necessidade de quebrar o silêncio.',
  q3: 'O meu humor do dia depende muito de como ele acordou.',
  q4: 'Eu sei melhor do que ele o que ele precisa de fazer no dia-a-dia.',
  q5: 'Já desisti de pedir e prefiro fazer eu, é mais rápido.',
  q6: 'Quando ele toma uma decisão sem me consultar, sinto-me desrespeitada.',
  q7: 'Sinto que ele podia ter alguém melhor do que eu.',
  q8: 'Engulo coisas que me magoam para não criar problema.',
  q9: 'Quando ele me elogia, custa-me acreditar.',
  q10: 'Já vi o telemóvel dele às escondidas mais de uma vez.',
  q11: 'Quando ele se atrasa, eu imagino cenários antes de ele chegar.',
  q12: 'Acredito que a maioria dos homens, mais cedo ou mais tarde, trai.',
  q13: 'Eu vejo nele um potencial que ele próprio ainda não vê.',
  q14: 'Faço por ele coisas que ele devia fazer sozinho.',
  q15: 'Se ele estivesse bem sem mim, eu sentir-me-ia menos necessária.',
  q16: 'Tenho medo, mesmo nos bons momentos, de que ele se vá embora um dia.',
  q17: 'Já criei distância de propósito antes que ele criasse.',
  q18: 'Quando ele se afasta um pouco, eu já estou a preparar-me para o fim.',
  q19: 'Já não sei dizer o que gosto de fazer fora de ser esposa ou mãe.',
  q20: 'Sinto-me invisível dentro da minha própria casa.',
  q21: 'Cobro-lhe atenção, mas eu própria já não me dou atenção há anos.'
};

export const QUESTIONS_EN: Record<string, string> = {
  q1: "When he takes long to reply, I replay the conversation to figure out what I said wrong.",
  q2: 'When we are both quiet, I feel the need to break the silence.',
  q3: 'My mood for the day depends a lot on how he woke up.',
  q4: 'I know what he needs to do day-to-day better than he does.',
  q5: "I've given up asking and prefer to do it myself, it's faster.",
  q6: 'When he makes a decision without consulting me, I feel disrespected.',
  q7: 'I feel he could have someone better than me.',
  q8: "I swallow things that hurt me so as not to make a problem.",
  q9: "When he compliments me, it's hard for me to believe it.",
  q10: "I've checked his phone in secret more than once.",
  q11: "When he's late, I imagine scenarios before he arrives.",
  q12: 'I believe most men, sooner or later, cheat.',
  q13: "I see in him a potential he doesn't yet see himself.",
  q14: 'I do for him things he should do on his own.',
  q15: 'If he were fine without me, I would feel less needed.',
  q16: 'I fear, even in good times, that he will leave one day.',
  q17: "I've created distance on purpose before he could.",
  q18: 'When he pulls away a little, I am already preparing for the end.',
  q19: "I can't say what I like to do outside of being a wife or mother.",
  q20: 'I feel invisible inside my own home.',
  q21: 'I demand attention from him, but I haven’t paid attention to myself in years.'
};

export function questionMap(locale: Locale): Record<string, string> {
  return locale === 'pt' ? QUESTIONS_PT : QUESTIONS_EN;
}

export function questionIds(): string[] {
  return Array.from({ length: 21 }, (_, i) => `q${i + 1}`);
}
