/**
 * SyncHim · cliente Claude API via SDK oficial (@anthropic-ai/sdk).
 *
 * Padrão escola-veus: SDK lida com auth, retries, timeouts, streaming.
 * Tool calling com tool_choice forçado para JSON estrito.
 *
 * Env: ANTHROPIC_API_KEY
 */

import Anthropic from '@anthropic-ai/sdk';

const DEFAULT_MODEL = 'claude-sonnet-4-6';

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurado');
  _client = new Anthropic({ apiKey });
  return _client;
}

export type GenerateArgs = {
  system: string;
  prompt: string;
  schema: { name: string; description?: string; input_schema: Record<string, unknown> };
  maxTokens?: number;
};

/**
 * Pede a Claude para preencher um JSON via tool_use forçado.
 * System prompt com cache_control ephemeral (90% desconto em re-runs).
 */
export async function generateStructured<T = any>(args: GenerateArgs): Promise<T> {
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  const response = await client().messages.create({
    model,
    max_tokens: args.maxTokens ?? 8192,
    system: [
      {
        type: 'text' as const,
        text: args.system,
        cache_control: { type: 'ephemeral' as const }
      }
    ],
    messages: [{ role: 'user' as const, content: args.prompt }],
    tools: [
      {
        name: args.schema.name,
        description: args.schema.description ?? '',
        input_schema: args.schema.input_schema as Anthropic.Tool.InputSchema
      }
    ],
    tool_choice: { type: 'tool' as const, name: args.schema.name }
  });

  const toolBlock = response.content.find(
    (c): c is Anthropic.ToolUseBlock => c.type === 'tool_use'
  );
  if (!toolBlock) {
    const textBlock = response.content.find(
      (c): c is Anthropic.TextBlock => c.type === 'text'
    );
    throw new Error(
      `Claude não devolveu tool_use. stop_reason=${response.stop_reason}. ` +
      `Texto: ${textBlock?.text?.slice(0, 200) ?? '(vazio)'}`
    );
  }

  return toolBlock.input as T;
}
