import { useState, useEffect, useRef } from 'react';
import { getConfig } from '../api/client.js';

export interface WsEvent {
  type: string;
  event: string;
  data: unknown;
  timestamp: number;
}

export interface UseWebSocketResult {
  lastEvent: WsEvent | null;
  connected: boolean;
}

function getWsUrl(): string {
  const { apiUrl } = getConfig();
  if (apiUrl) {
    const wsBase = apiUrl.replace(/^http/, 'ws').replace(/\/$/, '');
    return `${wsBase}/ws`;
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
}

export function useWebSocket(): UseWebSocketResult {
  const [lastEvent, setLastEvent] = useState<WsEvent | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryDelayRef = useRef(1000);

  useEffect(() => {
    function connect() {
      const url = getWsUrl();
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        retryDelayRef.current = 1000;
      };

      ws.onmessage = (e) => {
        try {
          const raw = JSON.parse(e.data as string) as { event?: string; type?: string; data: unknown; timestamp: number };
          const name = raw.event ?? raw.type ?? 'unknown';
          setLastEvent({ type: name, event: name, data: raw.data, timestamp: raw.timestamp });
        } catch { /* ignore */ }
      };

      ws.onclose = () => {
        setConnected(false);
        retryRef.current = setTimeout(() => {
          retryDelayRef.current = Math.min(retryDelayRef.current * 2, 30_000);
          connect();
        }, retryDelayRef.current);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      wsRef.current?.close();
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, []);

  return { lastEvent, connected };
}
