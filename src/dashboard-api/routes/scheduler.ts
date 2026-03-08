import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { RouteContext, SchedulerConfig } from '../types.js';

const CONFIG_PATH = path.join(os.homedir(), '.openclaw', 'clawforge.json');

function readFullConfig(): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function writeFullConfig(cfg: Record<string, unknown>): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
}

export function createSchedulerRouter(ctx: RouteContext): Router {
  const router = Router();

  const getSchedulerConfig = (): SchedulerConfig => {
    const auto = ctx.config.tasks?.autonomous ?? {};
    return {
      enabled: auto.enabled ?? true,
      heartbeatIntervalMs: auto.heartbeatIntervalMs ?? 30000,
      maxConcurrentTasks: auto.maxConcurrentTasks ?? 3,
      maxRequestDepth: auto.maxRequestDepth ?? 5,
    };
  };

  // GET /api/scheduler — current scheduler settings
  router.get('/', (_req, res) => {
    res.json(getSchedulerConfig());
  });

  // PUT /api/scheduler — update scheduler settings
  router.put('/', (req, res) => {
    const body = req.body as Partial<SchedulerConfig>;
    const full = readFullConfig();

    const tasks = (full['tasks'] as Record<string, unknown>) ?? {};
    const autonomous = (tasks['autonomous'] as Record<string, unknown>) ?? {};

    if (body.enabled !== undefined) autonomous['enabled'] = body.enabled;
    if (body.heartbeatIntervalMs !== undefined) autonomous['heartbeatIntervalMs'] = body.heartbeatIntervalMs;
    if (body.maxConcurrentTasks !== undefined) autonomous['maxConcurrentTasks'] = body.maxConcurrentTasks;
    if (body.maxRequestDepth !== undefined) autonomous['maxRequestDepth'] = body.maxRequestDepth;

    tasks['autonomous'] = autonomous;
    full['tasks'] = tasks;
    writeFullConfig(full);

    // Sync live config
    if (!ctx.config.tasks) ctx.config.tasks = {};
    if (!ctx.config.tasks.autonomous) ctx.config.tasks.autonomous = {};
    if (body.enabled !== undefined) ctx.config.tasks.autonomous.enabled = body.enabled;
    if (body.heartbeatIntervalMs !== undefined) ctx.config.tasks.autonomous.heartbeatIntervalMs = body.heartbeatIntervalMs;
    if (body.maxConcurrentTasks !== undefined) ctx.config.tasks.autonomous.maxConcurrentTasks = body.maxConcurrentTasks;
    if (body.maxRequestDepth !== undefined) ctx.config.tasks.autonomous.maxRequestDepth = body.maxRequestDepth;

    ctx.broadcast('config:updated', { section: 'scheduler' });
    res.json(getSchedulerConfig());
  });

  return router;
}
