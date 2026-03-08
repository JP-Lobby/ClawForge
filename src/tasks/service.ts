import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { Task, TaskStatus, TaskPriority, TaskComment, CreateTaskInput, UpdateTaskInput } from './types.js';
import { logActivity } from './activity-log.js';

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row['id'] as string,
    parentId: row['parent_id'] as string | null,
    title: row['title'] as string,
    description: row['description'] as string | null,
    status: row['status'] as TaskStatus,
    priority: row['priority'] as TaskPriority,
    assigneeAgentId: row['assignee_agent_id'] as string | null,
    checkoutRunId: row['checkout_run_id'] as string | null,
    lockedAt: row['locked_at'] as number | null,
    createdAt: row['created_at'] as number,
    updatedAt: row['updated_at'] as number,
    dueDate: row['due_date'] as number | null,
  };
}

export function createTask(db: Database.Database, input: CreateTaskInput): Task {
  const id = randomUUID();
  const now = Date.now();
  db.prepare(`
    INSERT INTO tasks (id, parent_id, title, description, status, priority, assignee_agent_id, created_at, updated_at, due_date)
    VALUES (?, ?, ?, ?, 'backlog', ?, ?, ?, ?, ?)
  `).run(id, input.parentId ?? null, input.title, input.description ?? null, input.priority ?? 'medium', input.assigneeAgentId ?? null, now, now, input.dueDate ?? null);

  logActivity(db, id, 'created', `Task created: "${input.title}"`);
  return getTask(db, id)!;
}

export function getTask(db: Database.Database, id: string): Task | null {
  const row = db.prepare('SELECT * FROM tasks WHERE id = ? OR id LIKE ?').get(id, `${id}%`) as Record<string, unknown> | undefined;
  return row ? rowToTask(row) : null;
}

export function updateTask(db: Database.Database, id: string, input: UpdateTaskInput): Task {
  const task = getTask(db, id);
  if (!task) throw new Error(`Task not found: ${id}`);

  const now = Date.now();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.title !== undefined) { fields.push('title = ?'); values.push(input.title); }
  if (input.description !== undefined) { fields.push('description = ?'); values.push(input.description); }
  if (input.status !== undefined) { fields.push('status = ?'); values.push(input.status); }
  if (input.priority !== undefined) { fields.push('priority = ?'); values.push(input.priority); }
  if (input.assigneeAgentId !== undefined) { fields.push('assignee_agent_id = ?'); values.push(input.assigneeAgentId); }
  if (input.dueDate !== undefined) { fields.push('due_date = ?'); values.push(input.dueDate); }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(task.id);

  db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  if (input.status && input.status !== task.status) {
    logActivity(db, task.id, 'status_changed', `Status: ${task.status} → ${input.status}`);
  }

  return getTask(db, task.id)!;
}

export function atomicCheckout(db: Database.Database, taskId: string, runId: string, agentId: string): Task | null {
  const now = Date.now();
  const result = db.prepare(`
    UPDATE tasks SET status = 'in_progress', checkout_run_id = ?, locked_at = ?, assignee_agent_id = ?, updated_at = ?
    WHERE (id = ? OR id LIKE ?) AND status = 'todo' AND checkout_run_id IS NULL
  `).run(runId, now, agentId, now, taskId, `${taskId}%`);

  if (result.changes === 0) return null;
  const task = getTask(db, taskId);
  if (task) logActivity(db, task.id, 'checkout', `Checked out by ${agentId} (run: ${runId})`);
  return task;
}

export function releaseCheckout(db: Database.Database, taskId: string, status: 'done' | 'blocked', summary?: string): void {
  const now = Date.now();
  db.prepare(`
    UPDATE tasks SET status = ?, checkout_run_id = NULL, locked_at = NULL, updated_at = ?
    WHERE id = ? OR id LIKE ?
  `).run(status, now, taskId, `${taskId}%`);

  const task = getTask(db, taskId);
  if (task) logActivity(db, task.id, status === 'done' ? 'completed' : 'blocked', summary ?? null);
}

