export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled' | 'archive';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  parentId?: string | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeAgentId?: string | null;
  checkoutRunId?: string | null;
  lockedAt?: number | null;
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

export interface TaskActivityEntry {
  id: string;
  taskId: string;
  action: string;
  details?: string | null;
  actorId?: string | null;
  createdAt: number;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  assigneeAgentId?: string;
  dueDate?: number;
  parentId?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeAgentId?: string | null;
  dueDate?: number | null;
}

export interface TasksConfig {
  enabled?: boolean;
  dbPath?: string;
  autonomous?: {
    enabled?: boolean;
    heartbeatIntervalMs?: number;
    maxConcurrentTasks?: number;
    maxRequestDepth?: number;
  };
}
