import type { ProviderEntry, NormalizedMessage, NormalizedTool, Completion } from './types.js';
import { toOpenAIMessages, toOpenAITools, fromOpenAICompletion } from './normalizer.js';

const DEFAULT_URL = 'https://api.openai.com/v1/chat/completions';
const TIMEOUT_MS = 60_000;

export async function callOpenAICompat(
  entry: ProviderEntry,
  messages: NormalizedMessage[],
  tools?: NormalizedTool[]
): Promise<Completion> {
  const base = entry.baseUrl ?? DEFAULT_URL;
  const url = base.endsWith('/chat/completions') ? base : base.replace(/\/$/, '') + '/chat/completions';

  const body: Record<string, unknown> = {
    model: entry.model,
    messages: toOpenAIMessages(messages),
  };
  if (tools?.length) {
    body['tools'] = toOpenAITools(tools);
    body['tool_choice'] = 'auto';
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (entry.apiKey) headers['Authorization'] = `Bearer ${entry.apiKey}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const err = await response.text().catch(() => '');
    throw new Error(`[ClawForge] OpenAI-compat ${response.status} from ${url}: ${err}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return fromOpenAICompletion(await response.json() as any, entry.provider, entry.model);
}
