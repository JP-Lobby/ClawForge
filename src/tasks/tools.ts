import type { AnyAgentTool } from '../orchestration/handoff.js';
import type { TaskPriority, TasksConfig } from './types.js';
import { openTasksDb, DEFAULT_DB_PATH } from './store.js';
import { createTask, getTask, listTasks, updateTask, releaseCheckout } from './service.js';
import { createSubtask } from './decomposer.js';

export function createTaskTools(opts: { agentId: string; config?: TasksConfig }): AnyAgentTool[] {
  const dbPath = opts.config?.dbPath ?? DEFAULT_DB_PATH;

  const create_task: AnyAgentTool = {
    name: 'create_task',
    description: 'Create a new task in the backlog.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title' },
        description: { type: 'string', description: 'Optional detailed description' },
        priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'], description: 'Task priority' },
      },
      required: ['title'],
    },
    execute: async (input) => {
      const db = openTasksDb(dbPath);
      const task = createTask(db, {
        title: input['title'] as string,
        description: input['description'] as string | undefined,
        priority: (input['priority'] as TaskPriority) ?? 'medium',
        assigneeAgentId: opts.agentId,
      });
      return JSON.stringify({ success: true, task });
    },
  };

  const create_subtask: AnyAgentTool = {
    name: 'create_subtask',
    description: 'Create a subtask linked to a parent task.',
    inputSchema: {
      type: 'object',
      properties: {
        parentId: { type: 'string', description: 'Parent task ID' },
        title: { type: 'string', description: 'Subtask title' },
        priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
        currentDepth: { type: 'number', description: 'Current nesting depth (starts at 0)' },
      },
      required: ['parentId', 'title'],
    },
    execute: async (input) => {
      const db = openTasksDb(dbPath);
      const maxDepth = opts.config?.autonomous?.maxRequestDepth ?? 3;
      const task = createSubtask(db, input['parentId'] as string, {
        title: input['title'] as string,
        priority: (input['priority'] as TaskPriority) ?? 'medium',
        assigneeAgentId: opts.agentId,
      }, (input['currentDepth'] as number) ?? 0, maxDepth);
      return JSON.stringify({ success: true, task });
    },
  };

  const complete_task: AnyAgentTool = {
    name: 'complete_task',
    description: 'Mark a task as done with an optional summary.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID to mark as done' },
        summary: { type: 'string', description: 'Summary of what was accomplished' },
      },
      required: ['taskId'],
    },
    execute: async (input) => {
      const db = openTasksDb(dbPath);
      releaseCheckout(db, input['taskId'] as string, 'done', input['summary'] as string | undefined);
      return JSON.stringify({ success: true });
    },
  };

  const list_my_tasks: AnyAgentTool = {
    name: 'list_my_tasks',
    description: 'List tasks assigned to this agent and unassigned tasks.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['backlog', 'todo', 'in_progress', 'blocked', 'done', 'cancelled'] },
      },
      required: [],
    },
    execute: async (input) => {
      const db = openTasksDb(dbPath);
      const assigned = listTasks(db, { assigneeAgentId: opts.agentId, status: input['status'] as TaskPriority | undefined });
      const unassigned = listTasks(db, { status: (input['status'] as TaskPriority) ?? 'todo' }).filter((t) => !t.assigneeAgentId);
      return JSON.stringify({ assigned, unassigned });
    },
  };

  const update_task_status: AnyAgentTool = {
    name: 'update_task_status',
    description: 'Update the status, priority, or assignee of a task.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        status: { type: 'string', enum: ['backlog', 'todo', 'in_progress', 'blocked', 'done', 'cancelled'] },
        priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
        assigneeAgentId: { type: 'string' },
      },
      required: ['taskId'],
    },
    execute: async (input) => {
      const db = openTasksDb(dbPath);
      const task = updateTask(db, input['taskId'] as string, {
        status: input['status'] as TaskPriority | undefined,
        priority: input['priority'] as TaskPriority | undefined,
        assigneeAgentId: input['assigneeAgentId'] as string | undefined,
      });
      return JSON.stringify({ success: true, task });
    },
  };

  return [create_task, create_subtask, complete_task, list_my_tasks, update_task_status];
}
