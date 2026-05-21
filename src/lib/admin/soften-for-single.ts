/**
 * SyncHim · transform de texto casada → solteira.
 *
 * Este helper aplica substituições conservadoras a copy escrito para
 * mulheres casadas para o transformar em copy adequado a solteiras à
 * procura de relacionamento sério. NÃO é um tradutor automático — é
 * um ponto de partida. A editora revê sempre antes de marcar 'ready'.
 *
 * Regras:
 *   - Preserva maiúsculas iniciais (Marido → Ele).
 *   - Substitui apenas palavras inteiras (\b), evita corromper compostas.
 *   - Tem zero efeito sobre texto que já mencione "ele" ou "relação".
 *
 * Se ficares com dúvidas sobre se uma substituição faz sentido num
 * slide específico, abre o editor manualmente.
 */

type Rule = { from: RegExp; to: string };

const RULES: Rule[] = [
  // Marido → ele (preservando case)
  { from: /\bo teu marido\b/gi, to: 'ele' },
  { from: /\bao teu marido\b/gi, to: 'a ele' },
  { from: /\bdo teu marido\b/gi, to: 'dele' },
  { from: /\bmarido\b/g, to: 'ele' },
  { from: /\bMarido\b/g, to: 'Ele' },
  // Husband → him
  { from: /\byour husband\b/gi, to: 'him' },
  { from: /\bhusband\b/g, to: 'him' },
  { from: /\bHusband\b/g, to: 'Him' },
  // Casamento → relação (que ainda procuras)
  { from: /\bo teu casamento\b/gi, to: 'a tua próxima relação' },
  { from: /\bdo teu casamento\b/gi, to: 'da próxima relação que tentas construir' },
  { from: /\bcasamento\b/g, to: 'relação' },
  { from: /\bCasamento\b/g, to: 'Relação' },
  // Marriage → relationship
  { from: /\byour marriage\b/gi, to: 'the relationship you want' },
  { from: /\bmarriage\b/g, to: 'relationship' },
  { from: /\bMarriage\b/g, to: 'Relationship' },
  // Esposa → mulher
  { from: /\besposa\b/g, to: 'mulher' },
  { from: /\bEsposa\b/g, to: 'Mulher' },
  // "ser esposa ou mãe" → "ser mulher de alguém ou mãe"
  { from: /\bser esposa\b/g, to: 'ser mulher de alguém' },
  // Anos juntos / décadas → meses
  { from: /\banos juntos\b/g, to: 'encontros' },
  { from: /\bdécadas\b/g, to: 'tentativas' },
  // "a tua mãe não percebe" → mantém (genérico)
];

export function softenForSingle(text: string): string {
  let out = text;
  for (const { from, to } of RULES) out = out.replace(from, to);
  return out;
}

/**
 * Aplica softenForSingle a todos os slides de um carrossel/vídeo,
 * preservando layout, design e idx.
 */
export function softenSlides<T extends { body: string }>(slides: T[]): T[] {
  return slides.map((s) => ({ ...s, body: softenForSingle(s.body) }));
}
