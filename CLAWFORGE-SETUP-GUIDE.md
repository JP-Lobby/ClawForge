# ClawForge — Complete Setup & Commands Guide

**Version:** Post-Session-7 (March 2026)
**Author:** Dominik
**Base fork:** `JP-Lobby/openclaw`
**Target hardware:** 2× Raspberry Pi 4 (4 GB RAM) on Tailscale

---

## 1. Where Are the Files?

All ClawForge source code was generated across 7 sessions. The session files are saved as Markdown documents in your outputs folder:

```
CLAWFORGE-SESSION-1.md   — Stateless engine core
CLAWFORGE-SESSION-2.md   — Autonomous task system
CLAWFORGE-SESSION-3.md   — Swarm-style orchestration
CLAWFORGE-SESSION-4.md   — Provider routing + budget tracker
CLAWFORGE-SESSION-5.md   — React dashboard (Vite)
CLAWFORGE-SESSION-6.md   — Dashboard API + research tool
CLAWFORGE-SESSION-7.md   — Tests, memory compression, Pi deploy scripts
ClawForge-Implementation-Guide.md  — Architecture overview
CLAWFORGE-SETUP-GUIDE.md           — This file
```

Each session `.md` file contains the **full source code** of every file created or modified in that session, as fenced code blocks. To use them, you need to:

1. Open the `.md` file
2. Find the code block for each file listed under "New Files" or "Modified Files"
3. Copy it into the correct path in your local OpenClaw repo

The complete file tree is listed in Section 2 below.

---

## 2. Complete File Structure

After all 7 sessions, these are all the new files and key modified files in the repo:

```
openclaw/
├── src/
│   ├── stateless/
│   │   ├── types.ts                         ← Session 1
│   │   ├── config-loader.ts                 ← Session 1 (bug-fixed)
│   │   ├── memory-store.ts                  ← Session 1
│   │   ├── natural-language-memory.ts       ← Session 1
│   │   ├── commands.ts                      ← Session 1 (bug-fixed)
│   │   ├── index.ts                         ← Session 1
│   │   └── memory-compress.ts               ← Session 7
│   ├── tasks/
│   │   ├── types.ts                         ← Session 2
│   │   ├── store.ts                         ← Session 2
│   │   ├── service.ts                       ← Session 2
│   │   ├── scheduler.ts                     ← Session 2
│   │   ├── tools.ts                         ← Session 2 (bug-fixed)
│   │   └── decomposer.ts                    ← Session 2
│   ├── orchestration/
│   │   ├── types.ts                         ← Session 3
│   │   ├── agent.ts                         ← Session 3
│   │   ├── run-loop.ts                      ← Session 3
│   │   ├── handoff.ts                       ← Session 3
│   │   └── context.ts                       ← Session 3
│   ├── budget/
│   │   ├── tracker.ts                       ← Session 4 (bug-fixed)
│   │   └── enforcer.ts                      ← Session 4
│   ├── providers/
│   │   └── router.ts                        ← Session 4
│   ├── tools/
│   │   └── research.ts                      ← Session 6
│   ├── dashboard-api/
│   │   ├── server.ts                        ← Session 6
│   │   └── routes/
│   │       └── tasks.ts                     ← Session 6 (bug-fixed)
│   └── utils/
│       └── memory-guard.ts                  ← Session 7
├── dashboard/                               ← Session 5 (Vite + React)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   └── pages/
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── scripts/
│   ├── deploy-pi.sh                         ← Session 7
│   └── migrate-from-openclaw.sh             ← Session 7
├── stateless-channels/                      ← Session 1 (config dir)
│   ├── registry.yaml
│   └── channels/
│       ├── example-channel.yaml
│       └── research-channel.yaml
└── src/discord/monitor/
    └── message-handler.process.ts           ← Modified Session 1
```

> **Note:** 5 files were bug-fixed after the code review (Session 7+):
> `tracker.ts`, `routes/tasks.ts`, `commands.ts`, `tools.ts`, `config-loader.ts`
> Make sure you copy the **corrected** versions from the session files, not earlier drafts.

---

## 3. Pushing to GitHub

### First time (fresh fork)

```bash
# 1. Clone your OpenClaw fork locally
git clone https://github.com/YOUR_USERNAME/openclaw.git
cd openclaw

# 2. Create a ClawForge branch
git checkout -b clawforge

# 3. Add all new ClawForge files
#    (copy files from session .md docs into the paths listed above)

# 4. Stage everything
git add src/stateless/ \
        src/tasks/ \
        src/orchestration/ \
        src/budget/ \
        src/providers/ \
        src/tools/ \
        src/dashboard-api/ \
        src/utils/ \
        dashboard/ \
        scripts/ \
        stateless-channels/ \
        src/discord/monitor/message-handler.process.ts

# 5. Commit
git commit -m "feat: ClawForge — all 7 sessions + code review bug fixes"

# 6. Push
git push origin clawforge
```

### After changes / bug fixes

