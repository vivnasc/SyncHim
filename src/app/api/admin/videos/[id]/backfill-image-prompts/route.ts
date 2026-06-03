import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { generateStructured } from '@/lib/admin/claude';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/admin/videos/{id}/backfill-image-prompts
 *
 * Para reels gerados antes do schema com imagePrompt: pede a Claude
 * para olhar para os textos das cenas existentes e devolver um
 * imagePrompt por cena (regra: capa + CTA obrigatorio + 2 conteudos).
 * Actualiza content_slides.design.imagePrompt sem tocar no body.
 *
 * Idempotente: cenas que ja teem imagePrompt sao saltadas (mantem).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminEmailFromRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const supabase = createSupabaseAdmin();
  const { data: item } = await supabase
    .from('content_items').select('*').eq('id', params.id).eq('type', 'video').maybeSingle();
  if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const { data: scenes } = await supabase
    .from('content_slides').select('*').eq('item_id', item.id).order('idx', { ascending: true });
  if (!scenes?.length) return NextResponse.json({ error: 'sem cenas' }, { status: 400 });

  const TOOL = {
    name: 'backfill_prompts',
    description: 'Devolve um imagePrompt por cena com base no texto.',
    input_schema: {
      type: 'object' as const,
      properties: {
        prompts: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              idx: { type: 'integer' as const },
              imagePrompt: { type: 'string' as const, description: 'Cinematografico, vertical 9:16, luz dourada lateral, pessoa em interaccao, NUNCA close-up cara. Vazio "" se a cena nao pede imagem (mas garante cena 1 e ultima preenchidas + minimo 2 outras).' },
            },
            required: ['idx', 'imagePrompt'],
          },
        },
      },
      required: ['prompts'],
    },
  };

  const sceneList = scenes.map((s: any) => `${s.idx + 1}. ${s.body.replace(/\n/g, ' ').slice(0, 200)}`).join('\n');
  const isCapa = (i: number) => i === 0;
  const isCta = (i: number) => i === scenes.length - 1;

  const system = `Tu es a Vivianne dos Santos, criadora do SyncHim. Vais ver textos de cenas de um reel kinetic ja escrito e devolver um imagePrompt por cena.

Regras (igual aos carrosseis):
- Cena 1 (capa): imagePrompt OBRIGATORIO nao vazio. E o hook visual.
- Cena ${scenes.length} (ultima, CTA): imagePrompt OBRIGATORIO nao vazio.
- Pelo menos 2 das cenas do meio com imagePrompt nao vazio.
- Outras: imagePrompt = "" (cena fica so com gradiente bordeaux + texto).

Estilo das imagens:
- Cinematografico, escuro, intimo. Vertical 9:16 (--ar 9:16).
- Tons quentes, sombras profundas, luz dourada lateral natural.
- Pessoas em interaccao (mulher na cozinha ao por do sol, mulher ao telefone numa janela, etc) ou ambientes (mesa de cafe vazia, cama desfeita ao amanhecer).
- NUNCA close-up de cara colada ao ecra. NUNCA olhar directo a camara.
- SEM texto na imagem. SEM logos.`;

  const prompt = `Reel SyncHim sobre o no relacional. ${scenes.length} cenas:

${sceneList}

Devolve ${scenes.length} prompts (1 por cena), garantindo regra de cobertura.`;

  let result: { prompts: Array<{ idx: number; imagePrompt: string }> };
  try {
    result = await generateStructured({ system, prompt, schema: TOOL, maxTokens: 2048 });
  } catch (err: any) {
    return NextResponse.json({ error: `Claude: ${err.message}` }, { status: 500 });
  }

  let updated = 0;
  let skipped = 0;
  for (const p of result.prompts ?? []) {
    const scene = scenes.find((s: any) => s.idx === p.idx);
    if (!scene) continue;
    if (scene.design?.imagePrompt) { skipped++; continue; }
    const newDesign = {
      ...(scene.design ?? {}),
      ...(p.imagePrompt?.trim() ? { imagePrompt: p.imagePrompt.trim() } : {}),
    };
    await supabase.from('content_slides').update({ design: newDesign }).eq('id', scene.id);
    if (p.imagePrompt?.trim()) updated++;
  }

  return NextResponse.json({
    ok: true, code: item.code, updated, skipped, totalScenes: scenes.length,
  });
}
