import { Router } from 'express';
import type { RouteContext } from '../types.js';
import { readChannelMemory, appendChannelMemory, clearChannelMemory, getMemoryStats } from '../../stateless/memory-store.js';

export function createMemoryRouter(_ctx: RouteContext): Router {
  const router = Router();

  router.get('/:channel', (req, res) => {
    const channel = req.params['channel']!;
    const content = readChannelMemory(channel);
    const stats = getMemoryStats(channel);
    res.json({ content, stats });
  });

  router.post('/:channel', (req, res) => {
    const channel = req.params['channel']!;
    const { content, source } = req.body as { content: string; source?: string };
    appendChannelMemory(channel, source ? `[${source}] ${content}` : content);
    res.status(201).json({ success: true });
  });

  router.delete('/:channel', (req, res) => {
    clearChannelMemory(req.params['channel']!);
    res.json({ success: true });
  });

  return router;
}
