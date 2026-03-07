import * as http from 'node:http';
import { WebSocketServer } from 'ws';
import type { BroadcastFn } from './types.js';

export function createDashboardWebSocket(server: http.Server): { wss: WebSocketServer; broadcast: BroadcastFn } {
  const wss = new WebSocketServer({ server, path: '/ws' });

  const broadcast: BroadcastFn = (event: string, data: unknown): void => {
    const message = JSON.stringify({ event, data, timestamp: Date.now() });
    for (const client of wss.clients) {
      if (client.readyState === 1) { // OPEN
        try { client.send(message); } catch { /* ignore */ }
      }
    }
  };

  wss.on('connection', (ws) => {
    // Send ping on connect
    ws.send(JSON.stringify({ event: 'ping', data: { ts: Date.now() }, timestamp: Date.now() }));

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as { event?: string };
        if (msg.event === 'ping') {
          ws.send(JSON.stringify({ event: 'ping', data: { ts: Date.now() }, timestamp: Date.now() }));
        }
      } catch { /* ignore */ }
    });
  });

  return { wss, broadcast };
}
