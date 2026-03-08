# ClawForge — Complete Installation & Setup Guide

**Last updated:** March 2026
**Hardware target:** Raspberry Pi 4 (4 GB RAM) on Tailscale
**Stack:** OpenClaw + ClawForge + Discord + MiniMax / Anthropic

---

## Table of Contents

1. [What Is This?](#1-what-is-this)
2. [Prerequisites](#2-prerequisites)
3. [Step 1 — Install OpenClaw](#3-step-1--install-openclaw)
4. [Step 2 — Create a Discord Bot](#4-step-2--create-a-discord-bot)
5. [Step 3 — Configure openclaw.json](#5-step-3--configure-opnclawjson)
6. [Step 4 — Set Up the Raspberry Pi](#6-step-4--set-up-the-raspberry-pi)
7. [Step 5 — Deploy ClawForge](#7-step-5--deploy-clawforge)
8. [Step 6 — Create Agent Files](#8-step-6--create-agent-files)
9. [Step 7 — Register Discord Channels](#9-step-7--register-discord-channels)
10. [Step 8 — Access the Dashboard](#10-step-8--access-the-dashboard)
11. [Step 9 — Discord Commands Reference](#11-step-9--discord-commands-reference)
12. [Step 10 — Autonomous Tasks](#12-step-10--autonomous-tasks)
13. [Step 11 — Agent Orchestration & Handoffs](#13-step-11--agent-orchestration--handoffs)
14. [Step 12 — Budget Limits](#14-step-12--budget-limits)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. What Is This?

**OpenClaw** is a self-hosted AI assistant platform that connects LLMs to Discord (and other channels). It handles the bot token, message routing, memory, and plugin system.

**ClawForge** is a plugin for OpenClaw that adds:
- A **task management system** with autonomous agent execution
- A **multi-agent orchestration loop** (agents can hand off to each other)
- A **React dashboard** accessible over your network (port 3001)
- A **per-channel stateless memory** system with slash commands
- A **web research tool** (DuckDuckGo)
- **Budget tracking** (per-agent monthly spend limits)

```
Discord message
     ↓
  OpenClaw  ─── routes to ClawForge ──→ Agent loop ──→ LLM API
     ↑                                       ↓
   reply ←────────────── response ←─────────┘
                              ↓
                         Dashboard (port 3001)
```

---

## 2. Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Raspberry Pi 4 | 4 GB RAM | 2 GB works but is tight |
| Raspberry Pi OS | Bookworm (64-bit) | `aarch64` required |
| Node.js | 20 LTS | Do **not** use Node 22 on Pi |
| pnpm | 10+ | Installed via npm |
| Git | any | Pre-installed on Pi OS |
| Discord account | — | To create a bot |
| MiniMax or Anthropic API key | — | For the LLM |

---

## 3. Step 1 — Install OpenClaw

### 3.1 On the Raspberry Pi

```bash
# SSH into your Pi
ssh pi@<your-pi-ip>

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version   # should print v20.x.x

# Install pnpm
npm install -g pnpm

# Install native build tools (needed for better-sqlite3)
sudo apt-get install -y build-essential python3

# Clone OpenClaw
git clone https://github.com/JP-Lobby/openclaw.git ~/openclaw
cd ~/openclaw

# Install dependencies and start once to generate default config
npm install
npm start
# Press Ctrl+C after it starts — this creates ~/.openclaw/
```

### 3.2 Config directory

OpenClaw creates `~/.openclaw/` on first run. Check it exists:

```bash
ls ~/.openclaw/
# You should see: openclaw.json  workspace/
```

---

## 4. Step 2 — Create a Discord Bot

### 4.1 Create the application

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. Click **New Application** → give it a name (e.g. `ClawForge`)
3. Go to **Bot** tab → click **Add Bot**
4. Under **Privileged Gateway Intents**, enable:
   - ✅ **Message Content Intent** ← required to read messages
   - ✅ Server Members Intent (optional but recommended)
5. Copy the **Bot Token** — you will need it for `openclaw.json`

### 4.2 Invite the bot to your server

1. Go to **OAuth2 → URL Generator**
2. Scopes: ✅ `bot`
3. Bot Permissions: ✅ `Send Messages`, ✅ `Read Message History`, ✅ `Read Messages/View Channels`
4. Copy the generated URL → open it in browser → select your server → **Authorize**

### 4.3 Get your Discord channel IDs

You need channel IDs to register channels in ClawForge.

1. In Discord: **User Settings → Advanced → Enable Developer Mode**
2. Right-click any channel → **Copy Channel ID**

Save these IDs — you will use them in Step 7.

---

## 5. Step 3 — Configure the Config Files

> **Important:** ClawForge uses **two separate config files** that live side by side in `~/.openclaw/`.
> OpenClaw validates its own file strictly and will reject unrecognised keys — so ClawForge keeps its config completely separate.
>
> | File | Owner | Purpose |
> |------|-------|---------|
> | `~/.openclaw/openclaw.json` | OpenClaw | Bot token, channels, gateway, models, plugins |
> | `~/.openclaw/clawforge.json` | ClawForge | Dashboard, orchestration, tasks/scheduler |

### 5.1 Edit `~/.openclaw/openclaw.json` (OpenClaw keys only)

Replace the placeholder values:
- `YOUR_MINIMAX_API_KEY` — from [minimax.io](https://www.minimax.io/) API keys
- `YOUR_DISCORD_BOT_TOKEN` — from Step 2.1 above
- `YOUR_GATEWAY_TOKEN` — keep your existing token if you have one

```json
{
  "meta": {
    "lastTouchedVersion": "2026.3.2",
    "lastTouchedAt": "2026-03-07T21:34:01.385Z"
  },
  "auth": {
    "profiles": {
      "minimax:default": {
        "provider": "minimax",
        "mode": "api_key"
      }
    }
  },
  "models": {
    "mode": "merge",
    "providers": {
      "minimax": {
        "baseUrl": "https://api.minimax.io/anthropic",
        "api": "anthropic-messages",
        "authHeader": true,
        "models": [
          {
            "id": "MiniMax-M2.5",
            "name": "MiniMax M2.5",
            "reasoning": true,
            "input": ["text"],
            "cost": { "input": 0.3, "output": 1.2, "cacheRead": 0.03, "cacheWrite": 0.12 },
            "contextWindow": 200000,
            "maxTokens": 8192
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": { "primary": "minimax/MiniMax-M2.5" },
      "workspace": "/home/pi-2/.openclaw/workspace"
    }
  },
  "tools": { "profile": "messaging" },
  "commands": { "native": "auto", "nativeSkills": "auto", "restart": true },
  "session": { "dmScope": "per-channel-peer" },
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "boot-md": { "enabled": true },
        "command-logger": { "enabled": true },
        "bootstrap-extra-files": { "enabled": true },
        "session-memory": { "enabled": true }
      }
    }
  },
  "channels": {
    "discord": {
      "enabled": true,
      "token": "YOUR_DISCORD_BOT_TOKEN",
      "groupPolicy": "open",
      "streaming": "off"
    }
  },
  "gateway": {
    "port": 18789,
    "mode": "local",
    "bind": "loopback",
    "auth": { "mode": "token", "token": "YOUR_GATEWAY_TOKEN" },
    "tailscale": { "mode": "off", "resetOnExit": false }
  },
  "skills": { "install": { "nodeManager": "npm" } },
  "plugins": { "entries": { "discord": { "enabled": true } } }
}
```

### 5.2 Create `~/.openclaw/clawforge.json` (ClawForge keys)

Replace the placeholder values:
- `YOUR_MINIMAX_API_KEY` — same key as above
- `YOUR_DASHBOARD_TOKEN` — make up any long random string (e.g. `openssl rand -hex 32`)

```json
{
  "orchestration": {
    "enabled": true,
    "agentsDir": "/home/pi-2/.openclaw/agents",
    "providers": {
      "anthropic": {
        "baseUrl": "https://api.minimax.io/anthropic",
        "apiKey": "YOUR_MINIMAX_API_KEY",
        "defaultModel": "MiniMax-M2.5"
      }
    }
  },
  "tasks": {
    "enabled": true,
    "dbPath": "/home/pi-2/.openclaw/data/tasks.db",
    "autonomous": {
      "enabled": true,
      "heartbeatIntervalMs": 60000,
      "maxConcurrentTasks": 1,
      "maxRequestDepth": 3
    }
  },
  "dashboard": {
    "enabled": true,
    "port": 3001,
    "host": "0.0.0.0",
    "authToken": "YOUR_DASHBOARD_TOKEN"
  }
}
```

> **Note on the `anthropic` provider name:** ClawForge's built-in provider is called `anthropic` and uses the Anthropic messages API format. Since MiniMax is fully Anthropic-API-compatible, we configure it under the `anthropic` key with MiniMax's `baseUrl`. In your agent YAML files you will write `provider: anthropic` and it will route through MiniMax.

> **Want real Anthropic?** Remove the `baseUrl` field and set `apiKey` to your `sk-ant-...` key from [console.anthropic.com](https://console.anthropic.com).

After editing, restart both services:
```bash
npx openclaw gateway restart   # picks up openclaw.json changes
sudo systemctl restart clawforge  # picks up clawforge.json changes
```

### 5.3 Migrating an existing install

If you previously ran ClawForge before this change, your `openclaw.json` may contain `orchestration`, `tasks`, and `dashboard` keys that OpenClaw now rejects. Run this one-liner to split them out automatically:

```bash
node -e "
const fs = require('fs'), os = require('os'), path = require('path');
const dir = path.join(os.homedir(), '.openclaw');
const src = JSON.parse(fs.readFileSync(path.join(dir, 'openclaw.json'), 'utf8'));
const cf = { dashboard: src.dashboard, orchestration: src.orchestration, tasks: src.tasks };
fs.writeFileSync(path.join(dir, 'clawforge.json'), JSON.stringify(cf, null, 2));
['dashboard','orchestration','tasks'].forEach(k => delete src[k]);
fs.writeFileSync(path.join(dir, 'openclaw.json'), JSON.stringify(src, null, 2));
console.log('Done — clawforge.json written, openclaw.json cleaned.');
"
```

Then restart both services as shown above.

---

## 6. Step 4 — Set Up the Raspberry Pi

### 6.1 Install Tailscale — REQUIRED for secure remote access

> **Security note:** The ClawForge dashboard binds to `0.0.0.0:3001`. **Never expose this port to the internet.** Access it ONLY via Tailscale — this is the recommended and intended access method.

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
# Follow the auth URL it prints — log in with your Tailscale account
tailscale ip -4   # prints your Pi's Tailscale IP, e.g. 100.65.59.79
```

Install Tailscale on your laptop/desktop too so you can reach the Pi from anywhere.

### 6.2 Clone ClawForge

```bash
cd ~
git clone https://github.com/JP-Lobby/ClawForge.git
cd ClawForge
git checkout clawforge
```

### 6.3 Run the onboarding wizard

The onboard script sets your dashboard auth token, creates all required directories, and writes ClawForge's config to `~/.openclaw/clawforge.json` — it **never touches** `openclaw.json`:

```bash
bash scripts/onboard.sh
```

It will:
- Verify `~/.openclaw/openclaw.json` exists (OpenClaw's file — read-only for ClawForge)
- Prompt you for a dashboard auth token (or auto-generate one)
- Create all required directories (`agents/`, `stateless-channels/`, `data/`)
- Write/merge ClawForge sections into `~/.openclaw/clawforge.json`
- Print your Tailscale IP and dashboard URL when done

---

## 7. Step 5 — Deploy ClawForge

Run the deploy script. It handles everything: install deps, build TypeScript, build dashboard, install and start the systemd service.

```bash
cd ~/ClawForge
sudo bash scripts/deploy-pi.sh
```

When it finishes you should see:
```
==> ✅ ClawForge is running!
==> Dashboard: http://192.168.1.x:3001
```

### Useful commands after deploy

```bash
# Check service status
systemctl status clawforge

# Watch live logs
journalctl -u clawforge -f

# Restart after config changes
sudo systemctl restart clawforge

# Redeploy after a code update
cd ~/ClawForge && git pull && sudo bash scripts/deploy-pi.sh

# Skip build if only config/YAML files changed
sudo bash scripts/deploy-pi.sh --skip-build
```

### Register Discord slash commands

So that `/research`, `/remember`, `/forget`, `/status`, `/task`, and `/memory_n` appear in Discord's `/` autocomplete:

```bash
pnpm tsx scripts/register-discord-commands.ts
```

The script reads your bot token from `~/.openclaw/openclaw.json`, prompts for your Application ID and Guild (Server) ID, then registers all commands via the Discord API. Commands appear in Discord within a few minutes.

Get your Application ID from [Discord Developer Portal](https://discord.com/developers/applications) → select your app → General Information.

---

## 8. Step 6 — Create Agent Files

Agents are YAML files in `~/.openclaw/agents/`. You can create/edit/delete agents directly from the **Agents** tab in the dashboard, or by editing YAML files manually. Each file defines one AI agent with its model, instructions, and tools.

### Minimal agent (no tools)

```bash
nano ~/.openclaw/agents/assistant.yaml
```

```yaml
name: assistant
description: General-purpose assistant
provider: anthropic
model: MiniMax-M2.5
maxTurns: 10
tools: []
instructions: |
  You are a helpful assistant in a Discord server.
  Channel: {{channelId}} | User: {{senderName}}
  Be concise — Discord messages should be brief.
```

### Triage agent (routes to specialists)

```bash
nano ~/.openclaw/agents/triage.yaml
```

```yaml
name: triage
description: Classifies messages and routes to the right specialist
provider: anthropic
model: MiniMax-M2.5
maxTurns: 10
tools:
  - create_task
  - list_my_tasks
  - update_task_status
handoffTo:
  - researcher
  - coder
instructions: |
  You are a Triage agent. User: {{senderName}} | Channel: {{channelId}}

  Route like this:
  - Simple questions → answer directly
  - Needs web research or current info → transfer_to_researcher
  - Code help, debugging → transfer_to_coder
  - Task creation/tracking → use task tools

  Be brief. Discord has character limits.
```

### Researcher agent (uses web search)

```bash
nano ~/.openclaw/agents/researcher.yaml
```

```yaml
name: researcher
description: Web research specialist — finds and summarises information
provider: anthropic
model: MiniMax-M2.5
maxTurns: 15
tools:
  - research
  - create_task
  - complete_task
  - list_my_tasks
canPickTasks: true
taskPriorities:
  - critical
  - high
instructions: |
  You are a Researcher. User: {{senderName}}

  Use the research tool to find accurate, current information.
  Always cite your sources. Acknowledge uncertainty when sources conflict.
  Synthesise findings into clear Markdown — use headers and bullet points.

  For autonomous tasks: call complete_task with a summary when done.
```

### Coder agent

```bash
nano ~/.openclaw/agents/coder.yaml
```

```yaml
name: coder
description: Code writing and debugging — TypeScript, Python, Bash, SQL
provider: anthropic
model: MiniMax-M2.5
maxTurns: 20
tools:
  - create_task
  - complete_task
canPickTasks: false
instructions: |
  You are a Coder agent. Write clean, correct, well-typed code.

  Preferred stack: TypeScript (Node.js ESM), Python 3, Bash, SQLite.
  Pi constraints: avoid memory-intensive operations.

  Format every response:
  1. One-sentence explanation of what you're doing
  2. Code block with syntax highlighting
  3. Usage example
  4. Any caveats or gotchas
```

### Agent field reference

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ | Unique ID — filename must match (`triage.yaml` → `name: triage`) |
| `description` | ✅ | Shown in handoff tool descriptions |
| `provider` | ✅ | Always `anthropic` (routes to MiniMax via your config) |
| `model` | ✅ | `MiniMax-M2.5` (or any model ID in your providers config) |
| `instructions` | ✅ | System prompt. `{{channelId}}`, `{{senderName}}`, `{{userId}}` are auto-injected |
| `maxTurns` | ✅ | Max loop iterations before giving up |
| `tools` | ✅ | List of tools the agent can call (see table below) |
| `handoffTo` | ❌ | Agent names this agent can hand off to |
| `canPickTasks` | ❌ | `true` = picks up autonomous tasks from queue |
| `taskPriorities` | ❌ | Which priorities to pick: `critical`, `high`, `medium`, `low` |
| `budgetMonthlyCents` | ❌ | Monthly spend cap in cents (5000 = $50.00) |

### Available tools

| Tool name | What it does |
|-----------|-------------|
| `research` | DuckDuckGo web search — returns summarised results |
| `create_task` | Creates a task in the task database |
| `list_my_tasks` | Lists tasks assigned to this agent |
| `update_task_status` | Updates status of a task |
| `complete_task` | Marks a task done with a completion summary |

---

## 9. Step 7 — Register Discord Channels

### 9.1 Create the registry

```bash
nano ~/.openclaw/stateless-channels/registry.yaml
```

Map each Discord channel ID to a config file:

```yaml
channels:
  "1234567890123456789":        # your channel ID (right-click → Copy Channel ID)
    config: "general.yaml"
    enabled: true

  "9876543210987654321":        # a second channel (optional)
    config: "research.yaml"
    enabled: true
```

### 9.2 Create channel config files

**Simple channel — memory only, no agents:**

```bash
nano ~/.openclaw/stateless-channels/channels/general.yaml
```

```yaml
channelId: "1234567890123456789"
mode: stateless
enabled: true
memoryFile: "general.md"
historyOnCommand: true
maxMemoryPairs: 20
customPrompt: |
  You are a helpful assistant. Stored notes appear in the
  Channel Memory section above — use them as context.
  Be concise — this is Discord.
```

**Channel with agent orchestration:**

```bash
nano ~/.openclaw/stateless-channels/channels/research.yaml
```

```yaml
channelId: "9876543210987654321"
mode: stateless
enabled: true
memoryFile: "research.md"
historyOnCommand: false
maxMemoryPairs: 10

orchestration:
  agent: triage
  maxTurns: 25
  context:
    channelType: research
```

Restart ClawForge to pick up the new channels:
```bash
sudo systemctl restart clawforge
```

### Channel field reference

| Field | Required | Description |
|-------|----------|-------------|
| `channelId` | ✅ | Discord channel ID (must match the key in registry.yaml) |
| `mode` | ✅ | `stateless` — no auto-history (recommended). `standard` — full history |
| `enabled` | ✅ | Set to `false` to pause a channel without deleting it |
| `memoryFile` | ✅ | Filename for memory storage (auto-created in `memory/`) |
| `historyOnCommand` | ✅ | Allow `/memory_N` command to inject history |
| `maxMemoryPairs` | ✅ | Max history pairs injectable via `/memory_N` |
| `provider` | ❌ | Override the global provider for this channel only |
| `model` | ❌ | Override the global model for this channel only |
| `customPrompt` | ❌ | Appended to every system prompt in this channel |
| `orchestration.agent` | ❌ | Entry agent name (enables multi-turn agent loop) |
| `orchestration.maxTurns` | ❌ | Overrides the agent's own `maxTurns` |
| `orchestration.context` | ❌ | Extra `{{variables}}` injected into agent instructions |

---

## 10. Step 8 — Access the Dashboard

Open in your browser:
```
http://<your-pi-tailscale-ip>:3001
```

Example: `http://100.65.59.79:3001`

### Set the auth token (first visit only)

1. Navigate to **Settings** (bottom of the left sidebar)
2. Enter your `authToken` from `~/.openclaw/clawforge.json`
3. Click **Save** — stored in your browser, never re-asked

### Dashboard pages

| Page | What it shows |
|------|---------------|
| **Dashboard** | Overview: task counts, agent status, recent activity, budget gauges |
| **Tasks** | Full task list with status filters and inline create |
| **Agents** | All registered agents, reload button per agent |
| **Memory** | Per-channel memory editor — view and edit stored notes |
| **Channels** | Channel config viewer (read-only — edit YAML files to change) |
| **Research** | Browse and read saved research reports |
| **Activity** | Global event log — every LLM call, handoff, task change |
| **Budget** | Per-agent monthly spend gauges |
| **Settings** | API URL and auth token configuration |

The dashboard updates in real time via WebSocket — no need to refresh.

---

## 11. Step 9 — Discord Commands Reference

All commands work in any registered channel.

### Memory commands

| Command | What it does |
|---------|-------------|
| `/remember <text>` | Saves text to this channel's memory. Instant, no LLM call. |
| `/forget` | Clears ALL memory for this channel. |
| `/forget <keyword>` | Removes only entries containing `keyword`. |
| `/memory_3` | One-shot: injects last 3 conversation pairs as context for this message only. Use any number: `/memory_1`, `/memory_5`, `/memory_10` etc. |
| `/status` | Shows: channel mode, memory entry count, token estimate, current provider/model. |

### Task commands

| Command | Example |
|---------|---------|
| `/task create <title>` | `/task create Fix login bug --priority high` |
| `/task list` | `/task list` — shows active tasks |
| `/task list --all` | Shows every task including done/cancelled |
| `/task done <id>` | `/task done abc123` |
| `/task promote <id>` | Moves task from `backlog` → `todo` (makes it eligible for agent pickup) |
| `/task assign <id> <agent>` | `/task assign abc123 researcher` |
| `/task status <id>` | Shows full task detail |
| `/task stats` | Shows counts by status |

### Natural language memory triggers

These phrases **automatically save to memory** and also send a normal LLM reply:

```
"remember that I prefer TypeScript over JavaScript"
"note that our API endpoint is api.example.com"
"keep in mind I'm in the CET timezone"
"don't forget that the Pi IP is 100.65.59.79"
"save this: admin password is hunter2"
"store this: project code is PROJ-42"
"please remember my name is Dominik"
"make a note that we switched to pnpm"
```

Memory is stored as Markdown in `~/.openclaw/stateless-channels/memory/<channel>.md` and injected into every subsequent system prompt for that channel.

---

## 12. Step 10 — Autonomous Tasks

Agents with `canPickTasks: true` automatically pick up tasks from the queue without any Discord message being required.

### How it works

```
You create a task → it starts in 'backlog'
       ↓
/task promote <id>  → moves to 'todo'
       ↓
Scheduler (every 60s) → finds 'todo' task matching agent's taskPriorities
       ↓
Agent picks it up → status becomes 'in_progress'
       ↓
Agent calls complete_task → status becomes 'done'
```

### Create a task for autonomous processing

In Discord:
```
/task create Research the latest developments in quantum computing --priority high
```

Then promote it:
```
/task promote <id shown in reply>
```

Your `researcher` agent (if `canPickTasks: true`) will pick it up within the next scheduler tick (60 seconds by default) and post the result.

### Monitor via dashboard

Open the **Tasks** page — you'll see the task move through `todo → in_progress → done` in real time. The **Activity** page shows every step the agent took.

### Adjust heartbeat interval

In `~/.openclaw/clawforge.json` (or via the **Scheduler** page in the dashboard):
```json
"tasks": {
  "autonomous": {
    "heartbeatIntervalMs": 30000,
    "maxConcurrentTasks": 2
  }
}
```

---

## 13. Step 11 — Agent Orchestration & Handoffs

When a channel has an `orchestration` section, every incoming Discord message is routed through a full agent loop instead of a single LLM call.

### How handoffs work

An agent's `handoffTo` list creates special tools named `transfer_to_<agentname>`. When the LLM decides to call `transfer_to_researcher`, ClawForge:
1. Stops the current agent's loop
2. Switches to the `researcher` agent
3. Passes the full conversation history
4. Continues running from turn 1 of the new agent

Example flow:
```
User: "What are the latest AI developments?"
  → triage agent starts
  → triage calls transfer_to_researcher (reason: "needs current info")
  → researcher starts, calls research tool
  → researcher returns a summary
  → reply sent to Discord
```

### Context variables

Anything in `orchestration.context` in the channel YAML becomes available as `{{variable}}` in agent instructions:

```yaml
orchestration:
  agent: triage
  context:
    project: "MyStartup"
    language: "TypeScript"
```

In `triage.yaml`:
```yaml
instructions: |
  You assist with the {{project}} project.
  Preferred language: {{language}}.
  User: {{senderName}}
```

Auto-injected variables (always available):
- `{{channelId}}` — Discord channel ID
- `{{senderName}}` — Discord username
- `{{userId}}` — Discord user ID

---

## 14. Step 12 — Budget Limits

Prevent runaway costs by setting per-agent monthly limits.

### Set a limit

In the agent YAML:
```yaml
budgetMonthlyCents: 5000    # $50.00 per month
```

When the agent exceeds this limit, it is automatically **paused**. The dashboard shows this on the Budget and Agents pages. To unpause, increase the limit or reset via the dashboard.

### View current spend

```bash
# Via dashboard: http://<pi-ip>:3001 → Budget page
# Via API:
curl http://localhost:3001/api/budget
```

Response:
```json
{
  "agents": [
    { "agentId": "researcher", "spendCents": 312, "limitCents": 5000, "paused": false }
  ],
  "providers": [
    { "provider": "anthropic", "spendCents": 312 }
  ]
}
```

Budget is tracked in `~/.openclaw/clawforge-budget.db` (SQLite, resets at start of each month).

---

## 15. Troubleshooting

### Bot not responding in a channel

```bash
# Check the service is running
systemctl status clawforge

# Check logs for errors
journalctl -u clawforge -n 50

# Make sure the channel ID in registry.yaml is correct
# (right-click the channel in Discord → Copy Channel ID)
# Make sure enabled: true in both registry.yaml and the channel config
```

### Dashboard shows blank page

```bash
# Check service is running
systemctl status clawforge

# Check port is open
ss -tlnp | grep 3001

# Test health endpoint
curl http://localhost:3001/health
```

If you see the dark background but no content: enter your `authToken` in Settings.

### better-sqlite3 fails to load

```bash
# Rebuild the native binary
cd ~/ClawForge
pnpm rebuild better-sqlite3

# Restart
sudo systemctl restart clawforge
```

### `openclaw` reports "Unrecognized keys: orchestration, tasks, dashboard"

ClawForge keys must live in `clawforge.json`, not `openclaw.json`. Run the migration one-liner to split them out:

```bash
node -e "
const fs = require('fs'), os = require('os'), path = require('path');
const dir = path.join(os.homedir(), '.openclaw');
const src = JSON.parse(fs.readFileSync(path.join(dir, 'openclaw.json'), 'utf8'));
const cf = { dashboard: src.dashboard, orchestration: src.orchestration, tasks: src.tasks };
fs.writeFileSync(path.join(dir, 'clawforge.json'), JSON.stringify(cf, null, 2));
['dashboard','orchestration','tasks'].forEach(k => delete src[k]);
fs.writeFileSync(path.join(dir, 'openclaw.json'), JSON.stringify(src, null, 2));
console.log('Done.');
"
npx openclaw gateway restart
sudo systemctl restart clawforge
```

### Permission errors on git pull

```bash
# Fix if sudo previously ran git commands
sudo chown -R pi-2:pi-2 ~/ClawForge/.git
```

### High memory on Pi

```bash
# Check memory usage
journalctl -u clawforge | grep -i memory

# MemoryGuard warns at 400 MB RSS and triggers GC at 450 MB
# The systemd service caps at 600 MB — if it keeps OOMing, lower maxConcurrentTasks to 1
```

### Task stuck in `in_progress`

Tasks stuck for more than 30 minutes are auto-reset to `todo` by the scheduler. To reset manually:

```bash
sqlite3 ~/.openclaw/clawforge-tasks.db \
  "UPDATE tasks SET status='todo', locked_at=NULL WHERE id='YOUR_TASK_ID';"
```

### Agent not picking up tasks

- Check `canPickTasks: true` is set in the agent YAML
- Check `taskPriorities` includes the task's priority level
- Check the agent isn't paused (Budget page in dashboard)
- Check `tasks.autonomous.enabled: true` in `~/.openclaw/clawforge.json`
- Promote the task: `/task promote <id>` (tasks start in `backlog`, agents only pick from `todo`)

### Check if a channel is registered

```bash
curl http://localhost:3001/api/channels
```

Look for your channel ID in the response. If it's missing, check `registry.yaml` and restart ClawForge.

---

## Quick Reference Card

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CLAWFORGE QUICK REFERENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Config files:
    ~/.openclaw/openclaw.json          OpenClaw config (bot token, channels, gateway)
    ~/.openclaw/clawforge.json         ClawForge config (dashboard, orchestration, tasks)
    ~/.openclaw/agents/*.yaml          agent definitions
    ~/.openclaw/stateless-channels/
      registry.yaml                    channel → config map
      channels/*.yaml                  per-channel config
      memory/*.md                      per-channel memory

  Service:
    sudo systemctl restart clawforge
    journalctl -u clawforge -f
    curl http://localhost:3001/health

  Dashboard:
    http://<pi-tailscale-ip>:3001

  Discord memory:
    /remember <text>    save to memory
    /forget             clear all memory
    /memory_3           inject last 3 history pairs
    /status             show channel info

  Discord tasks:
    /task create <title> [--priority high]
    /task list [--all]
    /task promote <id>
    /task done <id>
    /task stats

  Redeploy:
    cd ~/ClawForge && git pull && sudo bash scripts/deploy-pi.sh
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
