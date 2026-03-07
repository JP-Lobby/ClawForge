# ClawForge Session 5 — Dashboard Frontend (React + Vite)

**Completed:** March 7, 2026
**Status:** Code complete. React + Vite + Tailwind CSS dashboard; builds to `dashboard/dist/` and is served as static files by the Session 4 Express server.

---

## What Was Built

Session 5 adds a **React 18 + Vite + Tailwind CSS single-page application** at `dashboard/` in the repo root. It connects to the Session 4 REST API on port 3001 and shows:

- **Dashboard overview** — task stats, in-progress tasks, provider health, recent activity
- **Kanban board** — tasks grouped by status with column-level counts
- **Task list + detail** — CRUD, status/priority updates, comments, activity log
- **Agents** — card grid with detail view, tools list, assigned tasks, reload config button
- **Memory viewer** — read/append/clear per channel
- **Channels** — inline CRUD for mode, custom prompt, memory config
- **Research** — browse and read Markdown files written by the Researcher agent
- **Activity** — global activity feed with live WS updates
- **Budget** — per-agent and per-provider budget gauges
- **Settings** — API URL + auth token config (stored in localStorage), connection tester

Key architectural decisions:
- **Zero external library for charts or markdown** — keeps bundle small for Pi
- **localStorage config** — API URL and auth token set in Settings, no env-file hassle
- **WebSocket auto-reconnect** — exponential backoff, sidebar shows live/offline dot
- **SPA served from Express** — `dashboard/dist/` is served by the Session 4 server at `/`; Vite dev server proxies `/api` and `/ws` to `:3001` during development

---

## File Inventory

### New directory: `dashboard/`

```
dashboard/
├── package.json               — React 18, Vite 5, Tailwind 3, react-router-dom, lucide-react
├── vite.config.ts             — Dev proxy: /api → :3001, /ws → :3001
├── tsconfig.json
├── tsconfig.node.json
├── tailwind.config.js         — Brand palette (deep indigo), JetBrains Mono font
├── postcss.config.js
├── index.html
└── src/
    ├── main.tsx               — ReactDOM.createRoot + BrowserRouter
    ├── App.tsx                — Sidebar layout + Routes + WS connection
    ├── index.css              — Tailwind directives + scrollbar styles
    ├── api/
    │   ├── client.ts          — fetch wrapper, ApiError, getConfig/setConfig
    │   ├── types.ts           — All API response types
    │   └── endpoints.ts       — Typed endpoint functions (agents, tasks, memory, …)
    ├── hooks/
    │   ├── useApi.ts          — Generic async data hook with loading/error/refresh
    │   └── useWebSocket.ts    — WS hook with exponential backoff reconnect
    ├── components/
    │   ├── Sidebar.tsx        — Nav links + WS status dot
    │   ├── StatusBadge.tsx    — StatusBadge + PriorityBadge
    │   ├── TaskCard.tsx       — Compact/full task card with link
    │   ├── AgentCard.tsx      — Agent grid card with link
    │   ├── ActivityFeed.tsx   — Timestamped activity list
    │   ├── ProviderBadge.tsx  — Green/yellow/red provider status
    │   ├── BudgetGauge.tsx    — Progress bar with color thresholds
    │   ├── MarkdownView.tsx   — Preformatted markdown display
    │   └── ErrorState.tsx     — Error + LoadingState components
    └── pages/
        ├── DashboardPage.tsx  — Overview: stats, in-progress tasks, providers, activity
        ├── TasksPage.tsx      — Kanban board + list view + create modal
        ├── TaskDetailPage.tsx — Task detail, status/priority update, comments
        ├── AgentsPage.tsx     — Agent card grid
        ├── AgentDetailPage.tsx — Agent detail, tools, system prompt, tasks, reload
        ├── MemoryPage.tsx     — Per-channel memory read/append/clear
        ├── ChannelsPage.tsx   — Inline channel config editor
        ├── ResearchPage.tsx   — Research file browser + viewer
        ├── ActivityPage.tsx   — Global activity feed
        ├── BudgetPage.tsx     — Budget gauges per agent + provider
        └── SettingsPage.tsx   — API URL + auth token + connection test
```

### Modified: `src/dashboard-api/server.ts`

Added static file serving at the bottom of route setup (before the listen call):

```typescript
const distDir = path.resolve(__dirname, "../../dashboard/dist");
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  // SPA fallback
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}
```

If `dashboard/dist/` doesn't exist (no build yet), the server falls back to a 404 JSON response as before.

---

## Tech Stack

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | 18.3 | UI framework |
| `react-dom` | 18.3 | DOM renderer |
| `react-router-dom` | 6.22 | Client-side routing |
| `lucide-react` | 0.344 | Icons |
| `vite` | 5.2 | Build tool + dev server |
| `@vitejs/plugin-react` | 4.3 | React/JSX transform |
| `tailwindcss` | 3.4 | Utility CSS |
| `typescript` | 5.4 | Type checking |

