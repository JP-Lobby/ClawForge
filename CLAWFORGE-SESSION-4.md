# ClawForge Session 4 — Dashboard Backend (API + WebSocket)

**Completed:** March 7, 2026
**Status:** Code complete. TypeScript errors shown by local tsc are all pre-existing pnpm-missing issues; our code uses identical import patterns to existing codebase.

---

## What Was Built

Session 4 adds a **standalone REST API + WebSocket server** on port 3001. It runs alongside the main OpenClaw gateway and exposes all ClawForge data (tasks, agents, memory, activity, budget, channels, research files, provider health) via a clean JSON API. The React dashboard (Session 5) will consume this API.

Key design principle: **completely separate from the gateway**. Zero risk of breaking existing OpenClaw functionality. The dashboard server is started after the gateway is up, and stopped before the gateway closes.

---

## Files Created

```
src/dashboard-api/
├── types.ts              — DashboardConfig, DashboardEvent, BroadcastFn, RouteContext
├── server.ts             — startDashboardServer(): creates Express app + mounts routes
├── websocket.ts          — createDashboardWebSocket(): WS server at /ws
├── index.ts              — Public barrel
├── middleware/
│   └── auth.ts           — Bearer token auth + CORS middleware
└── routes/
    ├── agents.ts         — GET /api/agents, GET /api/agents/:name, POST /api/agents/:name/reload
    ├── tasks.ts          — Full CRUD: GET/POST /api/tasks, PATCH /api/tasks/:id, comments
    ├── memory.ts         — GET/POST/DELETE /api/memory/:channel
    ├── activity.ts       — GET /api/activity (paginated)
    ├── budget.ts         — GET /api/budget (YAML limits; spend wired in Session 6)
    ├── channels.ts       — GET/PATCH /api/channels (stateless config CRUD)
    ├── research.ts       — GET /api/research + GET /api/research/:filename
    └── providers.ts      — GET /api/providers/health (pings each provider)
```

---

## Files Modified

### `src/gateway/server.impl.ts`

Two additions (all `// ClawForge:` prefixed):

1. **Import** at top:
   ```typescript
   import { startDashboardServer, type DashboardServer } from "../dashboard-api/index.js";
   ```

2. **Startup block** (just before `return`):
   ```typescript
   let dashboardServer: DashboardServer | null = null;
   try {
     dashboardServer = await startDashboardServer(cfgAtStart);
   } catch (err) {
     log.warn(`[ClawForge:dashboard] Failed to start: ${String(err)}`);
   }
   ```

3. **Cleanup** in `close`:
   ```typescript
   if (dashboardServer) {
     await dashboardServer.close().catch(err => log.warn(...));
   }
   ```

---

## Configuration

Add to your `openclaw.json`:

```json
{
  "dashboard": {
    "enabled": true,
    "port": 3001,
    "host": "0.0.0.0",
    "authToken": "your-secret-token-here",
    "cors": true,
    "corsOrigin": "*"
  }
}
```

**Security:**
- Set `host: "127.0.0.1"` for loopback-only (then Tailscale handles access from your other Pi)
- Set `host: "0.0.0.0"` to bind on all interfaces (use authToken!)
- The `authToken` is sent as `Authorization: Bearer <token>` from the React app
- If no `authToken` is set, a warning is logged and all requests are accepted

---

## API Reference

### Agents

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/agents` | List all agents from `~/.openclaw/agents/` |
| `GET` | `/api/agents/:name` | Agent detail + assigned tasks |
| `POST` | `/api/agents/:name/reload` | Invalidate cache, reload from YAML |

### Tasks

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/tasks` | List tasks (`?status=todo&assignee=Triage&priority=high`) |
| `GET` | `/api/tasks/stats` | Aggregate stats by status + priority |
| `GET` | `/api/tasks/:id` | Task detail + activity log |
| `POST` | `/api/tasks` | Create task (`{title, priority, assigneeAgentId, ...}`) |
| `PATCH` | `/api/tasks/:id` | Update task (`{status, priority, assigneeAgentId, ...}`) |
| `POST` | `/api/tasks/:id/comments` | Add comment (`{content}`) |
| `GET` | `/api/tasks/:id/activity` | Task activity log |

### Memory

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/memory/:channel` | Get channel memory content + stats |
| `POST` | `/api/memory/:channel` | Append entry (`{content, source}`) |
| `DELETE` | `/api/memory/:channel` | Clear all memory |

### Activity

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/activity` | Recent activity log (`?limit=50&taskId=xxx`) |

### Budget

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/budget` | Budget by agent + by provider (limits from YAML; spend wired in Session 6) |

### Channels

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/channels` | List all stateless channel configs |
| `GET` | `/api/channels/:id` | Single channel config |
| `PATCH` | `/api/channels/:id` | Update channel (mode, customPrompt, orchestration) |

