/**
 * SyncHim · geração de música ambiente Marina Vale via Suno-compatible API.
 *
 * Compatível com qualquer provider que siga o padrão Suno-style:
 *   POST <SUNO_API_URL>/generate  { prompt, ... } → { taskId }
 *   GET  <SUNO_API_URL>/status/<taskId>           → { status, audio_url }
 *
 * Testado com sunoapi.com, api.box e similares.
 *
 * Env vars:
 *   SUNO_API_URL       ex: https://api.sunoapi.com/api/v1
 *   SUNO_API_KEY       Bearer token
 *   SUNO_MODEL         ex: chirp-v3-5 (opcional)
 */

export type SunoGenArgs = {
  /** Prompt da música. Ex: "ambient pad meditativo, piano esparso, sem voz, textura de pergaminho". */
  prompt: string;
  /** Duração em segundos (Suno aceita 30-300; default 90). */
  durationSec?: number;
  /** Estilo opcional (Suno combina com o prompt). */
  style?: string;
  /** Modo instrumental (sem voz). Default true para SyncHim. */
  instrumental?: boolean;
};

export type SunoResult = {
  audioUrl: string;
  durationSec: number;
  rawId: string;
};

function endpoint(): string {
  const url = process.env.SUNO_API_URL;
  if (!url) throw new Error('SUNO_API_URL não configurado');
  return url.replace(/\/$/, '');
}

function headers(): HeadersInit {
  const key = process.env.SUNO_API_KEY;
  if (!key) throw new Error('SUNO_API_KEY não configurado');
  return {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Inicia uma geração. Devolve o taskId.
 *
 * O payload é genérico — a maioria dos wrappers Suno aceita estes campos.
 * Se o teu provider usar nomes diferentes, ajusta aqui.
 */
async function start(args: SunoGenArgs): Promise<string> {
  const body = {
    prompt: args.prompt,
    duration: args.durationSec ?? 90,
    make_instrumental: args.instrumental ?? true,
    style: args.style,
    model: process.env.SUNO_MODEL || undefined
  };
  const res = await fetch(`${endpoint()}/generate`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Suno generate ${res.status}: ${detail}`);
  }
  const j = await res.json() as any;
  // Vários providers devolvem campos diferentes para o id da task
  const id = j.taskId ?? j.task_id ?? j.id ?? j.data?.id ?? j.data?.taskId;
  if (!id) throw new Error(`Suno: id não encontrado no response: ${JSON.stringify(j).slice(0, 200)}`);
  return String(id);
}

/** Polling. Devolve quando ready, ou throw após maxAttempts. */
async function poll(taskId: string, maxAttempts = 60, intervalMs = 5000): Promise<SunoResult> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${endpoint()}/status/${taskId}`, { headers: headers() });
    if (res.ok) {
      const j = await res.json() as any;
      const status = (j.status ?? j.state ?? j.data?.status ?? '').toString().toLowerCase();
      const audioUrl = j.audio_url ?? j.audioUrl ?? j.url ?? j.data?.audio_url ?? j.data?.url;
      const duration = j.duration ?? j.audio_duration ?? j.data?.duration ?? 90;
      if (audioUrl && (status === 'complete' || status === 'completed' || status === 'success' || status === 'done')) {
        return { audioUrl, durationSec: Number(duration), rawId: taskId };
      }
      if (status === 'failed' || status === 'error') {
        throw new Error(`Suno task ${taskId} falhou: ${j.error ?? j.message ?? 'sem detalhe'}`);
      }
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Suno timeout: task ${taskId} não completou em ${maxAttempts * intervalMs / 1000}s`);
}

export async function generateMusic(args: SunoGenArgs): Promise<SunoResult> {
  const taskId = await start(args);
  return poll(taskId);
}

/**
 * Prompts pré-fabricados para a estética Marina Vale.
 * A editora pode usar como ponto de partida e ajustar.
 */
export const PROMPT_PRESETS: Record<string, { label: string; prompt: string }> = {
  pergaminho: {
    label: 'Pergaminho (ambient muito lento)',
    prompt:
      'ambient pad slow, low warm drone, distant single piano notes, faint paper rustle, no vocals, no rhythm, contemplative, dark intimate, like reading a letter alone at night'
  },
  velas: {
    label: 'Velas (cordas suspensas)',
    prompt:
      'sustained strings, very slow, sparse, low register, occasional cello sigh, no rhythm, no melody hook, candlelight feel, intimate, melancholic but composed'
  },
  silencio: {
    label: 'Silêncio interior',
    prompt:
      'near-silent ambient, single sine tone, soft wind, distant bell, almost nothing, like the moment before crying, no instruments forward'
  },
  travessia: {
    label: 'Travessia (mais movimento)',
    prompt:
      'slow building ambient, low piano motif, faint female humming, gradual emergence of warmth, contemplative crossing, no lyrics, no beat'
  }
};
