import { Router } from 'express';
import type { RouteContext } from '../types.js';
import { openTasksDb, DEFAULT_DB_PATH } from '../../tasks/store.js';
import { createTask, getTask, listTasks, updateTask, addComment, getTaskStats } from '../../tasks/service.js';
import { getActivity } from '../../tasks/activity-log.js';
import type { TaskPriority, TaskStatus } from '../../tasks/types.js';

export function createTasksRouter(ctx: RouteContext): Router {
  const router = Router();
  const dbPath = ctx.config.tasks?.dbPath ?? DEFAULT_DB_PATH;

  router.get('/', (_req, res) => {
    const db = openTasksDb(dbPath);
    const { status, assignee, priority } = _req.query as Record<string, string>;
    const tasks = listTasks(db, {
      status: status as TaskStatus | undefined,
      assigneeAgentId: assignee,
      priority: priority as TaskPriority | undefined,
    });
    res.json({ tasks });
  });

  router.get('/stats', (_req, res) => {
    const db = openTasksDb(dbPath);
    res.json({ stats: getTaskStats(db) });
  });

  router.get('/:id', (req, res) => {
    const db = openTasksDb(dbPath);
    const task = getTask(db, req.params['id']!);
    if (!task) { res.status(404).json({ error: 'Task not found' }); return; }
    res.json({ task });
  });

  router.post('/', (req, res) => {
    const db = openTasksDb(dbPath);
    const task = createTask(db, req.body as Parameters<typeof createTask>[1]);
    ctx.broadcast('task:created', { task });
    res.status(201).json({ task });
  });

  router.patch('/:id', (req, res) => {
    const db = openTasksDb(dbPath);
    try {
      const task = updateTask(db, req.params['id']!, req.body as Parameters<typeof updateTask>[2]);
      ctx.broadcast('task:updated', { task });
      res.json({ task });
    } catch (err) {
      res.status(404).json({ error: err instanceof Error ? err.message : 'Not found' });
    }
  });

  router.post('/:id/comments', (req, res) => {
    const db = openTasksDb(dbPath);
    const { content, authorId } = req.body as { content: string; authorId?: string };
    const comment = addComment(db, req.params['id']!, content, authorId ?? 'dashboard');
    ctx.broadcast('task:updated', { taskId: req.params['id'], commentAdded: true });
    res.status(201).json({ comment });
  });

  router.get('/:id/activity', (req, res) => {
    const db = openTasksDb(dbPath);
    const limit = parseInt((req.query['limit'] as string) ?? '50', 10);
    const activity = getActivity(db, req.params['id'], limit);
    res.json({ activity });
  });

  return router;
}
