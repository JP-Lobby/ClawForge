import type { BroadcastFn } from './types.js';

let _broadcastFn: BroadcastFn | null = null;

export function registerBroadcastFn(fn: BroadcastFn): void {
  _broadcastFn = fn;
}

export function broadcastEvent(event: string, data: unknown): void {
  _broadcastFn?.(event, data);
}

export function getBroadcastFn(): BroadcastFn | null {
  return _broadcastFn;
}
