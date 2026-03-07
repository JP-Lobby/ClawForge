import type { ClawAgent } from '../orchestration/types.js';
import type { Completion } from '../providers/types.js';
import {
  openBudgetDb,
  DEFAULT_BUDGET_DB_PATH,
  recordUsage,
  getAgentMonthlySpend,
  isAgentPaused,
  setAgentPaused,
} from './tracker.js';

export class BudgetExceededError extends Error {
  constructor(agentId: string) {
    super(`[ClawForge] Agent "${agentId}" has exceeded its monthly budget`);
    this.name = 'BudgetExceededError';
  }
}

export interface BudgetEnforcer {
  assertUnderBudget(): Promise<void>;
  recordCompletion(completion: Completion): void;
}

export function createBudgetEnforcer(
  agent: ClawAgent,
  opts: { taskId?: string; dbPath?: string }
): BudgetEnforcer {
  const dbPath = opts.dbPath ?? DEFAULT_BUDGET_DB_PATH;
  const limitCents = agent.budgetMonthlyCents ?? 0;

  return {
    async assertUnderBudget(): Promise<void> {
      if (limitCents === 0) return; // 0 = unlimited

      const db = openBudgetDb(dbPath);
      if (isAgentPaused(db, agent.name)) {
        throw new BudgetExceededError(agent.name);
      }

      const spend = getAgentMonthlySpend(db, agent.name);
      if (spend >= limitCents) {
        setAgentPaused(db, agent.name, true);
        throw new BudgetExceededError(agent.name);
      }
    },

    recordCompletion(completion: Completion): void {
      if (!completion.usage) return;
      const db = openBudgetDb(dbPath);
      recordUsage(db, {
        agentId: agent.name,
        provider: completion.provider,
        model: completion.model,
        taskId: opts.taskId,
        inputTokens: completion.usage.inputTokens,
        outputTokens: completion.usage.outputTokens,
      });
    },
  };
}
