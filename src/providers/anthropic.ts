import type { ProviderEntry, NormalizedMessage, NormalizedTool, Completion } from './types.js';
import { toAnthropicMessages, toAnthropicTools, fromAnthropicCompletion } from './normalizer.js';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const TIMEOUT_MS = 60_000;

export async function callAnthropic(
  entry: ProviderEntry,
  messages: NormalizedMessage[],
  tools?: NormalizedTool[]
): Promise<Completion> {
  if (!entry.apiKey) throw new Error('[ClawForge] Anthropic: apiKey is required');

  const { system, messages: anthropicMessages } = toAnthropicMessages(messages);
  const anthropicTools = tools?.length ? toAnthropicTools(tools) : undefined;

  const body: Record<string, unknown> = {
    model: entry.model,
    max_tokens: 4096,
    messages: anthropicMessages,
  };
  if (system) body['system'] = system;
  if (anthropicTools) body['tools'] = anthropicTools;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': entry.apiKey, 'anthropic-version': ANTHROPIC_VERSION },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const err = await response.text().catch(() => '');
    throw new Error(`[ClawForge] Anthropic ${response.status}: ${err}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return fromAnthropicCompletion(await response.json() as any, 'anthropic', entry.model);
}
