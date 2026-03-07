import type Database from 'better-sqlite3';
import type { Task, CreateTaskInput } from './types.js';
import { createTask } from './service.js';
import { logSubtaskCreated } from './activity-log.js';

const DEFAULT_MAX_DEPTH = 3;

export function createSubtask(
  db: Database.Database,
  parentId: string,
  input: CreateTaskInput,
  currentDepth: number,
  maxDepth = DEFAULT_MAX_DEPTH
): Task {
  if (currentDepth >= maxDepth) {
    throw new Error(`[ClawForge] Max subtask depth (${maxDepth}) reached. Cannot create deeper subtask.`);
  }

  const task = createTask(db, { ...input, parentId });
  logSubtaskCreated(db, parentId, task.id);
  return task;
}
