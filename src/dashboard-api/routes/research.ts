import { Router } from 'express';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { RouteContext } from '../types.js';

const RESEARCH_DIR = path.join(os.homedir(), '.openclaw', 'research');

export function createResearchRouter(_ctx: RouteContext): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    if (!existsSync(RESEARCH_DIR)) { res.json({ files: [] }); return; }
    try {
      const files = readdirSync(RESEARCH_DIR)
        .filter((f) => f.endsWith('.md'))
        .map((filename) => {
          const filePath = path.join(RESEARCH_DIR, filename);
          const stat = statSync(filePath);
          return { filename, sizeBytes: stat.size, modifiedAt: stat.mtimeMs };
        })
        .sort((a, b) => b.modifiedAt - a.modifiedAt);
      res.json({ files });
    } catch {
      res.status(500).json({ error: 'Failed to list research files' });
    }
  });

  router.get('/:filename', (req, res) => {
    const filename = path.basename(req.params['filename']!); // prevent path traversal
    const filePath = path.join(RESEARCH_DIR, filename);
    if (!existsSync(filePath)) { res.status(404).json({ error: 'File not found' }); return; }
    try {
      const content = readFileSync(filePath, 'utf8');
      const stat = statSync(filePath);
      res.json({ filename, content, sizeBytes: stat.size, modifiedAt: stat.mtimeMs });
    } catch {
      res.status(500).json({ error: 'Failed to read file' });
    }
  });

  return router;
}
