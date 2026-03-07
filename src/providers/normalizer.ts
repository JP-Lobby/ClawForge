import type { NormalizedMessage, NormalizedTool, Completion, ToolCall } from './types.js';

// ---------------------------------------------------------------------------
// Anthropic format
// ---------------------------------------------------------------------------

export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | Array<Record<string, unknown>>;
}

export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: object;
}

export function toAnthropicMessages(messages: NormalizedMessage[]): {
  system: string;
  messages: AnthropicMessage[];
} {
  const systemParts: string[] = [];
  const out: AnthropicMessage[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemParts.push(msg.content);
      continue;
    }
    if (msg.role === 'tool') {
      const block = { type: 'tool_result', tool_use_id: msg.toolCallId ?? '', content: msg.content };
      const last = out[out.length - 1];
      if (last && last.role === 'user' && Array.isArray(last.content)) {
        (last.content as Record<string, unknown>[]).push(block);
      } else {
        out.push({ role: 'user', content: [block] });
      }
      continue;
    }
    out.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
  }

  return { system: systemParts.join('\n\n'), messages: out };
}

export function toAnthropicTools(tools: NormalizedTool[]): AnthropicTool[] {
  return tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema }));
}

// ---------------------------------------------------------------------------
// OpenAI format
// ---------------------------------------------------------------------------

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  name?: string;
  tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
}

export interface OpenAITool {
  type: 'function';
  function: { name: string; description: string; parameters: object };
}

export function toOpenAIMessages(messages: NormalizedMessage[]): OpenAIMessage[] {
  return messages.map((msg) => {
    if (msg.role === 'tool') {
      return { role: 'tool' as const, content: msg.content, tool_call_id: msg.toolCallId ?? '', name: msg.toolName };
    }
    return { role: msg.role as 'system' | 'user' | 'assistant', content: msg.content };
  });
}

export function toOpenAITools(tools: NormalizedTool[]): OpenAITool[] {
  return tools.map((t) => ({ type: 'function' as const, function: { name: t.name, description: t.description, parameters: t.inputSchema } }));
}

// ---------------------------------------------------------------------------
// Completion parsers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromAnthropicCompletion(body: any, provider: string, model: string): Completion {
  const content: string = (body.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('');

  const toolCalls: ToolCall[] = (body.content ?? [])
    .filter((b: { type: string }) => b.type === 'tool_use')
    .map((b: { id: string; name: string; input: Record<string, unknown> }) => ({
      id: b.id, name: b.name, input: b.input ?? {},
    }));

  return {
    content,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    usage: body.usage ? { inputTokens: body.usage.input_tokens ?? 0, outputTokens: body.usage.output_tokens ?? 0 } : undefined,
    provider,
    model,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromOpenAICompletion(body: any, provider: string, model: string): Completion {
  const choice = body.choices?.[0];
  const message = choice?.message ?? {};
  const content: string = message.content ?? '';

  const toolCalls: ToolCall[] = (message.tool_calls ?? []).map(
    (tc: { id: string; function: { name: string; arguments: string } }) => ({
      id: tc.id,
      name: tc.function.name,
      input: (() => { try { return JSON.parse(tc.function.arguments) as Record<string, unknown>; } catch { return {}; } })(),
    })
  );

  return {
    content,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    usage: body.usage ? { inputTokens: body.usage.prompt_tokens ?? 0, outputTokens: body.usage.completion_tokens ?? 0 } : undefined,
    provider,
    model,
  };
}
