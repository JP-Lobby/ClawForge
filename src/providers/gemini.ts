import type { ProviderEntry, NormalizedMessage, NormalizedTool, Completion, ToolCall } from './types.js';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const TIMEOUT_MS = 60_000;

export async function callGemini(
  entry: ProviderEntry,
  messages: NormalizedMessage[],
  tools?: NormalizedTool[]
): Promise<Completion> {
  if (!entry.apiKey) throw new Error('[ClawForge] Gemini: apiKey is required');

  let system: string | undefined;
  const contents: Array<{ role: 'user' | 'model'; parts: Array<Record<string, unknown>> }> = [];

  for (const msg of messages) {
    if (msg.role === 'system') { system = msg.content; continue; }
    if (msg.role === 'tool') {
      const part = { functionResponse: { name: msg.toolName ?? 'unknown', response: { content: msg.content } } };
      const last = contents[contents.length - 1];
      if (last?.role === 'user') { last.parts.push(part); } else { contents.push({ role: 'user', parts: [part] }); }
      continue;
    }
    contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] });
  }

  const body: Record<string, unknown> = { contents };
  if (system) body['system_instruction'] = { parts: [{ text: system }] };
  if (tools?.length) {
    body['tools'] = [{ function_declarations: tools.map((t) => ({ name: t.name, description: t.description, parameters: t.inputSchema })) }];
  }

  const url = `${GEMINI_BASE}/${entry.model}:generateContent?key=${entry.apiKey}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal });
  } finally { clearTimeout(timeout); }

  if (!response.ok) { const err = await response.text().catch(() => ''); throw new Error(`[ClawForge] Gemini ${response.status}: ${err}`); }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rb = await response.json() as any;
  const parts = rb.candidates?.[0]?.content?.parts ?? [];
  const textContent = parts.filter((p: { text?: string }) => p.text !== undefined).map((p: { text: string }) => p.text).join('');
  const toolCalls: ToolCall[] = parts
    .filter((p: { functionCall?: { name: string; args: Record<string, unknown> } }) => p.functionCall !== undefined)
    .map((p: { functionCall: { name: string; args: Record<string, unknown> } }, idx: number) => ({
      id: `gemini-tc-${idx}`, name: p.functionCall.name, input: p.functionCall.args ?? {},
    }));

  return {
    content: textContent,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    usage: rb.usageMetadata ? { inputTokens: rb.usageMetadata.promptTokenCount ?? 0, outputTokens: rb.usageMetadata.candidatesTokenCount ?? 0 } : undefined,
    provider: 'gemini',
    model: entry.model,
  };
}
