import { Router } from 'express';
import type { RouteContext } from '../types.js';
import { openTasksDb, DEFAULT_DB_PATH } from '../../tasks/store.js';
import { getActivity } from '../../tasks/activity-log.js';

export function createActivityRouter(ctx: RouteContext): Router {
  const router = Router();
  const dbPath = ctx.config.tasks?.dbPath ?? DEFAULT_DB_PATH;

  router.get('/', (req, res) => {
    const db = openTasksDb(dbPath);
    const limit = parseInt((req.query['limit'] as string) ?? '50', 10);
    const taskId = req.query['taskId'] as string | undefined;
    const activity = getActivity(db, taskId, limit);
    res.json({ activity });
  });

  return router;
}
