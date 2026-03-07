import { Router } from 'express';
import type { RouteContext } from '../types.js';

const HEALTH_TIMEOUT_MS = 5_000;

async function pingProvider(name: string, config: { apiKey?: string; baseUrl?: string; defaultModel?: string }): Promise<{ provider: string; status: 'ok' | 'error'; latencyMs?: number; error?: string }> {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

  try {
    if (name === 'ollama') {
      const base = (config.baseUrl ?? 'http://localhost:11434').replace(/\/$/, '');
      await fetch(`${base}/api/tags`, { signal: controller.signal });
      return { provider: name, status: 'ok', latencyMs: Date.now() - start };
    }

    if (name === 'anthropic') {
      if (!config.apiKey) return { provider: name, status: 'error', error: 'No API key configured' };
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: { 'x-api-key': config.apiKey, 'anthropic-version': '2023-06-01' },
        signal: controller.signal,
      });
      return { provider: name, status: res.ok ? 'ok' : 'error', latencyMs: Date.now() - start, error: res.ok ? undefined : `HTTP ${res.status}` };
    }

    // OpenAI-compat
    if (!config.apiKey) return { provider: name, status: 'error', error: 'No API key configured' };
    const base = config.baseUrl ?? 'https://api.openai.com/v1';
    const res = await fetch(`${base.replace(/\/$/, '')}/models`, {
      headers: { 'Authorization': `Bearer ${config.apiKey}` },
      signal: controller.signal,
    });
    return { provider: name, status: res.ok ? 'ok' : 'error', latencyMs: Date.now() - start, error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (err) {
    return { provider: name, status: 'error', error: err instanceof Error ? err.message : 'Unknown error' };
  } finally {
    clearTimeout(timeout);
  }
}

export function createProvidersRouter(ctx: RouteContext): Router {
  const router = Router();

  router.get('/health', async (_req, res) => {
    const providers = ctx.config.orchestration?.providers ?? {};
    const results = await Promise.all(
      Object.entries(providers).map(([name, cfg]) => pingProvider(name, cfg))
    );
    res.json({ providers: results });
  });

  return router;
}
