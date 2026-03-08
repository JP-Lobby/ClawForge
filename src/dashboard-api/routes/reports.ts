import { Router } from 'express';
import type { RouteContext, WeeklyReport } from '../types.js';
import { openTasksDb, DEFAULT_DB_PATH } from '../../tasks/store.js';

export function createReportsRouter(ctx: RouteContext): Router {
  const router = Router();
  const dbPath = ctx.config.tasks?.dbPath ?? DEFAULT_DB_PATH;
  const db = openTasksDb(dbPath);

  // GET /api/reports/weekly — weekly summary
  router.get('/weekly', (_req, res) => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Tasks created in the last 7 days
    const tasksCreated = (db.prepare(
      'SELECT COUNT(*) as count FROM tasks WHERE created_at >= ?'
    ).get(weekAgo) as { count: number }).count;

    // Tasks completed (status = done) in last 7 days
    const tasksCompleted = (db.prepare(
      "SELECT COUNT(*) as count FROM tasks WHERE status = 'done' AND updated_at >= ?"
    ).get(weekAgo) as { count: number }).count;

    // Tasks by status (all active tasks)
    const statusRows = db.prepare(
      'SELECT status, COUNT(*) as count FROM tasks GROUP BY status'
    ).all() as { status: string; count: number }[];
    const tasksByStatus: Record<string, number> = {};
    for (const row of statusRows) tasksByStatus[row.status] = row.count;

    // Tasks by agent in last 7 days
    const agentRows = db.prepare(
      'SELECT assignee_agent_id, COUNT(*) as count FROM tasks WHERE assignee_agent_id IS NOT NULL AND updated_at >= ? GROUP BY assignee_agent_id'
    ).all(weekAgo) as { assignee_agent_id: string; count: number }[];
    const tasksByAgent: Record<string, number> = {};
    for (const row of agentRows) tasksByAgent[row.assignee_agent_id] = row.count;

    // Activity count in last 7 days
    const activityCount = (db.prepare(
      'SELECT COUNT(*) as count FROM task_activity_log WHERE created_at >= ?'
    ).get(weekAgo) as { count: number }).count;

    // Top agents by activity
    const topAgentRows = db.prepare(
      'SELECT actor_id, COUNT(*) as count FROM task_activity_log WHERE actor_id IS NOT NULL AND created_at >= ? GROUP BY actor_id ORDER BY count DESC LIMIT 5'
    ).all(weekAgo) as { actor_id: string; count: number }[];
    const topAgents = topAgentRows.map((r) => ({ agent: r.actor_id, count: r.count }));

    const report: WeeklyReport = {
      period: 'Last 7 days',
      periodStart: weekAgo,
      periodEnd: now,
      tasksCreated,
      tasksCompleted,
      tasksByStatus,
      tasksByAgent,
      activityCount,
      topAgents,
    };

    res.json(report);
  });

  return router;
}
