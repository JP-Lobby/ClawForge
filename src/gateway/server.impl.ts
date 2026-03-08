import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { ClawForgeConfig } from '../dashboard-api/types.js';
import { startMemoryGuard, stopMemoryGuard } from '../utils/memory-guard.js';
import { ensureTaskSchedulerRunning, stopTaskScheduler } from '../tasks/scheduler.js';

const CONFIG_PATH = path.join(os.homedir(), '.openclaw', 'clawforge.json');

const EXAMPLE_CONFIG = `
{
  "orchestration": {
    "enabled": true,
    "agentsDir": "~/.openclaw/agents",
    "providers": {
      "anthropic": {
        "apiKey": "sk-ant-YOUR_KEY_HERE",
        "defaultModel": "claude-sonnet-4-6"
      }
    }
  },
  "tasks": {
    "enabled": true,
    "autonomous": {
      "enabled": true,
      "heartbeatIntervalMs": 60000,
      "maxConcurrentTasks": 1,
      "maxRequestDepth": 3
    }
  },
  "dashboard": {
    "enabled": true,
    "port": 3001,
    "host": "0.0.0.0",
    "authToken": "changeme-to-something-secure"
  }
}
`;

function loadConfig(): ClawForgeConfig {
  if (!existsSync(CONFIG_PATH)) {
    console.warn(`[ClawForge] No config found at ${CONFIG_PATH}`);
    console.warn('[ClawForge] Run: bash scripts/onboard.sh  (or create it manually):\n' + EXAMPLE_CONFIG);
    return { dashboard: { enabled: true, port: 3001, host: '0.0.0.0' } };
  }

  try {
    const raw = readFileSync(CONFIG_PATH, 'utf8');
    const config = JSON.parse(raw) as ClawForgeConfig;
    console.log('[ClawForge] Config loaded from', CONFIG_PATH);
    return config;
  } catch (err) {
    console.error('[ClawForge] Failed to parse config:', err);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  console.log('[ClawForge] Starting...');
  const config = loadConfig();

  let dashboardServer: { close(): Promise<void> } | null = null;

  // Start dashboard server
  if (config.dashboard?.enabled !== false) {
    try {
      const { startDashboardServer } = await import('../dashboard-api/server.js');
      dashboardServer = await startDashboardServer(config);
    } catch (err) {
      console.warn('[ClawForge] Failed to start dashboard server:', err instanceof Error ? err.message : String(err));
    }
  }

  // Start task scheduler
  if (config.tasks?.enabled !== false) {
    const { getBroadcastFn } = await import('../dashboard-api/broadcast-registry.js');
    ensureTaskSchedulerRunning(
      config.tasks,
      config.orchestration as Parameters<typeof ensureTaskSchedulerRunning>[1],
      getBroadcastFn() ?? undefined
    );
  }

  // Start memory guard
  if (process.env['NODE_ENV'] !== 'test') {
    startMemoryGuard({ verbose: false });
  }

  console.log('[ClawForge] Ready.');

  // Graceful shutdown
  const shutdown = async (): Promise<void> => {
    console.log('[ClawForge] Shutting down...');
    stopMemoryGuard();
    stopTaskScheduler();
    if (dashboardServer) {
      await dashboardServer.close().catch((err: Error) => console.warn('[ClawForge] Dashboard close error:', err.message));
    }
    process.exit(0);
  };

  process.on('SIGTERM', () => { void shutdown(); });
  process.on('SIGINT', () => { void shutdown(); });
}

main().catch((err) => {
  console.error('[ClawForge] Fatal error:', err);
  process.exit(1);
});
