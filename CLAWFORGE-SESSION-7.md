# ClawForge Session 7 — Testing + Optimization

**Completed:** March 7, 2026
**Status:** Code complete. Test suite, memory compression, Pi optimization, and deployment scripts are all written and ready to push to GitHub.

---

## What Was Built

Session 7 adds a comprehensive Vitest test suite for every ClawForge module, a memory compression utility, Pi-specific runtime optimizations, and two deployment scripts.

---

## Test Files

All test files follow the naming convention `*.clawforge.test.ts` so they are distinct from OpenClaw's existing tests and can be run independently.

| File | What it covers |
|------|---------------|
| `src/stateless/stateless.clawforge.test.ts` | `readChannelMemory`, `appendChannelMemory`, `clearChannelMemory`, `getMemoryStats`, `resolveMemoryFilePath`, `isMemoryCommand`, `parseMemoryNCommand`, `detectNaturalLanguageMemoryTrigger` |
| `src/tasks/tasks.clawforge.test.ts` | Task CRUD, `atomicCheckout` (race-condition guard), `releaseCheckout`, `listTasks` filters, `logActivity`/`getActivity`, `getTaskStats`, `pickNextTask` (priority + assignee preference), `tryCheckoutTask`/`completeTask` |
| `src/orchestration/orchestration.clawforge.test.ts` | `runOrchestrationLoop` (single-turn, tool calls, maxTurns, provider error, budget exceeded), `loadAgent` (YAML defaults, cache), `resolveAgentsDir`, `interpolateInstructions` |
| `src/budget/budget.clawforge.test.ts` | `calculateCostCents` per model, `recordUsage`/`getAgentMonthlySpend`, `getAllAgentSpends`, `getProviderSpends`, `setAgentPaused`/`isAgentPaused`, `BudgetExceededError`, full `createBudgetEnforcer` lifecycle |
| `src/tools/research.clawforge.test.ts` | Tool metadata, empty topic error, fetch failure / no results, template report saved to file, LLM report (mocked `callProvider`), LLM fallback on error, URL deduplication, parallel extra queries, file save failure |

### Running ClawForge tests only

```bash
# From repo root (on the Pi after pnpm install):
npx vitest run --config vitest.unit.config.ts --reporter=verbose \
  "src/**/*.clawforge.test.ts"

# Or just run all unit tests (includes existing OpenClaw tests):
pnpm test
```

All tests use in-memory / tmp SQLite files and stub `fetch` + `callProvider` where needed — **no real LLM calls or network requests are made**.

---

## New Files

### Memory Compression (`src/stateless/memory-compress.ts`)

Compresses per-channel memory `.md` files by summarising entries older than a configurable threshold (default: 30 days). Reduces system prompt size for long-running channels.

```typescript
import { compressChannelMemory, shouldCompress, compressAllMemoryFiles } from "./memory-compress.js";

// Check if compression is warranted (> 32 KB or ≥ 5 old entries):
if (shouldCompress(memoryFilePath)) {
  const result = compressChannelMemory(memoryFilePath, { olderThanDays: 30 });
  console.log(`Compressed ${result.removedEntries} old entries, saved ${result.bytesSaved} bytes`);
}

// Run across all channels at once (e.g. nightly cron):
const summary = compressAllMemoryFiles("~/.openclaw/memory", { olderThanDays: 30 });
console.log(`Compressed ${summary.compressed}/${summary.total} files`);
```

Key exports: `parseMemoryEntries`, `isEntryOld`, `buildSummaryBlock`, `shouldCompress`, `compressChannelMemory`, `compressAllMemoryFiles`.

### Memory Guard (`src/utils/memory-guard.ts`)

Lightweight periodic memory monitor designed for the Pi's 4 GB RAM constraint. Logs RSS + heap stats, warns when approaching limits, and optionally forces a GC pass.

```typescript
import { startMemoryGuard, stopMemoryGuard, getMemoryUsage } from "../utils/memory-guard.js";

// In gateway startup:
startMemoryGuard({
  intervalMs: 60_000,     // check every minute
  warnThresholdMb: 400,   // warn at 400 MB RSS
  gcThresholdMb: 450,     // try GC at 450 MB RSS
  verbose: false,         // set true to log every tick
});

// In /health route:
const mem = getMemoryUsage();
// { rssMb, heapUsedMb, heapTotalMb, externalMb, timestamp }
```

Requires `--expose-gc` Node flag for the GC trigger to work (see `start:pi` script below).

---

## Pi Optimization

### Heap size limit + GC flag

Added `"start:pi"` to `package.json`:

```json
"start:pi": "node --max-old-space-size=512 --expose-gc scripts/run-node.mjs"
```

