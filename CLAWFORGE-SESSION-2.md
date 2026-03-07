# ClawForge — Session 2 Complete: Task System

**Status:** ✅ Implementation complete, ready for deployment to Pi 2

---

## What Was Built

Session 2 introduces the **ClawForge Task System** — a SQLite-backed task management engine with Discord commands, agent tools, autonomous scheduling, and a full audit trail. Inspired by Paperclip's task lifecycle with Pi-optimized in-memory filtering.

---

## New Files: `src/tasks/` (9 files)

| File | Purpose |
|------|---------|
| `types.ts` | TypeScript interfaces: `Task`, `TaskStatus`, `TaskPriority`, `TaskComment`, `TaskActivityEntry`, `CreateTaskInput`, `UpdateTaskInput`, `TasksConfig` |
| `store.ts` | SQLite store: schema creation, WAL mode, CRUD queries via `node:sqlite` |
| `service.ts` | Business logic: createTask, updateTask, atomicCheckout, releaseCheckout, addComment, pickNextTask, getTaskStats |
| `activity-log.ts` | Immutable audit trail helpers: logTaskStarted, logTaskCompleted, logTaskBlocked, logSubtaskCreated |
| `decomposer.ts` | Subtask creation with `parentId` linking, `requestDepth` enforcement (max 3 levels by default) |
| `scheduler.ts` | `setInterval`-based scheduler: promotes backlog→todo, resets stale locks (>30 min), starts lazily |
| `tools.ts` | 5 agent tools: `create_task`, `create_subtask`, `complete_task`, `list_my_tasks`, `update_task_status` |
| `discord-commands.ts` | Discord `/task` command handler (create, list, done, assign, status, promote, stats, help) |
| `index.ts` | Public re-export barrel |

---

## SQLite Schema

Three tables in `~/.openclaw/data/tasks.db` (WAL mode):

```sql
tasks               — Core task records (id, parent_id, title, status, priority, assignee, checkout_run_id, ...)
task_comments       — Per-task comments from agents or users
task_activity_log   — Immutable audit trail (action, details, timestamps)
```

Indexes: `idx_tasks_status`, `idx_tasks_assignee`, `idx_tasks_parent`, `idx_task_comments_task`, `idx_activity_task`, `idx_activity_created`

---

## Discord Commands

All commands are **terminal** (no LLM call, respond immediately):

| Command | Action |
|---------|--------|
| `/task create <title>` | Create task (starts in backlog) |
| `/task create <title> --priority high` | Create with priority (critical/high/medium/low) |
| `/task list` | Show todo + in-progress tasks |
| `/task list --all` | Show all active tasks |
| `/task status <id>` | Task detail + recent activity |
| `/task promote <id>` | Move backlog → todo (ready for agent) |
| `/task done <id>` | Mark task done |
| `/task assign <id> <agentId>` | Assign to an agent |
| `/task stats` | Task counts by status + priority |
| `/task help` | Show command reference |

IDs can be shortened to first 8 characters.

---

## Agent Tools (injected into every agent)

| Tool | What it does |
|------|-------------|
| `create_task` | Creates a new task in backlog |
| `create_subtask` | Creates subtask linked to parent (depth-limited) |
| `complete_task` | Marks task done, logs summary to activity trail |
| `list_my_tasks` | Lists tasks assigned to this agent + unassigned |
| `update_task_status` | Changes status, assignee, or priority |

---

## Integration Points Modified

### `src/discord/monitor/message-handler.process.ts`
Two new edits (prefixed `// ClawForge: Task`):

1. **Detection phase** (after stateless detection, ~line 205): Checks for `/task` prefix → calls `executeTaskCommand()`. Also starts scheduler via `ensureTaskSchedulerRunning()` on first message.

2. **Delivery phase** (before stateless command delivery, ~line 850): Delivers task command reply via `deliverDiscordReply`, then returns (terminal).

### `src/agents/openclaw-tools.ts`
Two edits:

1. **Import** (top of file): `import { createTaskTools }` + `import type { TasksConfig }`

2. **Tool injection** (before `return`): Calls `createTaskTools({ agentId, config: tasksConfig })` and spreads into the returned tools array.

---

## Scheduler Behaviour

The `TaskScheduler` runs as a lazy `setInterval` (default: 60s), started on first Discord message:

1. **Backlog → Todo promotion**: Tasks without a `dueDate` are immediately promoted. Tasks with a past `dueDate` are also promoted.
2. **Stale lock recovery**: `in_progress` tasks locked > 30 min with no update are reset to `todo` (handles crashed agent runs).
3. **No autonomous execution** yet (Session 3 wires this into the run loop).

---

## Config (add to `~/.openclaw/openclaw.json`)

```json
{
  "tasks": {
    "enabled": true,
    "dbPath": "~/.openclaw/data/tasks.db",
    "autonomous": {
      "enabled": true,
      "heartbeatIntervalMs": 60000,
      "maxConcurrentTasks": 1,
      "maxRequestDepth": 3
    }
  }
}
```

If `tasks` section is absent, the system still works with defaults.

---

## Deploy to Pi 2

### 1. Push to GitHub

```bash
git add src/tasks/ src/discord/monitor/message-handler.process.ts src/agents/openclaw-tools.ts
git commit -m "feat: ClawForge Session 2 — task system with SQLite, Discord commands, agent tools"
git push origin main
```

### 2. Pull + Build on Pi 2

```bash
ssh pi2
cd ~/openclaw
git pull
npm run build
pm2 restart openclaw
```

No new npm dependencies — uses `node:sqlite` (built-in), `@sinclair/typebox` (already a dep), `crypto` (built-in).

---

## Verification Checklist

```
[ ] 1. Send: /task help
        Expected: Shows full command reference (no LLM call, immediate response)

[ ] 2. Send: /task create Fix the login bug --priority high
        Expected: Task created (status: backlog)

[ ] 3. Send: /task list --all
        Expected: Shows the task in backlog

[ ] 4. Send: /task promote <id>
        Expected: Task promoted to todo

[ ] 5. Send: /task list
        Expected: Task now shows in todo

[ ] 6. Send: /task status <id>
        Expected: Full detail + activity log showing "created" and "status_changed"

[ ] 7. Send: /task create Another task
        Wait 60 seconds (scheduler fires)
        Send: /task list --all
        Expected: Second task auto-promoted to todo

[ ] 8. Ask the agent: "List my tasks"
        Expected: Agent calls list_my_tasks tool and returns a task list

[ ] 9. Ask the agent: "Create a task to research Pi memory optimization"
        Expected: Agent calls create_task tool, task appears in /task list

[ ] 10. Send: /task done <id>
         Expected: Task marked done, /task list no longer shows it

[ ] 11. Send: /task stats
         Expected: Shows counts: 1 done, 1-2 todo
```

---

## Architecture Notes for Session 3

- **Agent tools**: `list_my_tasks` + `update_task_status` are the agent's entry point for self-directed work. Session 3's run loop will wire autonomous pickup: heartbeat → `pickNextTask()` → `atomicCheckout()` → run agent with task as input → `releaseCheckout()`.

- **Atomic checkout**: Uses SQLite `UPDATE ... WHERE status='todo' AND checkout_run_id IS NULL` — safe for single-Pi concurrency, prevents double-work.

- **Activity trail**: Every state change is logged. Session 4's dashboard will surface this as a real-time feed.

- **`requestDepth`**: Subtasks inherit parent depth + 1. Session 3's agent loop checks `maxRequestDepth` before allowing `create_subtask` to prevent infinite decomposition loops.

---

*ClawForge Session 2 completed: 2026-03-07*