```bash
git add .
git commit -m "fix: code review — 9 bugs across tracker, routes, commands, tools, config-loader"
git push origin clawforge
```

---

## 4. Setting Up on the Pi

### Prerequisites

On each Pi, you need:

```bash
# Node.js 20+ (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# pnpm
npm install -g pnpm

# better-sqlite3 build deps
sudo apt-get install -y build-essential python3
```

### Option A — Automated deploy (recommended)

After the first `git clone`, use the deploy script for every subsequent update:

```bash
# On the Pi (via SSH or Tailscale):
ssh pi@<tailscale-ip>
cd ~/openclaw

# First time only: make executable
chmod +x scripts/deploy-pi.sh

# Deploy (pulls latest, installs deps, builds, restarts service):
./scripts/deploy-pi.sh

# Skip build if only config changed:
./scripts/deploy-pi.sh --skip-build

# Deploy a specific branch:
./scripts/deploy-pi.sh --branch clawforge
```

The script automatically:
1. `git fetch` + `git reset --hard origin/<branch>`
2. `pnpm install --frozen-lockfile`
3. `pnpm build` (TypeScript) + `pnpm build` in `dashboard/` (Vite)
4. Installs `/etc/systemd/system/clawforge.service`
5. `systemctl daemon-reload && enable && restart`
6. Prints health status

### Option B — Manual first-time setup

```bash
# On the Pi:
git clone https://github.com/YOUR_USERNAME/openclaw.git
cd openclaw
git checkout clawforge
pnpm install
pnpm build

# Build the dashboard:
cd dashboard
pnpm install
pnpm build
cd ..
```

### Config setup (one-time)

```bash
# Create the ClawForge config directory
mkdir -p ~/.openclaw/stateless-channels/channels
mkdir -p ~/.openclaw/stateless-channels/memory
mkdir -p ~/.openclaw/agents

# Copy the example configs from the repo
cp stateless-channels/registry.yaml ~/.openclaw/stateless-channels/
cp stateless-channels/channels/example-channel.yaml \
   ~/.openclaw/stateless-channels/channels/my-channel.yaml
```

Edit the registry to register your Discord channel:

```bash
nano ~/.openclaw/stateless-channels/registry.yaml
```

```yaml
channels:
  "YOUR_DISCORD_CHANNEL_ID":
    config: "my-channel.yaml"
    enabled: true
```

Edit the channel config:

```bash
nano ~/.openclaw/stateless-channels/channels/my-channel.yaml
```

```yaml
channelId: "YOUR_DISCORD_CHANNEL_ID"
mode: "stateless"
enabled: true
provider: "anthropic"
model: "claude-3-5-sonnet-20241022"
memoryFile: "my-channel.md"
historyOnCommand: true
maxMemoryPairs: 20
customPrompt: |
  You are a helpful assistant. The user's saved notes appear in the
  Channel Memory section above. Use them as context.
```

### Starting ClawForge

```bash
# Pi-optimised start (caps RAM at 512 MB, exposes GC):
pnpm start:pi

# Or with systemd (installed by deploy-pi.sh):
sudo systemctl start clawforge
sudo systemctl status clawforge

# View logs:
journalctl -u clawforge -f
```

### Migrating from vanilla OpenClaw

```bash
# Dry run first — see what will change without doing it:
./scripts/migrate-from-openclaw.sh --dry-run

# Run migration:
./scripts/migrate-from-openclaw.sh
```

---

## 5. Slash Commands Reference

All commands work in any Discord channel that is registered as a ClawForge stateless channel.

### Memory Commands

| Command | What it does |
|---------|-------------|
| `/remember <text>` | Saves `<text>` to the channel's memory file. No LLM call — instant reply. |
| `/forget` | Clears **all** memory for this channel. Prompts for confirmation. |
| `/forget <keyword>` | Removes only memory entries matching `<keyword>`. |
| `/memory_N` | One-shot: injects the last N history pairs, then sends to LLM. Example: `/memory_3` injects the 3 most recent exchanges. Stateless mode is bypassed for this single message only. |

Memory is stored as a `.md` file per channel under `~/.openclaw/stateless-channels/memory/`. It is injected into the system prompt on every request.

### Info Commands

| Command | What it does |
|---------|-------------|
| `/status` | Shows channel mode (`stateless` or `standard`), number of memory entries, estimated token count, and current provider/model. No LLM call. |
| `/mode` | Explains how to switch modes. Actual mode change requires editing the channel YAML config (by design — prevents accidental mode switches). |

### Research Command

| Command | What it does |
|---------|-------------|
| `/research <topic>` | Runs a multi-query web research job on `<topic>`. Fetches results from multiple sources in parallel, then either uses the LLM to synthesise a report or falls back to a structured template report. Saves the report as a `.md` file and posts a summary. |

Example:

```
/research quantum computing applications in finance
```

ClawForge will:
1. Generate 3–5 sub-queries from the topic
2. Fetch search results for each in parallel
3. Deduplicate URLs
4. Send all results to the LLM for synthesis
5. Post a summary and save the full report to disk

