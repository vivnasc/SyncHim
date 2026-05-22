/**
 * SyncHim · cliente Claude API minimalista para geração de copy.
 *
 * Não usa o SDK (@anthropic-ai/sdk) para evitar adicionar dep pesada.
 * Chama directamente a Messages API com tool_choice para garantir
 * JSON estrito sem parsing defensivo.
 *
 * Env:
 *   ANTHROPIC_API_KEY
 *   ANTHROPIC_MODEL (opcional, default claude-sonnet-4-6)
 */

const API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-sonnet-4-6';

type ToolBlock = { type: 'tool_use'; name: string; input: any; id: string };
type TextBlock = { type: 'text'; text: string };
type ContentBlock = ToolBlock | TextBlock;

export type GenerateArgs = {
  system: string;
  /** Mensagem da utilizadora — o "brief" desta peça. */
  prompt: string;
  /** Schema JSON estrito (Anthropic tool input_schema). */
  schema: { name: string; description: string; input_schema: any };
  maxTokens?: number;
  /** Few-shot opcional (cache_control ephemeral aplicado automaticamente). */
  examples?: Array<{ role: 'user' | 'assistant'; content: string }>;
};

/**
 * Pede a Claude para preencher um JSON respeitando o schema.
 * Devolve o objecto directamente (input do tool_use block).
 */
export async function generateStructured<T = any>(args: GenerateArgs): Promise<T> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurado');
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  // System como bloco com cache_control para descontar 90% em re-runs.
  const systemBlocks: any[] = [
    {
      type: 'text',
      text: args.system,
      cache_control: { type: 'ephemeral' }
    }
  ];

  const messages: any[] = [];
  if (args.examples && args.examples.length > 0) {
    for (const e of args.examples) {
      messages.push({ role: e.role, content: e.content });
    }
  }
  messages.push({ role: 'user', content: args.prompt });

  const body = {
    model,
    max_tokens: args.maxTokens ?? 4096,
    system: systemBlocks,
    messages,
    tools: [args.schema],
    tool_choice: { type: 'tool', name: args.schema.name }
  };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Claude API ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = await res.json() as { content: ContentBlock[]; stop_reason: string };
  const toolBlock = data.content.find((c) => c.type === 'tool_use') as ToolBlock | undefined;
  if (!toolBlock) {
    const textBlock = data.content.find((c) => c.type === 'text') as TextBlock | undefined;
    throw new Error(`Claude não devolveu tool_use. Resposta: ${textBlock?.text?.slice(0, 200) ?? '(vazio)'}`);
  }
  return toolBlock.input as T;
}
