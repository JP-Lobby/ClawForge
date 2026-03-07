# ClawForge Session 6 — Integration + Wiring

**Completed:** March 7, 2026
**Status:** Code complete. Budget tracking, budget enforcement, autonomous task execution, and the /research tool are all wired into the live system.

---

## What Was Built

Session 6 connects the pieces from Sessions 1–5 into a fully autonomous system:

**Budget tracking** (`src/budget/tracker.ts`) — Every LLM call records its token usage + estimated cost to `~/.openclaw/budget.db`. Costs are calculated from a pricing table per model. The `/api/budget` dashboard route now returns real spend data instead of zeroes.

**Budget enforcement** (`src/budget/enforcer.ts`) — Before every `callProvider()` call in the Swarm run loop, the `BudgetEnforcer` checks whether the active agent has exceeded its monthly limit. If so, it throws `BudgetExceededError`, stops the run, and auto-pauses the agent so it doesn't thrash. A new enforcer is created on agent handoffs.

**Research tool** (`src/tools/research.ts`) — An `AnyAgentTool`-compatible tool named `research`. Searches DuckDuckGo Lite (no API key needed), deduplicates results, then either calls the configured LLM to structure a Markdown report or falls back to a deterministic template. The report is saved to `~/.openclaw/research/{slug}-{date}.md`.

**Autonomous task execution** (`src/tasks/scheduler.ts`) — The heartbeat tick now:
1. Promotes `backlog` → `todo`
2. Resets stale `in_progress` checkouts (30 min threshold)
3. **NEW:** For each agent with `canPickTasks: true`, atomically checks out the highest-priority `todo` task matching its accepted priorities, runs the Swarm orchestration loop with the task prompt, then marks the task `done` or `blocked` and broadcasts a WS event.

**Broadcast registry** (`src/dashboard-api/broadcast-registry.ts`) — A singleton that holds the active `BroadcastFn`. The scheduler and any other module can call `broadcastEvent(event, data)` without importing the full dashboard server.

**Gateway startup** (`src/gateway/server.impl.ts`) — The scheduler is now started from the gateway with the orchestration config and broadcast function, so autonomous execution is available immediately at startup (not just on first Discord message).

---

## File Inventory

### New files

| File | Purpose |
|------|---------|
| `src/budget/tracker.ts` | SQLite cost DB, `recordUsage()`, `getAllAgentSpends()`, `getProviderSpends()`, `setAgentPaused()` |
| `src/budget/enforcer.ts` | `BudgetExceededError`, `createBudgetEnforcer()`, `assertUnderBudget()`, `recordCompletion()` |
| `src/budget/index.ts` | Public barrel |
| `src/tools/research.ts` | `createResearchTool()` — DuckDuckGo search + Markdown report + file save |
| `src/tools/index.ts` | Public barrel |
| `src/dashboard-api/broadcast-registry.ts` | `registerBroadcastFn()`, `broadcastEvent()`, `getBroadcastFn()` |

### Modified files

| File | Change |
|------|--------|
| `src/orchestration/run-loop.ts` | Import `BudgetExceededError` + `createBudgetEnforcer`; add `taskId`/`budgetDbPath` to options; wrap `callProvider` with pre-call check + post-call usage recording; recreate enforcer on handoff |
| `src/tasks/scheduler.ts` | Import orchestration + run-loop + broadcast registry; `ensureTaskSchedulerRunning` now accepts `orchConfig` + `broadcastFn`; add `runAutonomousTasks()` + `buildTaskPrompt()` |
| `src/dashboard-api/routes/budget.ts` | Replace stub with real `getAllAgentSpends()` + `getProviderSpends()` data |
| `src/dashboard-api/server.ts` | Call `registerBroadcastFn(broadcast)` after WS setup |
| `src/dashboard-api/index.ts` | Re-export broadcast registry functions |
| `src/gateway/server.impl.ts` | Import `ensureTaskSchedulerRunning` + `getBroadcastFn`; start scheduler with orchConfig + broadcastFn after dashboard server |
| `src/discord/monitor/message-handler.process.ts` | Pass orchConfig + broadcastFn to `ensureTaskSchedulerRunning` |

---

## Configuration

### `openclaw.json` additions

```jsonc
{
  "orchestration": {
    "enabled": true,
    "agentsDir": "~/.openclaw/agents",
    "providers": {
      "anthropic": { "apiKey": "sk-ant-..." },
      "ollama": { "baseUrl": "http://localhost:11434" }
    }
  },
  "tasks": {
    "enabled": true,
    "autonomous": {
      "enabled": true,
      "heartbeatIntervalMs": 60000,
      "maxConcurrentTasks": 1
    }
  },
  "dashboard": {
    "enabled": true,
    "port": 3001,
    "authToken": "your-secret-token"
  }
}
```

### Agent YAML for autonomous pickup

An agent picks up tasks autonomously when its YAML includes:

```yaml
name: researcher
provider: anthropic
model: claude-haiku-4-5-20251001
canPickTasks: true                    # ← enables autonomous pickup
taskPriorities: [critical, high]      # ← which priorities to accept
budgetMonthlyCents: 500               # ← $5.00/month limit (0 = unlimited)
tools:
  - research
  - create_task
  - complete_task
  - list_my_tasks
```

### Budget DB

Located at `~/.openclaw/budget.db` (SQLite). Created automatically on first LLM call.

Tables:
- `budget_usage` — one row per LLM call with `agent_id`, `provider`, `model`, `input_tokens`, `output_tokens`, `cost_cents`, `recorded_at`
- `budget_limits` — per-agent monthly limit and pause flag