### Natural Language Triggers (no slash needed)

These phrases automatically save to memory AND also send a normal LLM response:

| Phrase pattern | Example |
|----------------|---------|
| `remember that ...` | "remember that I prefer bullet points" |
| `note that ...` | "note that we're using TypeScript 5" |
| `keep in mind ...` | "keep in mind the deadline is Friday" |
| `don't forget that ...` | "don't forget that I'm in CET timezone" |
| `save this: ...` | "save this: our API base URL is api.example.com" |
| `store this: ...` | "store this: project code is PROJ-42" |
| `i want you to remember ...` | "i want you to remember I'm a backend dev" |
| `please remember ...` | "please remember my name is Dominik" |
| `make a note that ...` | "make a note that we switched to pnpm" |

---

## 6. Dashboard

The React dashboard runs on port **3001** and is accessible over Tailscale.

```
http://<pi-tailscale-ip>:3001
```

### Pages

| Page | Path | What it shows |
|------|------|---------------|
| Overview | `/` | Active task count, budget spend, agent status |
| Tasks | `/tasks` | All tasks with status, assignee, priority filters |
| Agents | `/agents` | Registered agents, pause/resume controls |
| Budget | `/budget` | Per-agent monthly spend vs. limits, cost events |
| Activity | `/activity` | Recent task activity log |

### API Endpoints

The dashboard is backed by a REST API on the same port:

```
GET  /api/tasks          — List tasks (filter by status, assignee, channel)
POST /api/tasks          — Create a task
GET  /api/tasks/:id      — Get task detail
PUT  /api/tasks/:id      — Update task (status, priority, etc.)
POST /api/tasks/:id/comments  — Add a comment
GET  /api/agents         — List agents
GET  /api/budget         — Budget summary
GET  /health             — Health check (returns JSON with memory stats)
WS   /ws                 — Real-time task/agent updates
```

---

## 7. Agent Configuration

Agents are YAML files in `~/.openclaw/agents/`. Example:

```yaml
# ~/.openclaw/agents/researcher.yaml
name: researcher
description: "Researches topics and summarises findings"
model: claude-3-5-sonnet-20241022
provider: anthropic
instructions: |
  You are a research assistant. When given a topic, you search for
  information and produce a clear, concise summary with sources.
  Context: {{context}}
maxTurns: 10
budget:
  monthlyLimitCents: 500000   # $5,000 / month
  pauseOnLimit: true
handoffTo:
  - writer
  - analyst
tools:
  - research
```

Agents can hand off to each other using the `handoffTo` list. During a run, the LLM calls a `transfer_to_<name>` tool to trigger a handoff. The new agent picks up with the same context variables.

---

## 8. Task Lifecycle

Tasks created via the dashboard or agent tools follow this lifecycle:

```
backlog → todo → in_progress → done
                     ↓
                  blocked
                     ↓
                cancelled
```

- `backlog` — newly created, not yet scheduled
- `todo` — promoted by the scheduler, ready to be picked up
- `in_progress` — atomically checked out by an agent (with run lock)
- `done` — completed; checkout lock released
- `blocked` — agent hit an obstacle; can be manually unblocked
- `cancelled` — manually or automatically cancelled

Stale checkouts (in_progress for >30 minutes with no activity) are automatically reset to `todo` by the scheduler.

---

## 9. Budget Limits

Per-agent budget limits are set in each agent's YAML:

```yaml
budget:
  monthlyLimitCents: 100000   # $1,000 / month
  pauseOnLimit: true          # auto-pause agent when limit hit
```

Budget is tracked in `~/.openclaw/clawforge-budget.db` (SQLite). To check current spend:

```bash
# Via dashboard: http://<pi-ip>:3001/budget
# Via API:
curl http://localhost:3001/api/budget
```

---

## 10. Troubleshooting

**Bot not responding in a channel:**
- Check `registry.yaml` — is the channel ID correct?
- Check `systemctl status clawforge` for errors
- Make sure `enabled: true` in the channel config

**`/research` returns "no results":**
- Check that the Pi has outbound internet access
- The research tool uses DuckDuckGo + a fallback template if the LLM call fails

**High memory usage on Pi:**
- MemoryGuard logs warnings at 400 MB RSS and tries GC at 450 MB
- Check: `journalctl -u clawforge | grep "MEMORY"`
- The `--max-old-space-size=512` flag set by `pnpm start:pi` caps V8 heap

**TypeScript build errors:**
- Run `pnpm typecheck` to see all errors
- Make sure you used the bug-fixed versions of: `tracker.ts`, `routes/tasks.ts`, `commands.ts`, `tools.ts`, `config-loader.ts`

**Stale agent checkout (task stuck in `in_progress`):**
- The scheduler auto-resets checkouts older than 30 minutes
- Or manually: `UPDATE tasks SET status='todo', checkout_run_id=NULL, locked_at=NULL WHERE id='<id>'`

---

*Last updated: March 7, 2026 — Post code review, all 9 bugs fixed.*
