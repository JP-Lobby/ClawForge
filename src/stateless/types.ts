export type ChannelMode = 'stateless' | 'standard';

export interface OrchestrationConfig {
  agent: string;
  maxTurns?: number;
  context?: Record<string, unknown>;
}

export interface StatelessChannelConfig {
  channelId: string;
  mode: ChannelMode;
  enabled: boolean;
  memoryFile: string;
  historyOnCommand: boolean;
  maxMemoryPairs: number;
  customPrompt?: string;
  provider?: string;
  model?: string;
  orchestration?: OrchestrationConfig;
}

export interface StatelessRegistry {
  channels: Record<string, { config: string; enabled: boolean }>;
}

export type CommandType =
  | 'remember'
  | 'forget'
  | 'forget_keyword'
  | 'memory_n'
  | 'status'
  | 'mode'
  | 'unknown';

export interface CommandParseResult {
  type: CommandType;
  isCommand: boolean;
  isTerminal: boolean;
  text?: string;
  keyword?: string;
  n?: number;
  raw: string;
}

export interface MemoryEntry {
  content: string;
  timestamp: string;
  source?: string;
}
