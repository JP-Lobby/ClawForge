import { Router } from 'express';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import yaml from 'js-yaml';
import type { RouteContext } from '../types.js';
import { loadRegistry, getChannelsDir } from '../../stateless/config-loader.js';
import type { StatelessChannelConfig } from '../../stateless/types.js';

export function createChannelsRouter(_ctx: RouteContext): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    const registry = loadRegistry();
    if (!registry?.channels) { res.json({ channels: [] }); return; }

    const channels: StatelessChannelConfig[] = [];
    const channelsDir = getChannelsDir();

    for (const [channelId, entry] of Object.entries(registry.channels)) {
      try {
        const filePath = path.join(channelsDir, entry.config);
        const raw = readFileSync(filePath, 'utf8');
        const config = yaml.load(raw) as StatelessChannelConfig;
        config.channelId = config.channelId ?? channelId;
        channels.push(config);
      } catch { /* skip */ }
    }

    res.json({ channels });
  });

  router.get('/:id', (req, res) => {
    const registry = loadRegistry();
    const entry = registry?.channels?.[req.params['id']!];
    if (!entry) { res.status(404).json({ error: 'Channel not found' }); return; }

    try {
      const filePath = path.join(getChannelsDir(), entry.config);
      const raw = readFileSync(filePath, 'utf8');
      const config = yaml.load(raw) as StatelessChannelConfig;
      res.json({ channel: config });
    } catch {
      res.status(500).json({ error: 'Failed to read channel config' });
    }
  });

  router.patch('/:id', (req, res) => {
    const registry = loadRegistry();
    const entry = registry?.channels?.[req.params['id']!];
    if (!entry) { res.status(404).json({ error: 'Channel not found' }); return; }

    try {
      const filePath = path.join(getChannelsDir(), entry.config);
      const raw = readFileSync(filePath, 'utf8');
      const config = yaml.load(raw) as StatelessChannelConfig;
      const updated = { ...config, ...req.body as Partial<StatelessChannelConfig> };
      writeFileSync(filePath, yaml.dump(updated), 'utf8');
      res.json({ channel: updated });
    } catch {
      res.status(500).json({ error: 'Failed to update channel config' });
    }
  });

  return router;
}
