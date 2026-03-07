import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { TaskActivityEntry } from './types.js';

function rowToEntry(row: Record<string, unknown>): TaskActivityEntry {
  return {
    id: row['id'] as string,
    taskId: row['task_id'] as string,
    action: row['action'] as string,
    details: row['details'] as string | null,
    actorId: row['actor_id'] as string | null,
    createdAt: row['created_at'] as number,
  };
}

export function logActivity(
  db: Database.Database,
  taskId: string,
  action: string,
  details?: string | null,
  actorId?: string | null
): void {
  db.prepare('INSERT INTO task_activity_log (id, task_id, action, details, actor_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(randomUUID(), taskId, action, details ?? null, actorId ?? null, Date.now());
}

export function getActivity(
  db: Database.Database,
  taskId?: string,
  limit = 50
): TaskActivityEntry[] {
  if (taskId) {
    return (db.prepare('SELECT * FROM task_activity_log WHERE task_id = ? ORDER BY created_at DESC LIMIT ?').all(taskId, limit) as Record<string, unknown>[]).map(rowToEntry);
  }
  return (db.prepare('SELECT * FROM task_activity_log ORDER BY created_at DESC LIMIT ?').all(limit) as Record<string, unknown>[]).map(rowToEntry);
}

export function logTaskStarted(db: Database.Database, taskId: string, agentId: string, runId: string): void {
  logActivity(db, taskId, 'started', `Agent ${agentId} started (run: ${runId})`, agentId);
}

export function logTaskCompleted(db: Database.Database, taskId: string, agentId: string, summary?: string): void {
  logActivity(db, taskId, 'completed', summary ?? 'Task completed', agentId);
}

export function logTaskBlocked(db: Database.Database, taskId: string, agentId: string, reason?: string): void {
  logActivity(db, taskId, 'blocked', reason ?? 'Task blocked', agentId);
}

export function logSubtaskCreated(db: Database.Database, parentId: string, childId: string, agentId?: string): void {
  logActivity(db, parentId, 'subtask_created', `Subtask created: ${childId}`, agentId ?? null);
}
