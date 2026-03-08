export interface DashboardConfig {
  enabled?: boolean;
  port?: number;
  host?: string;
  authToken?: string;
  cors?: boolean;
  corsOrigin?: string;
  orchestratorChannelId?: string;
}

export interface Note {
  id: string;
  content: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SchedulerConfig {
  enabled: boolean;
  heartbeatIntervalMs: number;
  maxConcurrentTasks: number;
  maxRequestDepth: number;
}

export interface WeeklyReport {
  period: string;
  periodStart: number;
  periodEnd: number;
  tasksCreated: number;
  tasksCompleted: number;
  tasksByStatus: Record<string, number>;
  tasksByAgent: Record<string, number>;
  activityCount: number;
  topAgents: { agent: string; count: number }[];
}

export interface DashboardEvent {
  event: string;
  data: unknown;
  timestamp: number;
}

export type BroadcastFn = (event: string, data: unknown) => void;

export interface RouteContext {
  config: ClawForgeConfig;
  broadcast: BroadcastFn;
}

export interface ClawForgeConfig {
  orchestration?: {
    enabled?: boolean;
    agentsDir?: string;
    providers?: Record<string, { apiKey?: string; baseUrl?: string; defaultModel?: string; fallback?: string }>;
  };
  tasks?: { enabled?: boolean; dbPath?: string; autonomous?: { enabled?: boolean; heartbeatIntervalMs?: number; maxConcurrentTasks?: number; maxRequestDepth?: number } };
  dashboard?: DashboardConfig;
}

export interface DashboardServer {
  close(): Promise<void>;
}
