import type { ProviderEntry, NormalizedMessage, NormalizedTool, Completion } from './types.js';
import { toOpenAIMessages, toOpenAITools, fromOpenAICompletion } from './normalizer.js';

const DEFAULT_BASE = 'http://localhost:11434';
const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes for large models on Pi

export async function callOllama(
  entry: ProviderEntry,
  messages: NormalizedMessage[],
  tools?: NormalizedTool[]
): Promise<Completion> {
  const base = (entry.baseUrl ?? DEFAULT_BASE).replace(/\/$/, '');
  const url = `${base}/api/chat`;

  const body: Record<string, unknown> = {
    model: entry.model,
    messages: toOpenAIMessages(messages),
    stream: false,
  };
  if (tools?.length) body['tools'] = toOpenAITools(tools);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal });
  } finally { clearTimeout(timeout); }

  if (!response.ok) { const err = await response.text().catch(() => ''); throw new Error(`[ClawForge] Ollama ${response.status}: ${err}`); }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rb = await response.json() as any;
  const openAILike = {
    choices: [{ message: rb.message ?? { role: 'assistant', content: '' } }],
    usage: rb.prompt_eval_count != null ? { prompt_tokens: rb.prompt_eval_count, completion_tokens: rb.eval_count ?? 0 } : undefined,
  };

  return fromOpenAICompletion(openAILike, 'ollama', entry.model);
}