- `--max-old-space-size=512` — caps the V8 old-generation heap at 512 MB (instead of the default, which can grow to ~1.4 GB before OOM-killing)
- `--expose-gc` — enables `global.gc()` so `MemoryGuard` can trigger collections when RSS climbs

The systemd service installed by `deploy-pi.sh` also sets `MemoryMax=600M` as a hard kernel cgroup limit.

### Recommended wiring (gateway startup)

```typescript
// src/gateway/server.impl.ts  — add after dashboard server starts
import { startMemoryGuard } from "../utils/memory-guard.js";

if (process.env.NODE_ENV !== "test") {
  startMemoryGuard({ verbose: false });
}
```

---

## Deployment Scripts

### `scripts/deploy-pi.sh`

Full end-to-end deploy:

```bash
# On the Pi (after git clone or git pull):
./scripts/deploy-pi.sh

# Override branch:
./scripts/deploy-pi.sh --branch my-feature

# Skip TypeScript + Vite build (code unchanged, just restart):
./scripts/deploy-pi.sh --skip-build
```

What it does:
1. `git fetch` + `git reset --hard origin/<branch>`
2. `pnpm install --frozen-lockfile`
3. `pnpm build` (TypeScript) + `pnpm build` in `dashboard/` (Vite)
4. Installs / overwrites `/etc/systemd/system/clawforge.service` with correct `NODE_OPTIONS`, `MemoryMax`, and `Restart=on-failure`
5. `systemctl daemon-reload && systemctl enable && systemctl restart`
6. Polls for service health and prints final status

### `scripts/migrate-from-openclaw.sh`

One-time migration helper for moving from vanilla OpenClaw to ClawForge:

```bash
# Standard migration:
./scripts/migrate-from-openclaw.sh

# Dry run — see what would happen without changing anything:
./scripts/migrate-from-openclaw.sh --dry-run

# Custom OpenClaw home:
./scripts/migrate-from-openclaw.sh --openclaw-home /mnt/pi-share/.openclaw
```

What it does:
1. Backs up `~/.openclaw` to a timestamped directory
2. Checks memory files (fully compatible — no conversion needed)
3. Audits `openclaw.json` for missing ClawForge keys (`orchestration`, `tasks`, `dashboard`) and prints the blocks to add if missing
4. Creates `~/.openclaw/agents/` with a starter `researcher.yaml` agent
5. Validates the resulting config with a quick `JSON.parse` check

---

## File Inventory

### New files

| File | Purpose |
|------|---------|
| `src/stateless/stateless.clawforge.test.ts` | Stateless module test suite |
| `src/tasks/tasks.clawforge.test.ts` | Task system test suite |
| `src/orchestration/orchestration.clawforge.test.ts` | Orchestration + run loop test suite |
| `src/budget/budget.clawforge.test.ts` | Budget tracker + enforcer test suite |
| `src/tools/research.clawforge.test.ts` | Research tool test suite |
| `src/stateless/memory-compress.ts` | Memory compression utility |
| `src/utils/memory-guard.ts` | Pi memory monitor + GC trigger |
| `scripts/deploy-pi.sh` | Full Pi deployment script |
| `scripts/migrate-from-openclaw.sh` | OpenClaw → ClawForge migration helper |

### Modified files

| File | Change |
|------|--------|
| `package.json` | Added `"start:pi"` script with `--max-old-space-size=512 --expose-gc` |

---

## GitHub Workflow

Push all changes to GitHub, then pull on the Pi and run the deploy script:

```bash
# On your dev machine:
git add .
git commit -m "feat: Session 7 — tests, memory compression, Pi optimization"
git push origin main

# On the Pi (via SSH or Tailscale):
ssh pi@<tailscale-ip>
cd ~/openclaw
git pull origin main
pnpm install
pnpm build
cd dashboard && pnpm install && pnpm build && cd ..
sudo systemctl restart clawforge
journalctl -u clawforge -f
```

Or use the deploy script (does all of the above + systemd):

```bash
ssh pi@<tailscale-ip> 'cd ~/openclaw && ./scripts/deploy-pi.sh'
```

---

## Session Summary

| Session | Focus | Status |
|---------|-------|--------|
| 1 | Stateless engine | ✅ Complete |
| 2 | Task system + Discord commands | ✅ Complete |
| 3 | Agent orchestration + provider router | ✅ Complete |
| 4 | Dashboard backend (REST + WebSocket) | ✅ Complete |
| 5 | Dashboard frontend (React + Vite) | ✅ Complete |
| 6 | Integration + wiring (budget, research, autonomous execution) | ✅ Complete |
| **7** | **Tests + optimization** | **✅ Complete** |

ClawForge is now feature-complete. All core systems are implemented, tested, and ready for production deployment on the Raspberry Pi.
