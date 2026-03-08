# ClawForge — Complete Installation & Setup Guide

**Last updated:** March 2026
**Hardware target:** Raspberry Pi 4 (4 GB RAM) on Tailscale
**Stack:** OpenClaw + ClawForge + Discord + MiniMax / Anthropic

---

## Table of Contents

1. [What Is This?](#1-what-is-this)
2. [Before You Start — Collect Your Credentials](#2-before-you-start--collect-your-credentials)
3. [Step 1 — Flash Pi OS & Enable SSH](#3-step-1--flash-pi-os--enable-ssh)
4. [Step 2 — Install Tailscale on the Pi](#4-step-2--install-tailscale-on-the-pi)
5. [Step 3 — Install Node.js & OpenClaw](#5-step-3--install-nodejs--openclaw)
6. [Step 4 — Clone & Deploy ClawForge](#6-step-4--clone--deploy-clawforge)
7. [Step 5 — Create Agents](#7-step-5--create-agents)
8. [Step 6 — Register Discord Channels](#8-step-6--register-discord-channels)
9. [Step 7 — Access the Dashboard](#9-step-7--access-the-dashboard)
10. [Step 8 — Discord Commands Reference](#10-step-8--discord-commands-reference)
11. [Step 9 — Autonomous Tasks](#11-step-9--autonomous-tasks)
12. [Step 10 — Agent Orchestration & Handoffs](#12-step-10--agent-orchestration--handoffs)
13. [Troubleshooting](#13-troubleshooting)

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

## 2. Before You Start — Collect Your Credentials

Do these two things **on your laptop** before touching the Pi. You will need both values during the OpenClaw onboarding wizard in Step 3.

### 2.1 Create a Discord Bot

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. Click **New Application** → give it a name (e.g. `ClawForge`)
3. Go to **Bot** → click **Add Bot**
4. Under **Privileged Gateway Intents**, enable:
   - ✅ **Message Content Intent** ← required
   - ✅ Server Members Intent (recommended)
5. Click **Reset Token** → copy and save the bot token

### 2.2 Invite the bot to your server

1. Go to **OAuth2 → URL Generator**
2. Scopes: ✅ `bot`
3. Bot Permissions: ✅ `Send Messages`, ✅ `Read Message History`, ✅ `Read Messages/View Channels`
4. Copy the generated URL → open in browser → select your server → **Authorize**

### 2.3 Get channel IDs

You will need these in Step 6.

1. In Discord: **User Settings → Advanced → Enable Developer Mode**
2. Right-click any channel → **Copy Channel ID**

### 2.4 Get an API key

Pick one:
- **MiniMax** — [minimax.io](https://www.minimax.io/) (fully Anthropic-API-compatible, good value)
- **Anthropic** — [console.anthropic.com](https://console.anthropic.com) (real Claude models)

---

## 3. Step 1 — Flash Pi OS & Enable SSH

> **Do this first.** Tailscale goes on the Pi in Step 2 so you can do the entire rest of the setup remotely over SSH — no keyboard/monitor needed after that.

### 3.1 Flash with Pi Imager

1. Download **Raspberry Pi Imager** from [raspberrypi.com/software](https://www.raspberrypi.com/software/)
2. Choose OS: **Raspberry Pi OS Lite (64-bit)** — no desktop needed
3. Click the ⚙️ **gear icon** (Advanced Options) before writing:
   - ✅ **Enable SSH** → *Use password authentication*
   - ✅ **Set username and password** → e.g. `pi-2` / your password
   - ✅ **Configure WiFi** (if not using ethernet)
   - ✅ **Set locale / timezone**
4. Write to SD card, insert into Pi, power on

### 3.2 Find the Pi's local IP

```bash
# From your laptop
ping raspberrypi.local   # works if mDNS is available

# Or check your router's DHCP table
# Or: nmap -sn 192.168.1.0/24 | grep -A1 Raspberry
```

### 3.3 First SSH connection (local network — temporary)

```bash
ssh pi-2@<pi-local-ip>
# Accept the fingerprint, enter your password
```

---

## 4. Step 2 — Install Tailscale on the Pi

> After this step you can close the local SSH session and do everything else from anywhere. You will never need to be on the same network as the Pi again.

```bash
# On the Pi:
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
# Opens an auth URL — open it in your browser and log in
```

```bash
tailscale ip -4   # prints something like 100.65.59.79 — save this
```

Install Tailscale on your **laptop** too:
- [tailscale.com/download](https://tailscale.com/download) — log in with the same account

Switch to Tailscale SSH:
```bash
ssh pi-2@100.65.59.79   # use your Tailscale IP from above
```

All remaining commands run over Tailscale. The Pi can be anywhere.

---

## 5. Step 3 — Install Node.js & OpenClaw

```bash
# Build tools (required for better-sqlite3)
sudo apt-get update
sudo apt-get install -y build-essential python3 git lsof

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify — must be v20.x.x, do NOT use v22+
node --version

# pnpm
npm install -g pnpm

# OpenClaw
curl -fsSL https://openclaw.ai/install.sh | bash
```

Now run the **OpenClaw onboarding wizard**. Have your Discord bot token and API key ready — it will ask for them and write `~/.openclaw/openclaw.json` for you:

```bash
npx openclaw
```

Follow the prompts. When it finishes:
```bash
ls ~/.openclaw/
# openclaw.json  workspace/
```

> **Note:** All OpenClaw CLI commands use `npx openclaw <command>`.

---

## 6. Step 4 — Clone & Deploy ClawForge

### 6.1 Clone the repo

```bash
cd ~
git clone https://github.com/JP-Lobby/ClawForge.git
cd ClawForge
git checkout clawforge
```

### 6.2 Run the ClawForge onboarding wizard

This creates `~/.openclaw/clawforge.json`, sets up all required directories, and prints your dashboard URL. It never touches `openclaw.json`.

```bash
bash scripts/onboard.sh
```

It will:
- Check that `~/.openclaw/openclaw.json` exists
- Prompt for a dashboard auth token (or auto-generate one)
- Create `~/.openclaw/agents/`, `~/.openclaw/stateless-channels/`, and the data directory
- Write `~/.openclaw/clawforge.json`
- Print your dashboard URL

> **Security note:** The dashboard binds to `0.0.0.0:3001`. **Never expose port 3001 to the internet.** Access it only via Tailscale.

### 6.3 Deploy

```bash
sudo bash scripts/deploy-pi.sh
```

This installs dependencies, compiles TypeScript, builds the dashboard, and installs + starts the systemd service. When it finishes:

```
==> ✅ ClawForge is running!
==> Dashboard: http://<your-tailscale-ip>:3001
```

### 6.4 Register Discord slash commands

So that `/remember`, `/forget`, `/task`, `/status`, `/memory_N` etc. appear in Discord's `/` autocomplete:

```bash
pnpm tsx scripts/register-discord-commands.ts
```

The script reads your bot token from `openclaw.json`, then asks for your **Application ID** and **Guild (Server) ID** (both found in the [Discord Developer Portal](https://discord.com/developers/applications)). Commands appear in Discord within a few minutes.

### Useful service commands

```bash
systemctl status clawforge          # check if running
journalctl -u clawforge -f          # live logs
sudo systemctl restart clawforge    # restart after config changes

# Redeploy after a code update:
cd ~/ClawForge && git pull && sudo bash scripts/deploy-pi.sh

# Skip rebuild if only YAML/config files changed:
sudo bash scripts/deploy-pi.sh --skip-build
```

---

## 7. Step 5 — Create Agents

**Easiest: use the dashboard** — go to **Agents → New Agent**, fill the form, hit Save. The YAML is written automatically.

Or create files manually in `~/.openclaw/agents/`:

### Minimal agent

```yaml
# ~/.openclaw/agents/assistant.yaml
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

```yaml
# ~/.openclaw/agents/triage.yaml
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

### Researcher agent

```yaml
# ~/.openclaw/agents/researcher.yaml
name: researcher
description: Web research specialist
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
  Always cite your sources. Synthesise findings into clear Markdown.

  For autonomous tasks: call complete_task with a summary when done.
```

### Coder agent

```yaml
# ~/.openclaw/agents/coder.yaml
name: coder
description: Code writing and debugging
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
```

> **Using Anthropic instead of MiniMax?** Set `model` to a real Claude model ID (e.g. `claude-haiku-4-5-20251001`). The `provider: anthropic` key always routes to whichever `baseUrl` and `apiKey` you configured during onboarding.

### Agent field reference

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ | Unique ID — filename must match (`triage.yaml` → `name: triage`) |
| `description` | ✅ | Shown in handoff tool descriptions |
| `provider` | ✅ | Always `anthropic` |
| `model` | ✅ | Model ID (e.g. `MiniMax-M2.5` or `claude-haiku-4-5-20251001`) |
| `instructions` | ✅ | System prompt. `{{channelId}}`, `{{senderName}}`, `{{userId}}` auto-injected |
| `maxTurns` | ✅ | Max loop iterations before stopping |
| `tools` | ✅ | List of tools the agent can call |
| `handoffTo` | ❌ | Agent names this agent can hand off to |
| `canPickTasks` | ❌ | `true` = picks autonomous tasks from the queue |
| `taskPriorities` | ❌ | Which task priorities to pick: `critical`, `high`, `medium`, `low` |
| `budgetMonthlyCents` | ❌ | Monthly spend cap in cents (e.g. `5000` = $50.00) |

### Available tools

| Tool | What it does |
|------|-------------|
| `research` | DuckDuckGo web search — summarised results |
| `create_task` | Creates a task in the database |
| `list_my_tasks` | Lists tasks assigned to this agent |
| `update_task_status` | Updates a task's status |
| `complete_task` | Marks a task done with a summary |

After creating or editing any YAML file, restart ClawForge:
```bash
sudo systemctl restart clawforge
```

---

## 8. Step 6 — Register Discord Channels

### 8.1 Create the registry

```bash
nano ~/.openclaw/stateless-channels/registry.yaml
```

```yaml
channels:
  "1234567890123456789":        # your channel ID
    config: "general.yaml"
    enabled: true

  "9876543210987654321":        # optional second channel
    config: "research.yaml"
    enabled: true
```

### 8.2 Create channel config files

**Simple channel — no agents, memory only:**

```yaml
# ~/.openclaw/stateless-channels/channels/general.yaml
channelId: "1234567890123456789"
mode: stateless
enabled: true
memoryFile: "general.md"
historyOnCommand: true
maxMemoryPairs: 20
customPrompt: |
  You are a helpful assistant. Notes stored in Channel Memory
  appear above — use them as context. Be concise — this is Discord.
```

**Channel with agent orchestration:**

```yaml
# ~/.openclaw/stateless-channels/channels/research.yaml
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

```bash
sudo systemctl restart clawforge
```

### Channel field reference

| Field | Required | Description |
|-------|----------|-------------|
| `channelId` | ✅ | Discord channel ID |
| `mode` | ✅ | `stateless` (recommended) or `standard` |
| `enabled` | ✅ | `false` pauses the channel without deleting it |
| `memoryFile` | ✅ | Filename in `memory/` (auto-created) |
| `historyOnCommand` | ✅ | Allow `/memory_N` to inject history |
| `maxMemoryPairs` | ✅ | Max pairs injectable via `/memory_N` |
| `customPrompt` | ❌ | Appended to every system prompt in this channel |
| `orchestration.agent` | ❌ | Entry agent name (enables multi-turn agent loop) |
| `orchestration.maxTurns` | ❌ | Overrides the agent's own `maxTurns` |
| `orchestration.context` | ❌ | Extra `{{variables}}` injected into agent instructions |

---

## 9. Step 7 — Access the Dashboard

Open in your browser:
```
http://<your-pi-tailscale-ip>:3001
```

### First visit: enter your auth token

1. Go to **Settings** (bottom of the sidebar)
2. Enter the `authToken` from `~/.openclaw/clawforge.json`
3. Click **Save** — stored in your browser, never re-asked

### Dashboard pages

| Page | What it does |
|------|-------------|
| **Dashboard** | Agent status cards, pinned notes, task counts, recent activity |
| **Orchestrator** | Send a message to any agent, watch the response stream live |
| **Kanban** | Drag-and-drop task board (Backlog / To Do / In Progress / Done) |
| **Notes** | Pinned Markdown notes — split-pane editor |
| **Agents** | List, create, edit, and delete agents (writes YAML automatically) |
| **Activity** | Global event log — every LLM call, handoff, tool use, task change |
| **Docs** | Browse repo Markdown files with rendered preview |
| **Reports** | Weekly bar charts — tasks by status, by agent, key metrics |
| **Channels** | Channel config viewer |
| **Memory** | Per-channel memory editor |
| **Scheduler** | Heartbeat interval, concurrency, enable/disable toggle |
| **Settings** | Auth token, raw `clawforge.json` editor |

The dashboard updates in real time via WebSocket — no refreshing needed.

---

## 10. Step 8 — Discord Commands Reference

All commands work in any registered channel.

### Memory

| Command | What it does |
|---------|-------------|
| `/remember <text>` | Saves text to this channel's memory (no LLM call) |
| `/forget` | Clears ALL memory for this channel |
| `/forget <keyword>` | Removes only entries containing `keyword` |
| `/memory_3` | Injects last 3 conversation pairs as context for this message only |
| `/status` | Shows channel mode, memory count, token estimate, current model |

### Tasks

| Command | Example |
|---------|---------|
| `/task create <title>` | `/task create Fix login bug --priority high` |
| `/task list` | Shows active tasks |
| `/task list --all` | Shows every task including done/cancelled |
| `/task done <id>` | `/task done abc123` |
| `/task promote <id>` | Moves `backlog` → `todo` (makes eligible for agent pickup) |
| `/task assign <id> <agent>` | `/task assign abc123 researcher` |
| `/task status <id>` | Full task detail |
| `/task stats` | Counts by status |

### Natural language memory triggers

These phrases **automatically save to memory** and also get a normal LLM reply:

```
"remember that I prefer TypeScript over JavaScript"
"note that our API endpoint is api.example.com"
"keep in mind I'm in the CET timezone"
"don't forget that the Pi IP is 100.65.59.79"
"please remember my name is Dominik"
"make a note that we switched to pnpm"
```

Memory is stored in `~/.openclaw/stateless-channels/memory/<channel>.md` and injected into every system prompt for that channel.

---

## 11. Step 9 — Autonomous Tasks

Agents with `canPickTasks: true` automatically pick up tasks without any Discord message being sent.

### How it works

```
You create a task → starts in 'backlog'
       ↓
/task promote <id>  → moves to 'todo'
       ↓
Scheduler (every 60s) → finds a 'todo' task matching agent's taskPriorities
       ↓
Agent picks it up → status becomes 'in_progress'
       ↓
Agent calls complete_task → status becomes 'done'
```

### Create and promote a task

```
/task create Research the latest developments in quantum computing --priority high
/task promote <id shown in reply>
```

The `researcher` agent picks it up within the next scheduler tick (60 s by default) and posts the result.

### Monitor

Open **Tasks** in the dashboard — watch it move `todo → in_progress → done` in real time. The **Activity** page shows every step the agent took.

### Adjust the scheduler

Via the **Scheduler** page in the dashboard, or by editing `~/.openclaw/clawforge.json`:

```json
"tasks": {
  "autonomous": {
    "heartbeatIntervalMs": 30000,
    "maxConcurrentTasks": 2
  }
}
```

Then restart: `sudo systemctl restart clawforge`

---

## 12. Step 10 — Agent Orchestration & Handoffs

When a channel has an `orchestration` section, every Discord message is routed through a full agent loop instead of a single LLM call.

### How handoffs work

An agent's `handoffTo` list creates tools named `transfer_to_<agentname>`. When the LLM calls `transfer_to_researcher`, ClawForge:
1. Stops the current agent
2. Switches to `researcher`, passing the full conversation history
3. Continues from turn 1 of the new agent

Example:
```
User: "What are the latest AI developments?"
  → triage starts
  → triage calls transfer_to_researcher
  → researcher calls research tool
  → researcher returns a summary
  → reply sent to Discord
```

### Context variables

Anything in `orchestration.context` in the channel YAML becomes a `{{variable}}` in agent instructions:

```yaml
orchestration:
  agent: triage
  context:
    project: "MyStartup"
    language: "TypeScript"
```

Always-available variables:
- `{{channelId}}` — Discord channel ID
- `{{senderName}}` — Discord username
- `{{userId}}` — Discord user ID

### Budget & spend tracking

Set a per-agent monthly limit in the agent YAML:

```yaml
budgetMonthlyCents: 5000    # $50.00/month
```

When exceeded the agent is auto-paused. Resume via the **Budget** page in the dashboard.

---

## 13. Troubleshooting

### Bot not responding in a channel

```bash
systemctl status clawforge
journalctl -u clawforge -n 50
# Check registry.yaml has the correct channel ID and enabled: true
```

### Dashboard shows blank or 401

```bash
systemctl status clawforge
ss -tlnp | grep 3001
curl http://localhost:3001/health
```

If you see the dark background but no data: enter your `authToken` in Settings.

### better-sqlite3 fails to load

```bash
cd ~/ClawForge
pnpm rebuild better-sqlite3
sudo systemctl restart clawforge
```

### Permission errors on git pull

```bash
sudo chown -R pi-2:pi-2 ~/ClawForge/.git
```

### High memory on Pi

```bash
journalctl -u clawforge | grep -i memory
# MemoryGuard warns at 400 MB RSS, gc at 450 MB
# Systemd service caps at 600 MB
# Lower maxConcurrentTasks to 1 if OOMing
```

### Task stuck in `in_progress`

Tasks stuck for 30+ minutes are auto-reset to `todo`. To reset manually:

```bash
sqlite3 ~/.openclaw/clawforge-tasks.db \
  "UPDATE tasks SET status='todo', locked_at=NULL WHERE id='YOUR_TASK_ID';"
```

### Agent not picking up tasks

- `canPickTasks: true` set in agent YAML?
- `taskPriorities` includes the task's priority?
- Agent paused? Check the **Budget** page
- `tasks.autonomous.enabled: true` in `clawforge.json`?
- Task promoted? Tasks start in `backlog` — run `/task promote <id>` first

### Check registered channels

```bash
curl http://localhost:3001/api/channels
```

---

## Quick Reference

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CLAWFORGE QUICK REFERENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Config files:
    ~/.openclaw/openclaw.json          OpenClaw (bot token, gateway)
    ~/.openclaw/clawforge.json         ClawForge (dashboard, tasks, orchestration)
    ~/.openclaw/agents/*.yaml          agent definitions
    ~/.openclaw/stateless-channels/
      registry.yaml                    channel → config map
      channels/*.yaml                  per-channel config
      memory/*.md                      per-channel stored memory

  Service:
    sudo systemctl restart clawforge
    journalctl -u clawforge -f
    curl http://localhost:3001/health

  Dashboard:
    http://<pi-tailscale-ip>:3001

  Redeploy after code update:
    cd ~/ClawForge && git pull && sudo bash scripts/deploy-pi.sh

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
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
