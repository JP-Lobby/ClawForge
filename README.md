# ClawForge

**Mission control for your OpenClaw multi-agent AI swarm.** ClawForge is a lightweight add-on that runs on top of [OpenClaw](https://github.com/anthropics/openclaw) and gives you a full dashboard, kanban board, notes, orchestrator UI, and autonomous task scheduling — all accessible via Tailscale from anywhere.

---

## Features

- 🏠 **Dashboard** — Stats overview, agent status panel, activity feed, pinned notes
- ⚡ **Orchestrator** — Dispatch messages to any agent directly from the browser (SSE streaming)
- 📋 **Kanban** — Drag-and-drop task board (To Do / In Progress / Done / Archive)
- 📝 **Notes** — Markdown notes with pin/unpin and auto-save
- 🤖 **Agents** — Full CRUD for agent YAML configs (create, edit, delete system prompts & tools)
- 📊 **Activity** — Global activity log with configurable limits
- 📁 **Docs** — Browse research files with Markdown rendering and copy-code buttons
- 📈 **Reports** — Weekly summary: tasks created/completed, agent breakdowns, activity count
- 📡 **Channels** — View configured Discord channels
- 🧠 **Memory** — Read and manage channel memory
- ⏱ **Scheduler** — Configure heartbeat interval, concurrency, and request depth
- ⚙️ **Settings** — Connection, provider health, Discord orchestrator channel, raw config editor

---

## Quick Start

```bash
# 1. Clone onto your Pi (or dev machine)
git clone https://github.com/JP-Lobby/ClawForge.git ~/ClawForge
cd ~/ClawForge

# 2. Run the onboarding wizard (sets auth token, creates dirs, updates openclaw.json)
bash scripts/onboard.sh

# 3. Add your API keys to ~/.openclaw/openclaw.json

# 4. Build and start
pnpm install
cd dashboard && pnpm install && pnpm build && cd ..
pnpm start
```

Then open `http://YOUR_TAILSCALE_IP:3001` in your browser.

> **Access via Tailscale only.** The dashboard binds to `0.0.0.0:3001` but should only be reached via your Tailscale IP — never expose this port to the internet.

---

## Setup Guide

See **[CLAWFORGE-SETUP-GUIDE.md](./CLAWFORGE-SETUP-GUIDE.md)** for the complete walkthrough:

- Tailscale setup (Tailscale-first access model)
- OpenClaw + ClawForge `openclaw.json` configuration
- Discord bot setup & slash command registration (`/remember`, `/forget`, `/status`, `/task`, `/research`)
- Agent YAML reference
- Raspberry Pi deploy & auto-start on reboot

---

## Architecture

ClawForge is a TypeScript ESM project targeting Node 20 on Raspberry Pi 4 (arm64).

```
src/orchestration/   — Agent swarm loop, HANDOFF_KEY, multi-agent routing
src/tasks/           — SQLite WAL task store, autonomous scheduler
src/stateless/       — Channel memory, NL triggers, slash command handlers
src/providers/       — fetch-based: anthropic, openai-compat, gemini, ollama
src/dashboard-api/   — Express REST API + WebSocket + new routes (notes, config, orchestrator, reports, scheduler)
src/budget/          — Per-agent monthly limits
dashboard/           — React 18 + Vite 5 + Tailwind CSS 3 (served as static files)
scripts/             — onboard.sh, deploy-pi.sh, register-discord-commands.ts
agents/              — YAML agent configs
```

---

## Requirements

- Node.js 20+
- pnpm 8+
- Raspberry Pi 4 (2 GB+ RAM recommended) or any Linux/macOS machine
- OpenClaw already configured (`~/.openclaw/openclaw.json` exists)
- Tailscale (recommended for remote access)

---

## Discord Slash Commands

Register slash commands so they appear in Discord's `/` autocomplete:

```bash
pnpm tsx scripts/register-discord-commands.ts
```

Commands registered: `/remember`, `/forget`, `/status`, `/memory_n`, `/task`, `/research`

---

## License

MIT
