import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { isWorkerAuthenticated } from '@/lib/admin/worker-auth';
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
  if (!getAdminEmailFromRequest(req) && !isWorkerAuthenticated(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
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

  // Indexa o que o Claude devolveu para consulta rapida
  const byIdx = new Map<number, string>();
  for (const p of result.prompts ?? []) {
    if (p.imagePrompt?.trim()) byIdx.set(p.idx, p.imagePrompt.trim());
  }

  // Fallback deterministico para garantir regra capa + CTA + min 2 conteudos.
  // Se o Claude falhar com a capa/CTA, geramos prompt a partir do texto da cena.
  const fallbackPrompt = (body: string, role: 'capa' | 'cta' | 'conteudo') => {
    const ctx = body.replace(/\n/g, ' ').slice(0, 110);
    const base = 'Cinematic vertical 9:16, intimate dark interior at golden hour, warm side lighting, deep shadows, soft film grain. No text, no logos.';
    if (role === 'capa') {
      return `${base} Opening shot, woman alone in domestic space (kitchen, window, doorway), pensive posture from behind or side, NO close-up face, no direct gaze. Mood: "${ctx}"`;
    }
    if (role === 'cta') {
      return `${base} Closing shot, hands writing in journal or holding warm tea cup on table, soft window light, no face visible. Mood: "${ctx}"`;
    }
    return `${base} Quiet scene, woman in interaction with everyday object (phone on table, mirror at distance, bed unmade at dawn), NO close-up face. Mood: "${ctx}"`;
  };

  const lastIdx = scenes.length - 1;
  // Garante capa
  if (!byIdx.has(0)) {
    const capaScene = scenes.find((s: any) => s.idx === 0);
    if (capaScene) byIdx.set(0, fallbackPrompt(capaScene.body ?? '', 'capa'));
  }
  // Garante CTA
  if (!byIdx.has(lastIdx)) {
    const ctaScene = scenes.find((s: any) => s.idx === lastIdx);
    if (ctaScene) byIdx.set(lastIdx, fallbackPrompt(ctaScene.body ?? '', 'cta'));
  }
  // Garante minimo 2 conteudos do meio
  const middleScenes = scenes.filter((s: any) => s.idx !== 0 && s.idx !== lastIdx);
  const middleWithPrompt = middleScenes.filter((s: any) => byIdx.has(s.idx)).length;
  if (middleWithPrompt < 2) {
    const need = 2 - middleWithPrompt;
    const missing = middleScenes.filter((s: any) => !byIdx.has(s.idx)).slice(0, need);
    for (const s of missing) byIdx.set(s.idx, fallbackPrompt(s.body ?? '', 'conteudo'));
  }

  let updated = 0;
  let skipped = 0;
  let forced = 0;
  for (const scene of scenes as any[]) {
    if (scene.design?.imagePrompt) { skipped++; continue; }
    const claudePrompt = (result.prompts ?? []).find((p) => p.idx === scene.idx)?.imagePrompt?.trim();
    const finalPrompt = byIdx.get(scene.idx);
    if (!finalPrompt) continue;
    if (!claudePrompt && finalPrompt) forced++;
    const newDesign = { ...(scene.design ?? {}), imagePrompt: finalPrompt };
    await supabase.from('content_slides').update({ design: newDesign }).eq('id', scene.id);
    updated++;
  }

  return NextResponse.json({
    ok: true, code: item.code, updated, skipped, forced, totalScenes: scenes.length,
  });
}
