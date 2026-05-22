/**
 * SyncHim · geração de música ambiente via Suno-compatible API.
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
 * Inicia uma geração. Tenta múltiplos shapes de body conhecidos
 * (apibox.erweima, sunoapi.com, suno-api.com, suno.com oficial).
 */
async function start(args: SunoGenArgs): Promise<string> {
  // Shape unificado: vários providers aceitam combinações destes campos.
  // Os que não reconhecem ignoram silenciosamente.
  const body: Record<string, unknown> = {
    prompt: args.prompt,
    customMode: false,                          // apibox: livre / não-custom
    instrumental: args.instrumental ?? true,
    make_instrumental: args.instrumental ?? true, // legacy alias
    duration: args.durationSec ?? 90,
    gpt_description_prompt: args.prompt,        // suno.com style
    tags: args.style ?? 'ambient, contemplative, slow, dark, no vocals'
  };
  if (process.env.SUNO_MODEL) body.model = process.env.SUNO_MODEL;

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
  // Vários shapes para o id da task
  const id =
    j.taskId ?? j.task_id ?? j.id ??
    j.data?.taskId ?? j.data?.task_id ?? j.data?.id ??
    (Array.isArray(j.data) ? j.data[0]?.id : null);
  if (!id) throw new Error(`Suno: id não encontrado no response: ${JSON.stringify(j).slice(0, 300)}`);
  return String(id);
}

/**
 * Lê o estado de uma task. Tenta múltiplos endpoints (em ordem):
 *   1. /generate/record-info?taskId=X    (apibox.erweima / sunoapi.com)
 *   2. /status/<taskId>                  (formato genérico)
 *   3. /generate/<taskId>                (alguns wrappers)
 *   4. /clips/<taskId>                   (suno-api.com)
 *
 * Devolve null se a task ainda não está pronta.
 */
async function fetchStatus(taskId: string): Promise<SunoResult | null> {
  const attempts = [
    `${endpoint()}/generate/record-info?taskId=${encodeURIComponent(taskId)}`,
    `${endpoint()}/status/${encodeURIComponent(taskId)}`,
    `${endpoint()}/generate/${encodeURIComponent(taskId)}`,
    `${endpoint()}/clips/${encodeURIComponent(taskId)}`
  ];

  for (const url of attempts) {
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) continue;
    const j = await res.json().catch(() => null) as any;
    if (!j) continue;

    // 1) apibox shape: { data: { status, response: { sunoData: [{ audioUrl, duration }] } } }
    const sunoData = j.data?.response?.sunoData ?? j.data?.sunoData;
    if (Array.isArray(sunoData) && sunoData[0]?.audioUrl) {
      const status = (j.data?.status ?? '').toString().toUpperCase();
      if (status === 'SUCCESS' || status === 'COMPLETED' || sunoData[0].audioUrl) {
        return {
          audioUrl: sunoData[0].audioUrl,
          durationSec: Number(sunoData[0].duration ?? 90),
          rawId: taskId
        };
      }
    }

    // 2) Generic flat shape: { status, audio_url, duration }
    const status = (j.status ?? j.state ?? j.data?.status ?? '').toString().toLowerCase();
    const audioUrl = j.audio_url ?? j.audioUrl ?? j.url
                  ?? j.data?.audio_url ?? j.data?.audioUrl ?? j.data?.url
                  ?? (Array.isArray(j.data) ? j.data[0]?.audio_url ?? j.data[0]?.audioUrl : null);
    const duration = j.duration ?? j.audio_duration ?? j.data?.duration ?? 90;

    if (status === 'failed' || status === 'error') {
      throw new Error(`Suno task ${taskId} falhou: ${j.error ?? j.message ?? 'sem detalhe'}`);
    }
    if (audioUrl && (
      status === 'complete' || status === 'completed' || status === 'success' ||
      status === 'done' || status === '' /* alguns devolvem só com audio_url sem status */
    )) {
      return { audioUrl, durationSec: Number(duration), rawId: taskId };
    }

    // Resposta válida mas ainda pendente — pára de tentar outros endpoints, espera.
    return null;
  }

  // Nenhum endpoint deu 2xx; voltamos a tentar mais tarde.
  return null;
}

/** Polling. Devolve quando ready, ou throw após maxAttempts. */
async function poll(taskId: string, maxAttempts = 60, intervalMs = 5000): Promise<SunoResult> {
  for (let i = 0; i < maxAttempts; i++) {
    const r = await fetchStatus(taskId);
    if (r) return r;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Suno timeout: task ${taskId} não completou em ${maxAttempts * intervalMs / 1000}s`);
}

export async function generateMusic(args: SunoGenArgs): Promise<SunoResult> {
  const taskId = await start(args);
  return poll(taskId);
}

/**
 * Prompts pré-fabricados para a estética SyncHim.
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
