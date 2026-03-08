import express from 'express';
import * as http from 'node:http';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { DashboardConfig, DashboardServer, ClawForgeConfig, BroadcastFn } from './types.js';
import { createAuthMiddleware } from './middleware/auth.js';
import { createDashboardWebSocket } from './websocket.js';
import { registerBroadcastFn } from './broadcast-registry.js';
import { createTasksRouter } from './routes/tasks.js';
import { createAgentsRouter } from './routes/agents.js';
import { createMemoryRouter } from './routes/memory.js';
import { createActivityRouter } from './routes/activity.js';
import { createBudgetRouter } from './routes/budget.js';
import { createChannelsRouter } from './routes/channels.js';
import { createResearchRouter } from './routes/research.js';
import { createProvidersRouter } from './routes/providers.js';
import { createNotesRouter } from './routes/notes.js';
import { createConfigRouter } from './routes/config.js';
import { createOrchestratorRouter } from './routes/orchestrator.js';
import { createReportsRouter } from './routes/reports.js';
import { createSchedulerRouter } from './routes/scheduler.js';

export async function startDashboardServer(config: ClawForgeConfig): Promise<DashboardServer> {
  const dashCfg: DashboardConfig = config.dashboard ?? { port: 3001, host: '0.0.0.0' };
  const port = dashCfg.port ?? 3001;
  const host = dashCfg.host ?? '0.0.0.0';

  const app = express();
  app.use(express.json());

  const server = http.createServer(app);
  const { broadcast } = createDashboardWebSocket(server);
  registerBroadcastFn(broadcast);

  const authMiddleware = createAuthMiddleware(dashCfg);
  const ctx = { config, broadcast };

  // Health check (no auth)
  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'clawforge-dashboard', timestamp: Date.now() });
  });

  // API routes (auth required)
  app.use('/api/tasks', authMiddleware, createTasksRouter(ctx));
  app.use('/api/agents', authMiddleware, createAgentsRouter(ctx));
  app.use('/api/memory', authMiddleware, createMemoryRouter(ctx));
  app.use('/api/activity', authMiddleware, createActivityRouter(ctx));
  app.use('/api/budget', authMiddleware, createBudgetRouter(ctx));
  app.use('/api/channels', authMiddleware, createChannelsRouter(ctx));
  app.use('/api/research', authMiddleware, createResearchRouter(ctx));
  app.use('/api/providers', authMiddleware, createProvidersRouter(ctx));
  app.use('/api/notes', authMiddleware, createNotesRouter(ctx));
  app.use('/api/config', authMiddleware, createConfigRouter(ctx));
  app.use('/api/orchestrate', authMiddleware, createOrchestratorRouter(ctx));
  app.use('/api/reports', authMiddleware, createReportsRouter(ctx));
  app.use('/api/scheduler', authMiddleware, createSchedulerRouter(ctx));

  // Serve static dashboard if built
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const distDir = path.resolve(__dirname, '../../dashboard/dist');
  if (existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  await new Promise<void>((resolve) => {
    server.listen(port, host, () => {
      console.log(`[ClawForge] Dashboard API listening on http://${host}:${port}`);
      resolve();
    });
  });

  return {
    close: () => new Promise<void>((resolve, reject) => {
      server.close((err) => err ? reject(err) : resolve());
    }),
  };
}
