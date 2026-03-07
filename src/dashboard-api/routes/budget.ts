import { Router } from 'express';
import type { RouteContext } from '../types.js';
import { openBudgetDb, getAllAgentSpends, getProviderSpends } from '../../budget/tracker.js';

export function createBudgetRouter(_ctx: RouteContext): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    try {
      const db = openBudgetDb();
      const agents = getAllAgentSpends(db);
      const providers = getProviderSpends(db);
      res.json({ agents, providers });
    } catch {
      res.json({ agents: [], providers: [] });
    }
  });

  return router;
}
