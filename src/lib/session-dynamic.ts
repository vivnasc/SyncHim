/**
 * Expansão do Bloco A da Sessão 7 (e qualquer outro bloco dinâmico).
 *
 * Os markdowns têm marcadores como:
 *   > [Mostrar resposta no bloco "reflexao_sessao_3"]
 *   > [Mostrar respostas das 5 perguntas]   (sessão 4)
 *   > [Mostrar carta completa]               (carta da sessão 6)
 *   > [Mostrar reflexão da Sessão 3]
 *   > [Mostrar bloco "X"]
 *
 * Esta função substitui esses marcadores pelo conteúdo guardado em
 * synchim.respostas, formatado como bloco de citação em markdown.
 */

import { createSupabaseAdmin } from '@/lib/supabase/admin';

type Resposta = { bloco_id: string; resposta: string | null };

/**
 * Lê todas as respostas guardadas de um (user × nó) para Tier 1.
 * Devolve um Map { bloco_id → texto } para lookup rápido.
 */
async function loadAnswers(userId: string, no: string): Promise<Map<string, string>> {
  const supabase = createSupabaseAdmin();
  // O schema actual de respostas tem (user_id, sessao_numero, no, bloco_id, resposta).
  // Filtramos por user+no e indexamos por bloco_id.
  const { data } = await supabase
    .from('respostas')
    .select('bloco_id, resposta, sessao_numero')
    .eq('user_id', userId)
    .eq('no', no);
  const map = new Map<string, string>();
  (data ?? []).forEach((r: any) => {
    if (r.resposta && r.bloco_id) {
      map.set(String(r.bloco_id), String(r.resposta));
    }
  });
  return map;
}

function quoteBlock(text: string): string {
  if (!text.trim()) return '> _(sem resposta guardada)_';
  return text
    .split('\n')
    .map((l) => `> ${l}`)
    .join('\n');
}

/**
 * Resolve um único marcador. `inner` é o texto dentro de `[Mostrar ...]`.
 */
function resolveMarker(inner: string, answers: Map<string, string>): string {
  const lower = inner.toLowerCase();

  // [Mostrar bloco "X"] ou [Mostrar resposta no bloco "X"]
  const blocoMatch = inner.match(/bloco\s+["“]([^"”]+)["”]/i);
  if (blocoMatch) {
    return quoteBlock(answers.get(blocoMatch[1]) ?? '');
  }

  // [Mostrar respostas das 5 perguntas]   → junta pergunta_s4_1..5
  if (/respostas\s+das\s+5\s+perguntas/i.test(lower)) {
    const parts: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const r = answers.get(`pergunta_s4_${i}`);
      if (r) parts.push(`**${i}.** ${r}`);
    }
    return quoteBlock(parts.join('\n\n') || '(sem respostas guardadas)');
  }

  // [Mostrar carta completa]  → carta_sessao_6
  if (/carta\s+completa/i.test(lower) || /carta\s+da\s+sess[ãa]o\s+6/i.test(lower)) {
    return quoteBlock(answers.get('carta_sessao_6') ?? '');
  }

  // [Mostrar reflex(ã|a)o da Sess(ã|a)o N]
  const refl = lower.match(/reflex[ãa]o\s+da\s+sess[ãa]o\s+(\d)/);
  if (refl) {
    return quoteBlock(answers.get(`reflexao_sessao_${refl[1]}`) ?? '');
  }

  // [Mostrar resposta "sim" da Sessão 1]
  if (/sess[ãa]o\s+1/i.test(lower) && /sim/i.test(lower)) {
    return quoteBlock(answers.get('reconhecimento_sessao_1') ?? 'sim');
  }

  // Fallback: deixa o marcador como está, mas em itálico, para a
  // editora detectar e completar.
  return `> _${inner.trim()}_`;
}

/**
 * Substitui todos os `[Mostrar ...]` (incluindo o `> ` à frente quando
 * o marcador está numa linha de quote) pelo conteúdo expandido.
 */
export async function expandDynamic(markdown: string, userId: string | null, no: string | null): Promise<string> {
  if (!userId || !no) return markdown;
  // Não cobre todos os casos, mas é barato: se o markdown não tem `[Mostrar`,
  // saltamos a query à BD.
  if (!/\[\s*Mostrar/i.test(markdown)) return markdown;

  const answers = await loadAnswers(userId, no);

  // Apanha linhas como `> [Mostrar ...]` (substitui a linha toda) ou
  // `[Mostrar ...]` solto.
  return markdown.replace(
    /(^|\n)>?\s*\[\s*Mostrar\s+([^\]]+)\]\s*(?=\n|$)/gi,
    (_full, lead, inner) => `${lead}${resolveMarker(inner, answers)}`
  );
}