---

## How the Autonomous Flow Works

```
Gateway starts
  └→ ensureTaskSchedulerRunning(tasksConfig, orchConfig, broadcastFn)
        └→ every 60s: runSchedulerTick()
              1. promoteBacklogTasks()    backlog → todo
              2. resetStaleTasks()        reset 30min+ stuck checkouts
              3. runAutonomousTasks()
                    → listAgents()        find agents with canPickTasks=true
                    → for each agent:
                          listTasks({ status: "todo" })
                          filter by agent.taskPriorities
                          atomicCheckout(task, runId, agentName)
                          runOrchestrationLoop({
                            agent,
                            input: buildTaskPrompt(task),
                            availableTools: createTaskTools(),
                            taskId: task.id,    ← budget attribution
                          })
                          releaseCheckout("done" | "blocked")
                          broadcastEvent("task:updated", ...)
                          broadcastEvent("activity:new", ...)
```

---

## Budget Enforcement Flow

```
runOrchestrationLoop() called
  → createBudgetEnforcer(agent, { taskId, dbPath })
  └→ while loop:
        await enforcer.assertUnderBudget()
          → isAgentPaused()?  → throw BudgetExceededError
          → getAgentMonthlySpend() >= budgetMonthlyCents?
              → setAgentPaused(true)
              → throw BudgetExceededError
        completion = await callProvider(...)
        enforcer.recordCompletion(completion)
          → calculateCostCents(model, inputTokens, outputTokens)
          → recordUsage({ agentId, provider, model, taskId, ... })
```

---

## Verification Steps

### 1. Autonomous task execution

```bash
# Create a task assigned to an agent with canPickTasks: true
# In Discord: /task create "Research quantum computing breakthroughs 2025"
# Or via API: POST /api/tasks { "title": "...", "assigneeAgentId": "researcher" }

# Wait for the next heartbeat (max 60s by default)
# Watch the dashboard — task should move to in_progress → done
# Check dashboard: http://<pi-ip>:3001/tasks
```

Or trigger immediately:
```bash
curl -X POST http://localhost:3001/api/tasks \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{"title": "Research Pi 5 vs Pi 4 performance", "priority": "high", "assigneeAgentId": "researcher"}'
```

Then watch the Activity page in the dashboard — within 60s you should see `autonomous_completed` entries.

### 2. Budget enforcement

Set a tiny budget for testing:
```yaml
# ~/.openclaw/agents/researcher.yaml
budgetMonthlyCents: 1   # 0.01¢ — will immediately exceed
```

Then create a task. The run loop should:
1. Call `assertUnderBudget()` → sees spend ≥ limit → pause agent → throw `BudgetExceededError`
2. Log `[ClawForge] Agent "researcher" has exceeded its monthly budget`
3. Mark the task `blocked`
4. Dashboard Activity page shows the error

Reset by setting `budgetMonthlyCents: 500` and clearing the DB:
```bash
sqlite3 ~/.openclaw/budget.db "UPDATE budget_limits SET paused=0 WHERE agent_id='researcher'"
```

### 3. Research tool

Make the `research` tool available to an agent, then trigger it:
```
/research quantum computing 2025 breakthroughs
```

Or directly assign a task:
```bash
curl -X POST http://localhost:3001/api/tasks \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{"title": "Research Raspberry Pi 5 AI performance benchmarks", "assigneeAgentId": "researcher"}'
```

Check Research page in dashboard (`http://<pi-ip>:3001/research`) — within 60s a new `.md` file should appear.

File also saved at: `~/.openclaw/research/raspberry-pi-5-ai-performance-benchmarks-2026-03-07.md`

### 4. Real budget data in dashboard

After at least one LLM call completes, navigate to:
`http://<pi-ip>:3001/budget`

Should show actual spend amounts instead of `0¢`.

### 5. WebSocket live updates

Open the dashboard while a task is executing. The kanban board should update in real time as the task moves `todo → in_progress → done` without needing a page refresh.

---

## Token Pricing Table

The pricing table lives in `src/budget/tracker.ts` — update as providers change rates:

| Model | Input (per 1k) | Output (per 1k) |
|-------|---------------|----------------|
| claude-opus-4-6 | 1.50¢ | 7.50¢ |
| claude-sonnet-4-6 | 0.30¢ | 1.50¢ |
| claude-haiku-4-5 | 0.08¢ | 0.40¢ |
| gpt-4o | 0.25¢ | 1.25¢ |
| gpt-4o-mini | 0.015¢ | 0.06¢ |
| ollama/local | 0¢ | 0¢ |

---

## Architecture Notes

- **Budget DB is separate from tasks DB** — `~/.openclaw/budget.db` vs `~/.openclaw/tasks.db`. This lets you wipe task data without losing spend history.
- **Pi memory constraint** — `maxConcurrentTasks: 1` is the default. Only one agent runs at a time. Agents execute sequentially even if multiple have eligible tasks.
- **Broadcast registry pattern** — Avoids circular imports. `broadcast-registry.ts` imports nothing from ClawForge; other modules import it without pulling in Express/ws.
- **Research tool fallback** — If no LLM provider is configured or the call fails, the report is built from a deterministic template using raw search snippets. Never silently fails.
- **DuckDuckGo Lite** — No API key, no rate-limit per se, simple HTML scraping. Suitable for low-frequency research calls on a Pi. Falls back to empty results array on timeout (10s).