No heavyweight chart or markdown libraries — keeps the bundle lean for a Pi 4 (4 GB RAM).

---

## Configuration

Settings are stored in `localStorage` via the **Settings page** in the dashboard. No `.env` file needed.

| Setting | Description |
|---------|-------------|
| `clawforge:apiUrl` | Base URL of the API server. Leave blank when the dashboard is served from the same host (port 3001). Set to `http://<pi-ip>:3001` when accessing from Tailscale on another device. |
| `clawforge:authToken` | Must match `dashboard.authToken` in `openclaw.json`. |

---

## Deploy Steps

### On the Raspberry Pi (production)

#### 1. Install Node 20 + pnpm (if not already)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install -g pnpm
```

#### 2. Install dashboard dependencies
```bash
cd /path/to/openclaw/dashboard
npm install          # or: pnpm install
```

> If you prefer pnpm: add `dashboard` to the pnpm workspace in `pnpm-workspace.yaml`:
> ```yaml
> packages:
>   - 'src'
>   - 'dashboard'
> ```
> Then run `pnpm install` from the repo root.

#### 3. Build the React app
```bash
npm run build
# Output: dashboard/dist/
```

#### 4. Restart OpenClaw (picks up the new dist/)
```bash
sudo systemctl restart openclaw
```

#### 5. Open the dashboard
```
http://<pi-ip>:3001/
```

The Express server detects `dashboard/dist/` and serves the SPA. The WS connection at `/ws` is handled by the same server. No separate process needed.

#### 6. First-time setup in the browser
Navigate to **Settings** (bottom of sidebar) and:
- Leave **API URL** blank (same host)
- Enter your **auth token** from `openclaw.json`
- Click **Test connection** → should show "Connected"

---

### On another device (Tailscale)

Same steps, but in Settings set:
- **API URL**: `http://<pi-tailscale-ip>:3001`
- **Auth token**: your token

Make sure `host: "0.0.0.0"` is set in `openclaw.json` dashboard config.

---

### Development (MacBook / local)

```bash
# Terminal 1 — run OpenClaw (on Pi) or mock the API
# Terminal 2 — run the Vite dev server
cd dashboard
npm install
npm run dev
# → http://localhost:5173
```

Vite proxies `/api` and `/ws` to `http://localhost:3001` automatically. Set API URL to blank in Settings. The dev server uses the proxy so CORS is not an issue.

---

## Verification Checklist

1. **Build succeeds**:
   ```bash
   cd dashboard && npm run build
   # No TypeScript errors, dist/ created
   ```

2. **Static files served**:
   ```bash
   curl http://localhost:3001/
   # Returns HTML (the React SPA)
   ```

3. **SPA routing works** (direct link to a sub-page should load):
   ```bash
   curl http://localhost:3001/tasks
   # Returns index.html (SPA fallback)
   ```

4. **Dashboard loads in browser**:
   - Navigate to `http://<pi-ip>:3001/`
   - Sidebar shows 🦀 ClawForge Dashboard
   - WS dot in sidebar turns green

5. **Settings page**:
   - Enter auth token → click "Test connection"
   - Should show green "Connected" message

6. **Tasks page**:
   - Kanban board shows columns: todo / in_progress / blocked / done / cancelled
   - "New task" modal creates a task → appears in board

7. **WebSocket live updates**:
   - Create a task via the dashboard
   - Stats counter on Dashboard page updates without manual refresh

8. **Agents page**:
   - Cards show all agents from `~/.openclaw/agents/`
   - Clicking an agent shows detail page with tools and assigned tasks

9. **Memory page**:
   - Enter a channel ID → click Load
   - Shows conversation entries
   - Append + Clear work

10. **Research page**:
    - Lists `.md` files from `~/.openclaw/research/`
    - Clicking a file shows its content

---

## Architecture Notes

- **No server-side rendering** — pure SPA; the Express server just serves `index.html` for any non-API/non-asset request
- **WS event bus** — `App.tsx` holds the single WS connection and passes `lastEvent` to pages that need reactivity (Dashboard, Tasks, TaskDetail, Activity)
- **useApi / usePolling** — simple hooks; no React Query or SWR to keep deps minimal
- **Auth in localStorage** — acceptable for a LAN-only tool; not a public-facing app
- **Tailwind JIT** — content scanning of `src/**` only; no unused styles in production build
- **lucide-react** — tree-shaken by Vite; only imported icons are included in bundle

---

## Bundle Size Expectations (Pi 4)

| Chunk | Approximate size (gzip) |
|-------|------------------------|
| react vendor | ~45 KB |
| icons | ~5 KB (tree-shaken) |
| app code | ~35 KB |
| **Total** | **~85 KB** |

Fast load even on a local LAN. No CDN needed.
