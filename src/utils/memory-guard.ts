export interface MemoryGuardOptions {
  intervalMs?: number;
  warnThresholdMb?: number;
  gcThresholdMb?: number;
  verbose?: boolean;
}

export interface MemoryUsageSnapshot {
  rssMb: number;
  heapUsedMb: number;
  heapTotalMb: number;
  externalMb: number;
  timestamp: number;
}

let guardInterval: ReturnType<typeof setInterval> | null = null;

const MB = 1024 * 1024;

export function getMemoryUsage(): MemoryUsageSnapshot {
  const mem = process.memoryUsage();
  return {
    rssMb: mem.rss / MB,
    heapUsedMb: mem.heapUsed / MB,
    heapTotalMb: mem.heapTotal / MB,
    externalMb: mem.external / MB,
    timestamp: Date.now(),
  };
}

export function startMemoryGuard(opts: MemoryGuardOptions = {}): void {
  stopMemoryGuard();

  const intervalMs = opts.intervalMs ?? 60_000;
  const warnThresholdMb = opts.warnThresholdMb ?? 400;
  const gcThresholdMb = opts.gcThresholdMb ?? 450;
  const verbose = opts.verbose ?? false;

  guardInterval = setInterval(() => {
    const usage = getMemoryUsage();

    if (verbose) {
      console.log(`[ClawForge:MemoryGuard] RSS=${usage.rssMb.toFixed(1)}MB Heap=${usage.heapUsedMb.toFixed(1)}/${usage.heapTotalMb.toFixed(1)}MB`);
    }

    if (usage.rssMb >= gcThresholdMb) {
      console.warn(`[ClawForge:MemoryGuard] CRITICAL: RSS ${usage.rssMb.toFixed(1)}MB >= ${gcThresholdMb}MB — attempting GC`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).gc?.();
    } else if (usage.rssMb >= warnThresholdMb) {
      console.warn(`[ClawForge:MemoryGuard] WARNING: RSS ${usage.rssMb.toFixed(1)}MB >= ${warnThresholdMb}MB`);
    }
  }, intervalMs);

  if (guardInterval.unref) guardInterval.unref();
}

export function stopMemoryGuard(): void {
  if (guardInterval) {
    clearInterval(guardInterval);
    guardInterval = null;
  }
}
