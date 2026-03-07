import type { AgentContext } from './types.js';

export function deepCloneContext(ctx: AgentContext): AgentContext {
  return JSON.parse(JSON.stringify(ctx)) as AgentContext;
}

export function mergeContext(
  base: AgentContext,
  updates: Record<string, unknown>
): AgentContext {
  return { ...base, ...updates };
}

export function interpolateInstructions(
  template: string,
  ctx: AgentContext
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = ctx[key];
    if (value === undefined || value === null) return `{{${key}}}`;
    return String(value);
  });
}
