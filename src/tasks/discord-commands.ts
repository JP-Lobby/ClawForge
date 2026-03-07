import type Database from 'better-sqlite3';
import { createTask, getTask, listTasks, updateTask, getTaskStats } from './service.js';
import type { TaskPriority, TaskStatus } from './types.js';

function shortId(id: string): string {
  return id.slice(0, 8);
}

function formatTask(task: { id: string; title: string; status: string; priority: string; assigneeAgentId?: string | null }): string {
  return `[${shortId(task.id)}] **${task.title}** (${task.status}, ${task.priority}${task.assigneeAgentId ? `, ${task.assigneeAgentId}` : ''})`;
}

export function executeTaskCommand(text: string, db: Database.Database): string | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('/task')) return null;

  const parts = trimmed.replace(/^\/task\s*/, '').trim().split(/\s+/);
  const subCmd = parts[0]?.toLowerCase();

  switch (subCmd) {
    case 'create': {
      const rest = parts.slice(1).join(' ');
      const priorityMatch = rest.match(/--priority\s+(\w+)/i);
      const priority = (priorityMatch?.[1]?.toLowerCase() as TaskPriority) ?? 'medium';
      const title = rest.replace(/--priority\s+\w+/i, '').trim();
      if (!title) return '❌ Usage: `/task create <title> [--priority high]`';
      const task = createTask(db, { title, priority });
      return `✅ Task created: ${formatTask(task)}`;
    }

    case 'list': {
      const showAll = parts.includes('--all');
      const statuses: TaskStatus[] = showAll ? ['todo', 'in_progress', 'blocked', 'backlog'] : ['todo', 'in_progress'];
      const tasks = statuses.flatMap((s) => listTasks(db, { status: s }));
      if (!tasks.length) return 'No tasks found.';
      return tasks.map(formatTask).join('\n');
    }

    case 'done': {
      const id = parts[1];
      if (!id) return '❌ Usage: `/task done <id>`';
      const task = getTask(db, id);
      if (!task) return `❌ Task not found: ${id}`;
      updateTask(db, task.id, { status: 'done' });
      return `✅ Task marked done: ${formatTask(task)}`;
    }

    case 'promote': {
      const id = parts[1];
      if (!id) return '❌ Usage: `/task promote <id>`';
      const task = getTask(db, id);
      if (!task) return `❌ Task not found: ${id}`;
      updateTask(db, task.id, { status: 'todo' });
      return `✅ Task promoted to todo: ${formatTask(task)}`;
    }

    case 'assign': {
      const id = parts[1];
      const agentId = parts[2];
      if (!id || !agentId) return '❌ Usage: `/task assign <id> <agentId>`';
      const task = getTask(db, id);
      if (!task) return `❌ Task not found: ${id}`;
      updateTask(db, task.id, { assigneeAgentId: agentId });
      return `✅ Task assigned to ${agentId}: ${formatTask(task)}`;
    }

    case 'status': {
      const id = parts[1];
      if (!id) return '❌ Usage: `/task status <id>`';
      const task = getTask(db, id);
      if (!task) return `❌ Task not found: ${id}`;
      return [
        `**Task: ${task.title}**`,
        `ID: ${shortId(task.id)}`,
        `Status: ${task.status}`,
        `Priority: ${task.priority}`,
        task.assigneeAgentId ? `Assignee: ${task.assigneeAgentId}` : 'Assignee: unassigned',
        `Created: ${new Date(task.createdAt).toLocaleString()}`,
        task.description ? `\nDescription: ${task.description}` : '',
      ].filter(Boolean).join('\n');
    }

    case 'stats': {
      const stats = getTaskStats(db);
      return [
        '**Task Stats**',
        ...Object.entries(stats).filter(([, count]) => count > 0).map(([status, count]) => `${status}: ${count}`),
      ].join('\n');
    }

    case 'help':
    default: {
      return [
        '**ClawForge Task Commands**',
        '`/task create <title> [--priority critical|high|medium|low]` — Create task',
        '`/task list [--all]` — List tasks',
        '`/task promote <id>` — Move backlog → todo',
        '`/task done <id>` — Mark task done',
        '`/task assign <id> <agentId>` — Assign to agent',
        '`/task status <id>` — Show task detail',
        '`/task stats` — Task counts by status',
      ].join('\n');
    }
  }
}
