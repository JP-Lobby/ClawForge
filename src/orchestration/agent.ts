import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import yaml from 'js-yaml';
import type { ClawAgent, OrchestraConfig } from './types.js';

interface CacheEntry {
  agent: ClawAgent;
  mtime: number;
}

const agentCache = new Map<string, CacheEntry>();

export function resolveAgentsDir(orchConfig?: OrchestraConfig): string {
  const raw = orchConfig?.agentsDir ?? '~/.openclaw/agents';
  if (raw.startsWith('~')) {
    return path.join(os.homedir(), raw.slice(1));
  }
  return raw;
}

export function loadAgent(
  name: string,
  agentsDir?: string
): ClawAgent | null {
  const dir = agentsDir
    ? agentsDir.startsWith('~')
      ? path.join(os.homedir(), agentsDir.slice(1))
      : agentsDir
    : path.join(os.homedir(), '.openclaw', 'agents');

  const filePath = path.join(dir, `${name}.yaml`);

  let mtime: number;
  try {
    mtime = fs.statSync(filePath).mtimeMs;
  } catch {
    return null;
  }

  const cached = agentCache.get(filePath);
  if (cached && cached.mtime === mtime) return cached.agent;

  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }

  const parsed = yaml.load(raw) as Partial<ClawAgent>;

  const agent: ClawAgent = {
    name: parsed.name ?? name,
    description: parsed.description ?? '',
    provider: parsed.provider ?? 'anthropic',
    model: parsed.model ?? 'claude-haiku-4-5-20251001',
    instructions: parsed.instructions ?? '',
    maxTurns: parsed.maxTurns ?? 20,
    tools: parsed.tools ?? [],
    handoffTo: parsed.handoffTo,
    canPickTasks: parsed.canPickTasks,
    taskPriorities: parsed.taskPriorities,
    budgetMonthlyCents: parsed.budgetMonthlyCents,
  };

  agentCache.set(filePath, { agent, mtime });
  return agent;
}

export function listAgents(agentsDir?: string): ClawAgent[] {
  const dir = agentsDir
    ? agentsDir.startsWith('~')
      ? path.join(os.homedir(), agentsDir.slice(1))
      : agentsDir
    : path.join(os.homedir(), '.openclaw', 'agents');

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const agents: ClawAgent[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.yaml')) continue;
    const name = entry.name.replace(/\.yaml$/, '');
    const agent = loadAgent(name, dir);
    if (agent) agents.push(agent);
  }
  return agents;
}
