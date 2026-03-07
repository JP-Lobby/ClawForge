import Database from 'better-sqlite3';
import path from 'node:path';
import os from 'node:os';
import { mkdirSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

export const DEFAULT_BUDGET_DB_PATH = path.join(os.homedir(), '.openclaw', 'budget.db');

const PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-4-6': { input: 1.5, output: 7.5 },
  'claude-sonnet-4-6': { input: 0.3, output: 1.5 },
  'claude-haiku-4-5-20251001': { input: 0.08, output: 0.4 },
  'claude-haiku-4-5': { input: 0.08, output: 0.4 },
  'gpt-4o': { input: 0.25, output: 1.25 },
  'gpt-4o-mini': { input: 0.015, output: 0.06 },
  'ollama': { input: 0, output: 0 },
};

function getPricing(model: string): { input: number; output: number } {
  if (PRICING[model]) return PRICING[model];
  for (const [key, val] of Object.entries(PRICING)) {
    if (model.startsWith(key)) return val;
  }
  return { input: 0.3, output: 1.5 };
}

export function openBudgetDb(dbPath: string = DEFAULT_BUDGET_DB_PATH): Database.Database {
  const dir = path.dirname(dbPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS budget_usage (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      task_id TEXT,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      cost_cents REAL NOT NULL DEFAULT 0,
      recorded_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS budget_limits (
      agent_id TEXT PRIMARY KEY,
      monthly_limit_cents REAL NOT NULL DEFAULT 0,
      paused INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_budget_agent ON budget_usage(agent_id);
    CREATE INDEX IF NOT EXISTS idx_budget_recorded ON budget_usage(recorded_at DESC);
  `);

  return db;
}

export function calculateCostCents(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = getPricing(model);
  return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output;
}

export function recordUsage(
  db: Database.Database,
  opts: { agentId: string; provider: string; model: string; taskId?: string; inputTokens: number; outputTokens: number }
): void {
  const costCents = calculateCostCents(opts.model, opts.inputTokens, opts.outputTokens);
  db.prepare('INSERT INTO budget_usage (id, agent_id, provider, model, task_id, input_tokens, output_tokens, cost_cents, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(randomUUID(), opts.agentId, opts.provider, opts.model, opts.taskId ?? null, opts.inputTokens, opts.outputTokens, costCents, Date.now());
}

function getMonthStart(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

export function getAgentMonthlySpend(db: Database.Database, agentId: string): number {
  const row = db.prepare('SELECT COALESCE(SUM(cost_cents), 0) as total FROM budget_usage WHERE agent_id = ? AND recorded_at >= ?').get(agentId, getMonthStart()) as { total: number };
  return row.total;
}

export interface AgentSpendRow {
  agentId: string;
  spendCents: number;
  limitCents: number;
  paused: boolean;
}

export function getAllAgentSpends(db: Database.Database): AgentSpendRow[] {
  const monthStart = getMonthStart();
  const spends = db.prepare('SELECT agent_id, COALESCE(SUM(cost_cents), 0) as spend_cents FROM budget_usage WHERE recorded_at >= ? GROUP BY agent_id').all(monthStart) as Array<{ agent_id: string; spend_cents: number }>;
  const limits = db.prepare('SELECT agent_id, monthly_limit_cents, paused FROM budget_limits').all() as Array<{ agent_id: string; monthly_limit_cents: number; paused: number }>;
  const limitsMap = new Map(limits.map((l) => [l.agent_id, l]));

  return spends.map((s) => {
    const limit = limitsMap.get(s.agent_id);
    return { agentId: s.agent_id, spendCents: s.spend_cents, limitCents: limit?.monthly_limit_cents ?? 0, paused: (limit?.paused ?? 0) === 1 };
  });
}

export interface ProviderSpendRow { provider: string; spendCents: number; }

export function getProviderSpends(db: Database.Database): ProviderSpendRow[] {
  return (db.prepare('SELECT provider, COALESCE(SUM(cost_cents), 0) as spend_cents FROM budget_usage WHERE recorded_at >= ? GROUP BY provider').all(getMonthStart()) as Array<{ provider: string; spend_cents: number }>).map((r) => ({ provider: r.provider, spendCents: r.spend_cents }));
}

export function setAgentPaused(db: Database.Database, agentId: string, paused: boolean): void {
  const existing = db.prepare('SELECT monthly_limit_cents FROM budget_limits WHERE agent_id = ?').get(agentId) as { monthly_limit_cents: number } | undefined;
  db.prepare('INSERT OR REPLACE INTO budget_limits (agent_id, monthly_limit_cents, paused, updated_at) VALUES (?, ?, ?, ?)')
    .run(agentId, existing?.monthly_limit_cents ?? 0, paused ? 1 : 0, Date.now());
}

export function isAgentPaused(db: Database.Database, agentId: string): boolean {
  const row = db.prepare('SELECT paused FROM budget_limits WHERE agent_id = ?').get(agentId) as { paused: number } | undefined;
  return (row?.paused ?? 0) === 1;
}

export function setAgentLimit(db: Database.Database, agentId: string, limitCents: number): void {
  const existing = db.prepare('SELECT paused FROM budget_limits WHERE agent_id = ?').get(agentId) as { paused: number } | undefined;
  db.prepare('INSERT OR REPLACE INTO budget_limits (agent_id, monthly_limit_cents, paused, updated_at) VALUES (?, ?, ?, ?)')
    .run(agentId, limitCents, existing?.paused ?? 0, Date.now());
}