export function addComment(db: Database.Database, taskId: string, content: string, authorId: string): TaskComment {
  const id = randomUUID();
  const now = Date.now();
  const task = getTask(db, taskId);
  const resolvedId = task?.id ?? taskId;

  db.prepare('INSERT INTO task_comments (id, task_id, content, author_id, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, resolvedId, content, authorId, now);

  return { id, taskId: resolvedId, content, authorId, createdAt: now };
}

export function listTasks(
  db: Database.Database,
  filters?: { status?: TaskStatus; assigneeAgentId?: string; priority?: TaskPriority }
): Task[] {
  let query = 'SELECT * FROM tasks WHERE 1=1';
  const params: unknown[] = [];

  if (filters?.status) { query += ' AND status = ?'; params.push(filters.status); }
  if (filters?.assigneeAgentId) { query += ' AND assignee_agent_id = ?'; params.push(filters.assigneeAgentId); }
  if (filters?.priority) { query += ' AND priority = ?'; params.push(filters.priority); }

  query += ' ORDER BY CASE priority WHEN \'critical\' THEN 0 WHEN \'high\' THEN 1 WHEN \'medium\' THEN 2 WHEN \'low\' THEN 3 END, created_at ASC';

  return (db.prepare(query).all(...params) as Record<string, unknown>[]).map(rowToTask);
}

export function pickNextTask(
  db: Database.Database,
  agentId?: string,
  priorities?: TaskPriority[]
): Task | null {
  let query = `SELECT * FROM tasks WHERE status = 'todo' AND checkout_run_id IS NULL`;
  const params: unknown[] = [];

  if (agentId) {
    query += ' AND (assignee_agent_id = ? OR assignee_agent_id IS NULL)';
    params.push(agentId);
  }

  if (priorities?.length) {
    const placeholders = priorities.map(() => '?').join(', ');
    query += ` AND priority IN (${placeholders})`;
    params.push(...priorities);
  }

  query += ' ORDER BY CASE priority WHEN \'critical\' THEN 0 WHEN \'high\' THEN 1 WHEN \'medium\' THEN 2 WHEN \'low\' THEN 3 END, created_at ASC LIMIT 1';

  const row = db.prepare(query).get(...params) as Record<string, unknown> | undefined;
  return row ? rowToTask(row) : null;
}

export function getTaskStats(db: Database.Database): Record<TaskStatus, number> {
  const rows = db.prepare('SELECT status, COUNT(*) as count FROM tasks GROUP BY status').all() as Array<{ status: string; count: number }>;
  const stats: Record<string, number> = { backlog: 0, todo: 0, in_progress: 0, blocked: 0, done: 0, cancelled: 0 };
  for (const row of rows) stats[row.status] = row.count;
  return stats as Record<TaskStatus, number>;
}

export function resetStaleTasks(db: Database.Database, thresholdMs = 30 * 60 * 1000): number {
  const cutoff = Date.now() - thresholdMs;
  const result = db.prepare(`
    UPDATE tasks SET status = 'todo', checkout_run_id = NULL, locked_at = NULL, updated_at = ?
    WHERE status = 'in_progress' AND locked_at IS NOT NULL AND locked_at < ?
  `).run(Date.now(), cutoff);
  return result.changes;
}

export function deleteTask(db: Database.Database, id: string): boolean {
  const task = getTask(db, id);
  if (!task) return false;
  db.prepare('DELETE FROM task_comments WHERE task_id = ?').run(task.id);
  db.prepare('DELETE FROM task_activity WHERE task_id = ?').run(task.id);
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(task.id);
  return result.changes > 0;
}

export function promoteBacklogTasks(db: Database.Database): number {
  const now = Date.now();
  const result = db.prepare(`
    UPDATE tasks SET status = 'todo', updated_at = ?
    WHERE status = 'backlog' AND (due_date IS NULL OR due_date <= ?)
  `).run(now, now);
  return result.changes;
}