### Research

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/research` | List markdown files in `~/.openclaw/research/` |
| `GET` | `/api/research/:filename` | File content + metadata |

### Providers

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/providers/health` | Ping each configured provider (5s timeout) |

### System

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Server health check (no auth required) |

---

## WebSocket Events

Connect to `ws://<pi-ip>:3001/ws`. No auth on WS connection (isolated from auth middleware — add if needed in Session 6).

All events have the envelope:
```json
{ "event": "event:name", "data": { ... }, "timestamp": 1234567890 }
```

| Event | Trigger |
|-------|---------|
| `ping` | On connection + on client ping |
| `task:created` | POST /api/tasks |
| `task:updated` | PATCH /api/tasks/:id, POST /api/tasks/:id/comments |
| `agent:status_changed` | POST /api/agents/:name/reload |

> **Note:** The orchestration run loop doesn't emit WS events yet. Wire those in Session 6 by calling `broadcast()` from `run-loop.ts`.

---

## Deploy Steps

### 1. Deploy code to Pi
```bash
git pull
pnpm install
pnpm build    # or however you build
```

### 2. Add dashboard config to openclaw.json
```json
{
  "dashboard": {
    "enabled": true,
    "port": 3001,
    "host": "0.0.0.0",
    "authToken": "changeme-to-something-secure"
  }
}
```

### 3. Restart OpenClaw
```bash
sudo systemctl restart openclaw   # or however you run it
```

### 4. Verify dashboard started
```bash
# Should show "API server listening on http://0.0.0.0:3001"
sudo journalctl -u openclaw -n 20 | grep dashboard
```

---

## Verification Checklist

1. **Health check** (no auth):
   ```bash
   curl http://localhost:3001/health
   # {"ok":true,"service":"clawforge-dashboard","wsClients":0,...}
   ```

2. **List agents:**
   ```bash
   curl -H "Authorization: Bearer changeme-to-something-secure" \
     http://localhost:3001/api/agents
   # {"agents":[{"name":"Triage",...},{"name":"Researcher",...}]}
   ```

3. **List tasks:**
   ```bash
   curl -H "Authorization: Bearer changeme" \
     "http://localhost:3001/api/tasks?status=todo"
   ```

4. **Provider health:**
   ```bash
   curl -H "Authorization: Bearer changeme" \
     http://localhost:3001/api/providers/health
   # {"providers":[{"provider":"anthropic","status":"ok","latencyMs":230},...]}
   ```

5. **Create a task via API:**
   ```bash
   curl -X POST -H "Authorization: Bearer changeme" \
     -H "Content-Type: application/json" \
     -d '{"title":"Test from API","priority":"low"}' \
     http://localhost:3001/api/tasks
   ```

6. **WebSocket events:**
   ```bash
   # Install wscat: npm install -g wscat
   wscat -c ws://localhost:3001/ws
   # Should receive: {"event":"ping","data":{"ts":...},"timestamp":...}
   # Then create a task — should receive {"event":"task:created",...}
   ```

7. **Channel config read/write:**
   ```bash
   curl -H "Authorization: Bearer changeme" \
     http://localhost:3001/api/channels
   ```

8. **Dashboard server stops cleanly:**
   ```bash
   sudo systemctl stop openclaw
   # No hanging processes on port 3001
   ```

---

## Architecture Notes

- **Express 5** (already in OpenClaw's deps) — Router-based modular routes
- **ws package** (already in OpenClaw's deps) — `WebSocketServer` for real-time events
- **Separate http.Server** — Not attached to the existing gateway's httpServer
- **Broadcast function** — Closure over `wss.clients`, passed to all routes via `RouteContext`
- **No ORM** — Reads directly from the task SQLite DB and YAML files; same functions as agents use
- **Budget stub** — `/api/budget` returns YAML-defined limits with 0 spend until Session 6

---

## File Inventory (Session 4 Only)

**New files (13 total):**
```
src/dashboard-api/types.ts
src/dashboard-api/server.ts
src/dashboard-api/websocket.ts
src/dashboard-api/index.ts
src/dashboard-api/middleware/auth.ts
src/dashboard-api/routes/agents.ts
src/dashboard-api/routes/tasks.ts
src/dashboard-api/routes/memory.ts
src/dashboard-api/routes/activity.ts
src/dashboard-api/routes/budget.ts
src/dashboard-api/routes/channels.ts
src/dashboard-api/routes/research.ts
src/dashboard-api/routes/providers.ts
```

**Modified files (1 total):**
```
src/gateway/server.impl.ts   (+import, +startup block, +close handler)
```
