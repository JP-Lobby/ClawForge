import { randomUUID } from 'node:crypto';
import type { TasksConfig, TaskPriority } from './types.js';
import type { OrchestraConfig } from '../orchestration/types.js';
import type { BroadcastFn } from '../dashboard-api/types.js';
import { openTasksDb, DEFAULT_DB_PATH } from './store.js';
import { promoteBacklogTasks, resetStaleTasks, pickNextTask, atomicCheckout, releaseCheckout } from './service.js';
import { listAgents } from '../orchestration/agent.js';

let schedulerInterval: ReturnType<typeof setInterval> | null = null;
let schedulerOrchConfig: OrchestraConfig | undefined;
let schedulerBroadcast: BroadcastFn | undefined;
let schedulerConfig: TasksConfig | undefined;

export function ensureTaskSchedulerRunning(
  config?: TasksConfig,
  orchConfig?: OrchestraConfig,
  broadcastFn?: BroadcastFn
): void {
  if (schedulerInterval) return;

  schedulerConfig = config;
  schedulerOrchConfig = orchConfig;
  schedulerBroadcast = broadcastFn;

  const intervalMs = config?.autonomous?.heartbeatIntervalMs ?? 60_000;

  schedulerInterval = setInterval(() => {
    runSchedulerTick().catch((err) => {
      console.error('[ClawForge] Scheduler tick error:', err);
    });
  }, intervalMs);

  if (schedulerInterval.unref) schedulerInterval.unref();
  console.log(`[ClawForge] Task scheduler started (every ${intervalMs}ms)`);
}

export function stopTaskScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[ClawForge] Task scheduler stopped');
  }
}

async function runSchedulerTick(): Promise<void> {
  const dbPath = schedulerConfig?.dbPath ?? DEFAULT_DB_PATH;
  const db = openTasksDb(dbPath);

  const promoted = promoteBacklogTasks(db);
  if (promoted > 0) console.log(`[ClawForge] Scheduler: promoted ${promoted} backlog tasks`);

  const reset = resetStaleTasks(db);
  if (reset > 0) console.log(`[ClawForge] Scheduler: reset ${reset} stale checkouts`);

  if (schedulerConfig?.autonomous?.enabled && schedulerOrchConfig) {
    await runAutonomousTasks(db, dbPath);
  }
}

async function runAutonomousTasks(
  db: ReturnType<typeof openTasksDb>,
  dbPath: string
): Promise<void> {
  const agents = listAgents(schedulerOrchConfig?.agentsDir);
  const autonomousAgents = agents.filter((a) => a.canPickTasks);
  const maxConcurrent = schedulerConfig?.autonomous?.maxConcurrentTasks ?? 1;
  let running = 0;

  for (const agent of autonomousAgents) {
    if (running >= maxConcurrent) break;

    const priorities = (agent.taskPriorities as TaskPriority[]) ?? ['critical', 'high', 'medium', 'low'];
    const task = pickNextTask(db, agent.name, priorities);
    if (!task) continue;

    const runId = randomUUID();
    const checkedOut = atomicCheckout(db, task.id, runId, agent.name);
    if (!checkedOut) continue;

    running++;

    schedulerBroadcast?.('task:updated', { taskId: task.id, status: 'in_progress', agentId: agent.name });

    const taskPrompt = buildTaskPrompt(task);

    // Run orchestration loop
    (async () => {
      try {
        const { runOrchestrationLoop } = await import('../orchestration/run-loop.js');
        const { createTaskTools } = await import('./tools.js');
        const tools = createTaskTools({ agentId: agent.name, config: schedulerConfig });

        const result = await runOrchestrationLoop({
          agent,
          input: taskPrompt,
          orchConfig: schedulerOrchConfig!,
          availableTools: tools,
          taskId: task.id,
          budgetDbPath: dbPath,
        });

        releaseCheckout(db, task.id, 'done', result.content.slice(0, 500));
        schedulerBroadcast?.('task:updated', { taskId: task.id, status: 'done' });
        schedulerBroadcast?.('activity:new', { taskId: task.id, action: 'autonomous_completed', agentId: agent.name });

        console.log(`[ClawForge] Autonomous task done: ${task.title} (${task.id})`);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[ClawForge] Autonomous task failed: ${task.title}:`, errMsg);
        releaseCheckout(db, task.id, 'blocked', errMsg.slice(0, 500));
        schedulerBroadcast?.('task:updated', { taskId: task.id, status: 'blocked' });
      }
    })();
  }
}

export function buildTaskPrompt(task: { title: string; description?: string | null; id: string; priority: string }): string {
  return [
    `You have been assigned a task to complete autonomously.`,
    ``,
    `**Task ID:** ${task.id}`,
    `**Title:** ${task.title}`,
    `**Priority:** ${task.priority}`,
    task.description ? `**Description:** ${task.description}` : '',
    ``,
    `Please complete this task to the best of your ability. When done, use the complete_task tool with a summary of what you accomplished.`,
  ].filter(Boolean).join('\n');
}
