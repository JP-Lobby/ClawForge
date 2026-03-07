export interface NormalizedMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolName?: string;
}

export interface NormalizedTool {
  name: string;
  description: string;
  inputSchema: object;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface Completion {
  content: string;
  toolCalls?: ToolCall[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  provider: string;
  model: string;
}

export interface ProviderEntry {
  provider: string;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  fallback?: string;
}
