/**
 * Wrapper para o endpoint with-timestamps do ElevenLabs.
 * Devolve o audio MP3 mais o timing por palavra (start/end em segundos).
 * Usado pelo /voice e pelo process-all para alimentar o karaoke kinetic.
 */

export type WordTime = { text: string; start: number; end: number };

export type TtsResult = {
  audio: Uint8Array;
  wordTimes: WordTime[];
  durationSec: number;
};

const TTS_MODEL = process.env.ELEVENLABS_TTS_MODEL || 'eleven_multilingual_v2';

/** Remove markdown leve (asteriscos, underscores) que o TTS leria à letra. */
export function stripMarkdownForTts(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/[*_]/g, '');
}

/**
 * Agrupa o array de caracteres devolvido pela ElevenLabs em palavras.
 * Considera whitespace como separador. Pontuação fica anexada à palavra
 * anterior (mais natural para o karaoke).
 */
export function alignmentToWordTimes(
  characters: string[],
  starts: number[],
  ends: number[],
): WordTime[] {
  const words: WordTime[] = [];
  let cur: WordTime | null = null;
  for (let i = 0; i < characters.length; i++) {
    const c = characters[i] ?? '';
    if (/\s/.test(c)) {
      if (cur) { words.push(cur); cur = null; }
      continue;
    }
    if (!cur) cur = { text: c, start: starts[i] ?? 0, end: ends[i] ?? 0 };
    else { cur.text += c; cur.end = ends[i] ?? cur.end; }
  }
  if (cur) words.push(cur);
  return words;
}

export async function ttsWithTimestamps(rawText: string): Promise<TtsResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY em falta');
  if (!voiceId) throw new Error('ELEVENLABS_VOICE_ID em falta');

  const text = stripMarkdownForTts(rawText);

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: TTS_MODEL,
        voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.15 },
      }),
    },
  );
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`ElevenLabs ${res.status}: ${errText.slice(0, 200)}`);
  }
  const j = await res.json() as {
    audio_base64: string;
    alignment?: {
      characters?: string[];
      character_start_times_seconds?: number[];
      character_end_times_seconds?: number[];
    };
    normalized_alignment?: {
      characters?: string[];
      character_start_times_seconds?: number[];
      character_end_times_seconds?: number[];
    };
  };

  const audio = Uint8Array.from(Buffer.from(j.audio_base64, 'base64'));
  const align = j.normalized_alignment ?? j.alignment;
  const wordTimes = align?.characters
    ? alignmentToWordTimes(
        align.characters,
        align.character_start_times_seconds ?? [],
        align.character_end_times_seconds ?? [],
      )
    : [];
  const durationSec = wordTimes.length
    ? wordTimes[wordTimes.length - 1].end + 0.4
    : audio.length / 16000;

  return { audio, wordTimes, durationSec };
}
