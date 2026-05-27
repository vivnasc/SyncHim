/**
 * SyncHim · Gerador de carrosséis via Claude API.
 *
 * Usa generateStructured() com tool_choice para garantir JSON estrito.
 * Cada tipo de carrossel tem um brief específico; o system prompt
 * partilhado carrega a voz da marca.
 */

import { generateStructured } from './claude';
import type { CarouselSlotType, Knot } from './calendar-plan';

/* ------------------------------------------------------------------ */
/*  Tipos                                                              */
/* ------------------------------------------------------------------ */

export interface GeneratedSlide {
  layout: 'capa' | 'conteudo' | 'cta' | 'assinatura';
  body: string;
  imagePrompt: string;
}

export interface GeneratedCarousel {
  title: string;
  slides: GeneratedSlide[];
  caption: string;
  hashtags: string;
}

/* ------------------------------------------------------------------ */
/*  System prompt (partilhado)                                         */
/* ------------------------------------------------------------------ */

const SYSTEM_PROMPT = `Tu es a Vivianne dos Santos, criadora do SyncHim, um programa de auto-conhecimento relacional para mulheres.

A tua voz:
- Escrita intimista, confessional, em PT-PT (nunca PT-BR).
- Tom autoritário mas calmo, como quem já viu tudo e não julga.
- NUNCA uses travessões longos (—), usa vírgulas ou pontos em vez.
- NUNCA uses a expressão "energia feminina", "sagrado feminino", jargão new-age, ou linguagem esotérica.
- NUNCA uses emojis no corpo dos slides.
- Podes usar **negrito** e _itálico_ com moderação.
- Frases curtas. Parágrafos de 1-3 linhas. Ritmo de leitura rápida no telemóvel.

Os 7 nós (padrões relacionais que o programa trabalha):
1. Fome (necessidade excessiva de atenção e validação)
2. Controlo (necessidade de controlar o outro ou a relação)
3. Inferioridade (sentir-se sempre menos, nunca suficiente)
4. Desconfiança (desconfiança crónica, hipervigilância)
5. Salvadora (colocar-se sempre no papel de quem salva o outro)
6. Abandono (medo paralisante de ser deixada)
7. Invisibilidade (anular-se na relação, perder identidade)

Público-alvo: mulheres (casadas ou solteiras) que reconhecem padrões repetitivos nas suas relações.

Identidade visual dos slides:
- Fundo escuro (#1A1410), texto claro (#F2E8DC), detalhes dourados (#B8843D)
- Tipografia serifada (EB Garamond), íntima, editorial
- Formato vertical 1080x1350 (carrossel Instagram)

Regras dos image prompts (Midjourney):
- Cinematográfico, escuro, íntimo
- Formato retrato 1080x1350 (--ar 4:5)
- SEM texto na imagem
- Tons quentes, sombras profundas, luz dourada lateral
- Figuras femininas quando relevante (silhuetas, mãos, fragmentos)
- Termina cada prompt com: --ar 4:5 --style raw --v 6.1`;

/* ------------------------------------------------------------------ */
/*  Tool schema (Anthropic format)                                     */
/* ------------------------------------------------------------------ */

const CAROUSEL_TOOL = {
  name: 'save_carousel',
  description: 'Grava um carrossel completo com slides, caption e hashtags.',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: {
        type: 'string' as const,
        description: 'Titulo do carrossel (curto, hook)',
      },
      slides: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            layout: {
              type: 'string' as const,
              enum: ['capa', 'conteudo', 'cta', 'assinatura'],
            },
            body: {
              type: 'string' as const,
              description:
                'Texto do slide, markdown leve (**bold**, _italic_)',
            },
            imagePrompt: {
              type: 'string' as const,
              description:
                'Midjourney prompt for this slide background image. Cinematic, dark, intimate, 1080x1350 portrait. NO text in image.',
            },
          },
          required: ['layout', 'body', 'imagePrompt'],
        },
      },
      caption: {
        type: 'string' as const,
        description: 'Instagram caption',
      },
      hashtags: {
        type: 'string' as const,
        description: '15-20 hashtags',
      },
    },
    required: ['title', 'slides', 'caption', 'hashtags'],
  },
};

