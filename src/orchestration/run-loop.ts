import type { ClawAgent, AgentContext, AgentResponse, OrchestraConfig } from './types.js';
import type { AnyAgentTool } from './handoff.js';
import type { NormalizedMessage, NormalizedTool } from '../providers/types.js';
import { deepCloneContext, mergeContext, interpolateInstructions } from './context.js';
import { buildHandoffTools, extractHandoffAgent } from './handoff.js';
import { listAgents } from './agent.js';
import { callProvider } from '../providers/router.js';

const DEFAULT_MAX_TURNS = 20;

export async function runOrchestrationLoop(opts: {
  agent: ClawAgent;
  input: string;
  context?: AgentContext;
  availableTools?: AnyAgentTool[];
  orchConfig: OrchestraConfig;
  taskId?: string;
  budgetDbPath?: string;
}): Promise<AgentResponse> {
  const { input, orchConfig, taskId, budgetDbPath } = opts;

  let activeAgent = opts.agent;
  let context = opts.context ? deepCloneContext(opts.context) : ({} as AgentContext);
  const allAgents = listAgents(orchConfig.agentsDir);

  const messages: NormalizedMessage[] = [{ role: 'user', content: input }];
  let contextUpdates: Record<string, unknown> = {};
  let finalContent = '';
  let turn = 0;

  // Optional budget enforcement (loaded dynamically)
  let enforcer: {
    assertUnderBudget(): Promise<void>;
    recordCompletion(c: { usage?: { inputTokens: number; outputTokens: number }; provider: string; model: string }): void;
  } | null = null;

  if (budgetDbPath) {
    try {
      const budgetMod = await import('../budget/enforcer.js');
      enforcer = budgetMod.createBudgetEnforcer(activeAgent, { taskId, dbPath: budgetDbPath });
    } catch {
      // budget module not available
    }
  }

  const buildToolsForAgent = (agent: ClawAgent): AnyAgentTool[] => {
    const agentToolNames = new Set(agent.tools);
    const filtered = (opts.availableTools ?? []).filter((t) => agentToolNames.has(t.name));
    return [...filtered, ...buildHandoffTools(agent, allAgents)];
  };

  let activeTool = buildToolsForAgent(activeAgent);
  const maxTurns = activeAgent.maxTurns ?? DEFAULT_MAX_TURNS;

  while (turn < maxTurns) {
    turn++;

    if (enforcer) {
      try {
        await enforcer.assertUnderBudget();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[ClawForge] Budget exceeded for agent "${activeAgent.name}": ${msg}`);
        return {
          content: 'I have reached my monthly budget limit and cannot continue.',
          contextUpdates,
        };
      }
    }

    const systemInstructions = interpolateInstructions(activeAgent.instructions, context);
    const normalizedTools: NormalizedTool[] = activeTool.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }));

    const messagesWithSystem: NormalizedMessage[] = [
      { role: 'system', content: systemInstructions },
      ...messages,
    ];

    const completion = await callProvider(
      activeAgent.provider,
      orchConfig,
      messagesWithSystem,
      normalizedTools.length > 0 ? normalizedTools : undefined
    );

    if (enforcer) enforcer.recordCompletion(completion);

    if (!completion.toolCalls || completion.toolCalls.length === 0) {
      finalContent = completion.content;
      messages.push({ role: 'assistant', content: completion.content });
      break;
    }

    messages.push({ role: 'assistant', content: completion.content });

    let didHandoff = false;
    for (const toolCall of completion.toolCalls) {
      const tool = activeTool.find((t) => t.name === toolCall.name);
      let toolResult: string;

      if (!tool) {
        toolResult = JSON.stringify({ error: `Unknown tool: ${toolCall.name}` });
      } else {
        try {
          toolResult = await tool.execute(toolCall.input);
        } catch (err) {
          toolResult = JSON.stringify({ error: err instanceof Error ? err.message : String(err) });
        }
      }

      const handoffAgent = extractHandoffAgent(toolResult);
      if (handoffAgent) {
        activeAgent = handoffAgent;
        turn = 0;
        activeTool = buildToolsForAgent(activeAgent);

        if (budgetDbPath) {
          try {
            const budgetMod = await import('../budget/enforcer.js');
            enforcer = budgetMod.createBudgetEnforcer(activeAgent, { taskId, dbPath: budgetDbPath });
          } catch {
            // ignore
          }
        }

        messages.push({
          role: 'tool',
          content: `Transferred to agent: ${activeAgent.name}`,
          toolCallId: toolCall.id,
          toolName: toolCall.name,
        });

        didHandoff = true;
        break;
      }

      try {
        const parsed = JSON.parse(toolResult) as Record<string, unknown>;
        if ('__context_update' in parsed && typeof parsed['__context_update'] === 'object') {
          const updates = parsed['__context_update'] as Record<string, unknown>;
          context = mergeContext(context, updates);
          Object.assign(contextUpdates, updates);
        }
      } catch {
        // not JSON
      }

      messages.push({
        role: 'tool',
        content: toolResult,
        toolCallId: toolCall.id,
        toolName: toolCall.name,
      });
    }

    if (didHandoff) continue;
  }

  if (!finalContent) {
    finalContent = messages
      .filter((m) => m.role === 'assistant' && m.content)
      .map((m) => m.content)
      .pop() ?? '[No response generated within turn limit]';
  }

  return {
    content: finalContent,
    contextUpdates: Object.keys(contextUpdates).length > 0 ? contextUpdates : undefined,
  };
}
