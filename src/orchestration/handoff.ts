import type { ClawAgent } from './types.js';

export const HANDOFF_KEY = '__clawforge_handoff__';

export interface AnyAgentTool {
  name: string;
  description: string;
  inputSchema: object;
  execute(input: Record<string, unknown>): Promise<string>;
}

export function buildHandoffTools(
  agent: ClawAgent,
  allAgents: ClawAgent[]
): AnyAgentTool[] {
  if (!agent.handoffTo || agent.handoffTo.length === 0) return [];

  return agent.handoffTo.flatMap((targetName) => {
    const target = allAgents.find((a) => a.name === targetName);
    if (!target) return [];

    const tool: AnyAgentTool = {
      name: `transfer_to_${targetName}`,
      description: `Transfer the conversation to the ${targetName} agent. Use when: ${target.description}`,
      inputSchema: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Brief reason for the handoff' },
        },
        required: [],
      },
      execute: async (input: Record<string, unknown>): Promise<string> => {
        return JSON.stringify({
          [HANDOFF_KEY]: target,
          reason: input['reason'] ?? 'Handoff requested',
        });
      },
    };

    return [tool];
  });
}

export function extractHandoffAgent(toolResult: string): ClawAgent | null {
  try {
    const parsed = JSON.parse(toolResult) as Record<string, unknown>;
    if (HANDOFF_KEY in parsed) {
      return parsed[HANDOFF_KEY] as ClawAgent;
    }
  } catch {
    // not JSON
  }
  return null;
}
