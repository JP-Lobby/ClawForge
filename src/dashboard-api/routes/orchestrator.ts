import { Router } from 'express';
import type { RouteContext } from '../types.js';
import { loadAgent, resolveAgentsDir } from '../../orchestration/agent.js';
import { runOrchestrationLoop } from '../../orchestration/run-loop.js';
import type { OrchestraConfig } from '../../orchestration/types.js';

export function createOrchestratorRouter(ctx: RouteContext): Router {
  const router = Router();

  const getOrchConfig = (): OrchestraConfig => ({
    enabled: ctx.config.orchestration?.enabled ?? true,
    agentsDir: resolveAgentsDir(ctx.config.orchestration as Parameters<typeof resolveAgentsDir>[0]),
    providers: (ctx.config.orchestration?.providers ?? {}) as OrchestraConfig['providers'],
  });

  // POST /api/orchestrate — run agent loop, supports SSE streaming
  router.post('/', async (req, res) => {
    const { agentName, message, channelId } = req.body as {
      agentName?: string;
      message?: string;
      channelId?: string;
    };

    if (!agentName || typeof agentName !== 'string') {
      res.status(400).json({ error: 'agentName is required' }); return;
    }
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'message is required' }); return;
    }

    const orchConfig = getOrchConfig();
    const agent = loadAgent(agentName, orchConfig.agentsDir);
    if (!agent) {
      res.status(404).json({ error: `Agent "${agentName}" not found` }); return;
    }

    const acceptsSSE = req.headers['accept'] === 'text/event-stream';

    if (acceptsSSE) {
      // SSE streaming mode
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      const sendEvent = (type: string, data: unknown) => {
        res.write(`data: ${JSON.stringify({ type, ...data as object })}\n\n`);
      };

      sendEvent('start', { agent: agentName, message });

      try {
        const response = await runOrchestrationLoop({
          agent,
          input: message,
          context: { channelId },
          orchConfig,
        });

        sendEvent('turn', { agent: agentName, content: response.content });
        sendEvent('done', { agent: agentName, content: response.content });
      } catch (err) {
        sendEvent('error', { message: err instanceof Error ? err.message : String(err) });
      }

      res.end();
    } else {
      // Standard JSON mode
      try {
        const response = await runOrchestrationLoop({
          agent,
          input: message,
          context: { channelId },
          orchConfig,
        });
        res.json({ response: response.content, agent: agentName });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
      }
    }
  });

  return router;
}
