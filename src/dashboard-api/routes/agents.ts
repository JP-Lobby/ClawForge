import { Router } from 'express';
import type { RouteContext } from '../types.js';
import { listAgents, loadAgent, resolveAgentsDir } from '../../orchestration/agent.js';

export function createAgentsRouter(ctx: RouteContext): Router {
  const router = Router();

  const getAgentsDir = () => resolveAgentsDir(ctx.config.orchestration as Parameters<typeof resolveAgentsDir>[0]);

  router.get('/', (_req, res) => {
    const agents = listAgents(getAgentsDir());
    res.json({ agents });
  });

  router.get('/:name', (req, res) => {
    const agent = loadAgent(req.params['name']!, getAgentsDir());
    if (!agent) { res.status(404).json({ error: 'Agent not found' }); return; }
    res.json({ agent });
  });

  router.post('/:name/reload', (req, res) => {
    // Invalidate cache by touching the agent — loadAgent will re-read on next call
    const agent = loadAgent(req.params['name']!, getAgentsDir());
    if (!agent) { res.status(404).json({ error: 'Agent not found' }); return; }
    ctx.broadcast('agent:status_changed', { agent: req.params['name'], action: 'reload' });
    res.json({ success: true, agent });
  });

  return router;
}
