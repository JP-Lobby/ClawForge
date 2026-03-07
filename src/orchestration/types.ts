export interface ClawAgent {
  name: string;
  description: string;
  provider: string;
  model: string;
  instructions: string;
  maxTurns: number;
  tools: string[];
  handoffTo?: string[];
  canPickTasks?: boolean;
  taskPriorities?: string[];
  budgetMonthlyCents?: number;
}

export interface AgentContext {
  channelId?: string;
  senderName?: string;
  userId?: string;
  [key: string]: unknown;
}

export interface AgentResponse {
  content: string;
  contextUpdates?: Record<string, unknown>;
}

export interface RunMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolName?: string;
}

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  fallback?: string;
}

export interface OrchestraConfig {
  enabled: boolean;
  agentsDir: string;
  providers: Record<string, ProviderConfig>;
}
