import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import type { RouteContext } from '../types.js';
import { listAgents, loadAgent, resolveAgentsDir } from '../../orchestration/agent.js';
import type { ClawAgent } from '../../orchestration/types.js';

export function createAgentsRouter(ctx: RouteContext): Router {
  const router = Router();

  const getAgentsDir = () => resolveAgentsDir(ctx.config.orchestration as Parameters<typeof resolveAgentsDir>[0]);

  router.get('/', (_req, res) => {
    const agents = listAgents(getAgentsDir());
    res.json({ agents });
  });

  router.get('/:name', (req, res) => {
    const name = req.params['name']!;
    if (name === 'reload') { res.status(400).json({ error: 'Invalid agent name' }); return; }
    const agent = loadAgent(name, getAgentsDir());
    if (!agent) { res.status(404).json({ error: 'Agent not found' }); return; }
    res.json({ agent });
  });

  // POST /api/agents — create new agent YAML
  router.post('/', (req, res) => {
    const body = req.body as Partial<ClawAgent>;
    if (!body.name || typeof body.name !== 'string') {
      res.status(400).json({ error: 'name is required' }); return;
    }
    const agentsDir = getAgentsDir();
    try { fs.mkdirSync(agentsDir, { recursive: true }); } catch { /* exists */ }
    const filePath = path.join(agentsDir, `${body.name}.yaml`);
    if (fs.existsSync(filePath)) {
      res.status(409).json({ error: `Agent "${body.name}" already exists. Use PUT to update.` }); return;
    }
    const agentData: Partial<ClawAgent> = {
      name: body.name,
      description: body.description ?? '',
      provider: body.provider ?? 'anthropic',
      model: body.model ?? 'claude-haiku-4-5-20251001',
      instructions: body.instructions ?? '',
      maxTurns: body.maxTurns ?? 20,
      tools: body.tools ?? [],
      ...(body.handoffTo ? { handoffTo: body.handoffTo } : {}),
      ...(body.canPickTasks !== undefined ? { canPickTasks: body.canPickTasks } : {}),
      ...(body.taskPriorities ? { taskPriorities: body.taskPriorities } : {}),
    };
    fs.writeFileSync(filePath, yaml.dump(agentData), 'utf-8');
    ctx.broadcast('agent:created', { agent: body.name });
    res.status(201).json({ agent: agentData });
  });

  // PUT /api/agents/:name — overwrite agent YAML
  router.put('/:name', (req, res) => {
    const name = req.params['name']!;
    const body = req.body as Partial<ClawAgent>;
    const agentsDir = getAgentsDir();
    const filePath = path.join(agentsDir, `${name}.yaml`);
    const agentData: Partial<ClawAgent> = {
      name: body.name ?? name,
      description: body.description ?? '',
      provider: body.provider ?? 'anthropic',
      model: body.model ?? 'claude-haiku-4-5-20251001',
      instructions: body.instructions ?? '',
      maxTurns: body.maxTurns ?? 20,
      tools: body.tools ?? [],
      ...(body.handoffTo ? { handoffTo: body.handoffTo } : {}),
      ...(body.canPickTasks !== undefined ? { canPickTasks: body.canPickTasks } : {}),
      ...(body.taskPriorities ? { taskPriorities: body.taskPriorities } : {}),
    };
    try { fs.mkdirSync(agentsDir, { recursive: true }); } catch { /* exists */ }
    fs.writeFileSync(filePath, yaml.dump(agentData), 'utf-8');
    ctx.broadcast('agent:updated', { agent: name });
    res.json({ agent: agentData });
  });

  // DELETE /api/agents/:name — remove agent YAML
  router.delete('/:name', (req, res) => {
    const name = req.params['name']!;
    const filePath = path.join(getAgentsDir(), `${name}.yaml`);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Agent not found' }); return;
    }
    fs.unlinkSync(filePath);
    ctx.broadcast('agent:deleted', { agent: name });
    res.status(204).send();
  });

  router.post('/:name/reload', (req, res) => {
    const agent = loadAgent(req.params['name']!, getAgentsDir());
    if (!agent) { res.status(404).json({ error: 'Agent not found' }); return; }
    ctx.broadcast('agent:status_changed', { agent: req.params['name'], action: 'reload' });
    res.json({ success: true, agent });
  });

  return router;
}