/* ------------------------------------------------------------------ */
/*  Briefs por tipo                                                    */
/* ------------------------------------------------------------------ */

const TYPE_BRIEFS: Record<CarouselSlotType, string> = {
  'didatico-A':
    'Escreve um carrossel onde a leitora se reconhece num padrao sem nomear o no directamente. Tipo "diagnostico encoberto": ela le e pensa "isto sou eu". Nao digas o nome do no ate ao penultimo slide.',
  'didatico-B':
    'Explica COMO um no especifico opera, o mecanismo por tras do padrao. Tipo "mecanica revelada": mostra a engrenagem, o ciclo, o que acontece por baixo da superficie.',
  'didatico-C':
    'Desmonta um mito relacional comum que as mulheres acreditam. Tipo "mito desmontado": frase que toda a gente repete + porque e que esta errada + a verdade por baixo.',
  'didatico-D':
    'Uma verdade dura que doi ler mas e inegavel. Tipo "verdade que doi": directa, sem rodeios, compaixao sem condescendencia.',
  reconhecimento:
    'Um carrossel de frases curtas e poderosas que fazem a leitora sentir-se VISTA. Imagina que ela esta no sofa as 20h, sozinha, a scrollar. Cada slide e uma frase que a faz parar. Confessional, intima, sem didactica.',
  cta:
    'Um convite gentil para fazer o diagnostico do SyncHim. Sem pressao, sem urgencia, sem desconto. Mostra o valor de se conhecer. O link e synchim.com/diagnostico.',
};

/* ------------------------------------------------------------------ */
/*  Knot labels                                                        */
/* ------------------------------------------------------------------ */

const KNOT_LABELS: Record<Knot, string> = {
  fome: 'Fome (necessidade excessiva de atencao e validacao)',
  controlo: 'Controlo (necessidade de controlar o outro ou a relacao)',
  inferioridade: 'Inferioridade (sentir-se sempre menos, nunca suficiente)',
  desconfianca: 'Desconfianca (desconfianca cronica, hipervigilancia)',
  salvadora: 'Salvadora (colocar-se no papel de quem salva o outro)',
  abandono: 'Abandono (medo paralisante de ser deixada)',
  invisibilidade: 'Invisibilidade (anular-se na relacao, perder identidade)',
};

const WEEKDAY_LABELS = [
  'segunda-feira',
  'terca-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sabado',
  'domingo',
];

/* ------------------------------------------------------------------ */
/*  Gerador                                                            */
/* ------------------------------------------------------------------ */

/**
 * Gera um carrossel completo via Claude API.
 *
 * @param type      Tipo de carrossel (didatico-A, reconhecimento, cta, etc.)
 * @param knotFocus No em foco (opcional, ignorado para CTA)
 * @param weekDay   Dia da semana 0-6 (segunda a domingo), para contexto
 */
export async function generateCarousel(
  type: CarouselSlotType,
  knotFocus?: Knot,
  weekDay?: number,
): Promise<GeneratedCarousel> {
  const brief = TYPE_BRIEFS[type];

  // Monta o user prompt com contexto
  const parts: string[] = [];
  parts.push(brief);

  if (knotFocus && type !== 'cta') {
    parts.push(
      `\nNo em foco para este carrossel: ${KNOT_LABELS[knotFocus]}.`,
    );
  }

  if (weekDay !== undefined) {
    parts.push(
      `\nEste carrossel sera publicado numa ${WEEKDAY_LABELS[weekDay] ?? 'dia'}.`,
    );
  }

  const slideCount = type === 'cta' ? 6 : 8;
  parts.push(
    `\nGera exactamente ${slideCount} slides. O primeiro deve ter layout "capa" (titulo/hook). O ultimo deve ter layout "cta" ou "assinatura". Os do meio sao "conteudo".`,
  );
  parts.push(
    '\nLembra-te: PT-PT, sem travessoes longos, sem emojis nos slides, sem jargao new-age.',
  );

  const prompt = parts.join('\n');

  const result = await generateStructured<GeneratedCarousel>({
    system: SYSTEM_PROMPT,
    prompt,
    schema: CAROUSEL_TOOL,
    maxTokens: 4096,
  });

  return result;
}
