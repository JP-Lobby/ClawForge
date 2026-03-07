import type { Request, Response, NextFunction } from 'express';
import type { DashboardConfig } from '../types.js';

export function createAuthMiddleware(config: DashboardConfig) {
  if (!config.authToken) {
    console.warn('[ClawForge] Dashboard: no authToken configured — all requests accepted');
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    // CORS headers
    if (config.cors !== false) {
      const origin = config.corsOrigin ?? '*';
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    if (!config.authToken) {
      next();
      return;
    }

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header' });
      return;
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (token !== config.authToken) {
      res.status(403).json({ error: 'Invalid token' });
      return;
    }

    next();
  };
}
