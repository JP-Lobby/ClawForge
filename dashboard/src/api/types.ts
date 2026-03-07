export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'blocked' | 'done' | 'failed' | 'cancelled';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  parentId?: string | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignedAgent?: string | null;
  assigneeAgentId?: string | null;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  dueDate?: number | null;
}

export interface TaskComment {
  id: string;
  taskId: string;
  content: string;
  authorId: string;
  createdAt: number;
}

export interface ActivityEntry {
  id: string;
  taskId?: string;
  action: string;
  details?: string | null;
  actorId?: string | null;
  createdAt: number;
}

// Legacy alias
export type TaskActivityEntry = ActivityEntry;

export interface TaskStats {
  backlog: number;
  todo: number;
  in_progress: number;
  blocked: number;
  done: number;
  cancelled: number;
  // computed
  total: number;
  inProgress: number;
  completed: number;
  failed: number;
}

export interface Agent {
  name: string;
  description?: string;
  provider?: string;
  model?: string;
  instructions?: string;
  maxTurns?: number;
  tools?: string[];
  handoffTo?: string[];
  canPickTasks?: boolean;
  taskPriorities?: string[];
  budgetMonthlyCents?: number;
}

export interface MemoryStats {
  entryCount: number;
  sizeBytes: number;
  filePath: string;
}

export interface Channel {
  id: string;
  channelId: string;
  name?: string;
  mode?: string;
  enabled?: boolean;
  orchestration?: {
    agent?: string;
    entryAgent?: string;
    providers?: unknown;
    maxTurns?: number;
  };
  systemPrompt?: string;
  customPrompt?: string;
  memoryLimitKb?: number;
  maxMemoryPairs?: number;
}

export interface ResearchFile {
  filename: string;
  sizeBytes: number;
  modifiedAt: number;
}

export interface AgentSpend {
  agentName: string;
  agentId: string;
  monthlySpentCents: number;
  monthlyLimitCents: number;
  paused: boolean;
}

export interface ProviderSpend {
  provider: string;
  monthlySpentCents: number;
}

export interface BudgetData {
  agents: AgentSpend[];
  providers: ProviderSpend[];
}

export interface ProviderStatus {
  name: string;
  provider: string;
  ok: boolean;
  latencyMs?: number;
  error?: string;
}

// Legacy aliases
export type BudgetSummary = BudgetData;
export type ProviderHealth = ProviderStatus;
