/**
 * SyncHim · cliente Replicate para gerar imagens dos slides.
 *
 * Usa Flux Schnell por defeito (rapido, ~3-5s, ~$0.003/img). O envelope
 * Replicate API e simples — usamos fetch directo com Prefer: wait para
 * obter o resultado sincronamente sem polling.
 *
 * Cada imagem gerada e descarregada e re-uploaded para Supabase Storage
 * porque os URLs da Replicate expiram em ~1h.
 *
 * Env: REPLICATE_API_TOKEN, opcional REPLICATE_MODEL
 */

import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { publicUrl, storageBucket } from './storage';

// Pro por defeito: cinematografico, editorial, sem artefactos.
// Schnell e mais barato mas notavelmente pior em luz/sombra e maos.
const DEFAULT_MODEL = 'black-forest-labs/flux-1.1-pro';

export interface GenerateImageOptions {
  aspectRatio?: '4:5' | '1:1' | '9:16' | '16:9';
  model?: string;
  /** Onde guardar no Supabase. Se ausente, gera path aleatorio. */
  storagePath?: string;
}

export interface GeneratedImage {
  url: string;        // URL publico no Supabase Storage
  replicateUrl: string; // URL original (expira)
  model: string;
  latencyMs: number;
}

/**
 * Cada modelo Replicate tem um shape diferente de input. Esta funcao
 * normaliza para o que cada um espera.
 */
function buildModelInput(model: string, prompt: string, aspectRatio: string) {
  const base: Record<string, unknown> = { prompt };
  if (model.includes('flux-1.1-pro') || model.includes('flux-pro')) {
    return {
      ...base,
      aspect_ratio: aspectRatio,
      output_format: 'png',
      output_quality: 95,
      safety_tolerance: 5,
      prompt_upsampling: true,
    };
  }
  if (model.includes('flux-schnell')) {
    return {
      ...base,
      aspect_ratio: aspectRatio,
      output_format: 'png',
      output_quality: 90,
      num_outputs: 1,
    };
  }
  // Fallback generico (SDXL, etc.)
  return {
    ...base,
    width: 1080,
    height: 1350,
    num_outputs: 1,
  };
}

/**
 * Limpa parametros estilo Midjourney que a Replicate nao entende.
 */
function cleanMjPrompt(prompt: string): string {
  return prompt
    .replace(/--ar\s+\S+/gi, '')
    .replace(/--style\s+\S+/gi, '')
    .replace(/--v\s+\S+/gi, '')
    .replace(/--niji\s*\d*/gi, '')
    .replace(/--no\s+[^-]+/gi, '')
    .replace(/--s\s+\d+/gi, '')
    .replace(/--c\s+\d+/gi, '')
    .replace(/--q\s+\d+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Chama Replicate, descarrega a imagem, sobe para Supabase, devolve URL final.
 */
export async function generateImage(
  prompt: string,
  opts: GenerateImageOptions = {},
): Promise<GeneratedImage> {
  const apiKey = process.env.REPLICATE_API_TOKEN;
  if (!apiKey) throw new Error('REPLICATE_API_TOKEN nao configurado');

  const model = opts.model || process.env.REPLICATE_MODEL || DEFAULT_MODEL;
  const aspectRatio = opts.aspectRatio || '4:5';
  const cleanPrompt = cleanMjPrompt(prompt);

  const t0 = Date.now();

  const repRes = await fetch(
    `https://api.replicate.com/v1/models/${model}/predictions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Prefer: 'wait=60',
      },
      body: JSON.stringify({
        input: buildModelInput(model, cleanPrompt, aspectRatio),
      }),
    },
  );

  if (!repRes.ok) {
    const body = await repRes.text().catch(() => '');
    throw new Error(`Replicate HTTP ${repRes.status}: ${body.slice(0, 300)}`);
  }

  const json = (await repRes.json()) as {
    output?: string | string[] | null;
    status?: string;
    error?: string | null;
    id?: string;
  };

  if (json.error) throw new Error(`Replicate erro: ${json.error}`);
  if (json.status && !['succeeded', 'processing'].includes(json.status)) {
    throw new Error(`Replicate status inesperado: ${json.status}`);
  }

  const out = Array.isArray(json.output) ? json.output[0] : json.output;
  if (!out || typeof out !== 'string') {
    throw new Error(`Replicate sem output (status=${json.status})`);
  }

  // Descarrega imagem e sobe para Supabase
  const imgRes = await fetch(out);
  if (!imgRes.ok) throw new Error(`download Replicate falhou: HTTP ${imgRes.status}`);
  const buf = new Uint8Array(await imgRes.arrayBuffer());

  const storagePath =
    opts.storagePath ||
    `replicate/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;

  const supabase = createSupabaseAdmin();
  const { error } = await supabase.storage
    .from(storageBucket())
    .upload(storagePath, buf, { contentType: 'image/png', upsert: true });
  if (error) throw new Error(`Supabase upload falhou: ${error.message}`);

  return {
    url: publicUrl(storagePath),
    replicateUrl: out,
    model,
    latencyMs: Date.now() - t0,
  };
}
