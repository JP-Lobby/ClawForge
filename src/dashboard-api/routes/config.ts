import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { RouteContext, ClawForgeConfig } from '../types.js';

const CONFIG_PATH = path.join(os.homedir(), '.openclaw', 'clawforge.json');

function readFullConfig(): Record<string, unknown> {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function writeFullConfig(cfg: Record<string, unknown>): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
}

export function createConfigRouter(ctx: RouteContext): Router {
  const router = Router();

  // GET /api/config — return ClawForge sections only
  router.get('/', (_req, res) => {
    const full = readFullConfig();
    res.json({
      orchestration: full['orchestration'] ?? {},
      tasks: full['tasks'] ?? {},
      dashboard: full['dashboard'] ?? {},
    });
  });

  // PUT /api/config — merge ClawForge sections and write back
  router.put('/', (req, res) => {
    const body = req.body as Partial<ClawForgeConfig>;
    const full = readFullConfig();

    if (body.orchestration !== undefined) {
      full['orchestration'] = { ...(full['orchestration'] as object ?? {}), ...body.orchestration };
    }
    if (body.tasks !== undefined) {
      full['tasks'] = { ...(full['tasks'] as object ?? {}), ...body.tasks };
    }
    if (body.dashboard !== undefined) {
      full['dashboard'] = { ...(full['dashboard'] as object ?? {}), ...body.dashboard };
      // Sync live config too
      Object.assign(ctx.config.dashboard ?? {}, body.dashboard);
    }

    writeFullConfig(full);
    ctx.broadcast('config:updated', { sections: Object.keys(body) });
    res.json({ ok: true, config: { orchestration: full['orchestration'], tasks: full['tasks'], dashboard: full['dashboard'] } });
  });

  return router;
}
