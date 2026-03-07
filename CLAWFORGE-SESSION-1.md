# ClawForge — Session 1 Complete: Stateless Engine Core

**Status:** ✅ Implementation complete, ready for deployment to Pi 2

---

## What Was Built

Session 1 introduces a per-channel **stateless mode** to OpenClaw. In stateless mode, the bot's automatic JSONL history injection is bypassed entirely. Instead, each request is processed as:

```
[Global System Prompt] + [Custom Channel Prompt] + [Explicit Memory] + [Current Input]
```

History is opt-in only, via the `/memory_N` command.

---

## New Files

### `src/stateless/` (5 files)

| File | Purpose |
|------|---------|
| `types.ts` | TypeScript interfaces: `StatelessChannelConfig`, `StatelessRegistry`, `CommandParseResult`, `MemoryEntry` |
| `config-loader.ts` | YAML registry + channel config loader with mtime-based cache |
| `memory-store.ts` | Read/write/clear `.md` memory files per channel |
| `natural-language-memory.ts` | Regex classifier for NL memory triggers ("remember that...") |
| `commands.ts` | Command parser + executor for `/remember`, `/forget`, `/memory_N`, `/mode`, `/status` |
| `index.ts` | Public re-export barrel |

### `stateless-channels/` (config directory — goes in `~/.openclaw/`)

| File | Purpose |
|------|---------|
| `registry.yaml` | Maps Discord channel IDs → config files |
| `channels/example-channel.yaml` | Documented template for new channels |
| `channels/research-channel.yaml` | Pre-built research assistant config |
| `tools/research-config.yaml` | Research tool prompt settings |
| `memory/.gitkeep` | Empty dir tracked by git |

### Modified: `src/discord/monitor/message-handler.process.ts`

Five targeted edits (all prefixed with `// ClawForge:` comments):

1. **Imports** (lines 13–24): Added stateless module imports + `buildHistoryContextFromEntries` + `HistoryEntry`
2. **Detection phase** (lines 153–198): Stateless config lookup + command/NL parsing before history injection
3. **System prompt injection** (lines 294–303): Appends custom prompt + memory block to `systemPromptParts`
4. **History bypass** (lines 334–363): Skips `buildPendingHistoryContextFromMap` for stateless channels; uses `buildHistoryContextFromEntries` for `/memory_N`
5. **Command delivery** (lines 827–858): Delivers command replies via `deliverDiscordReply`; returns early for terminal commands

---

## Commands Available in Stateless Channels

| Command | Behaviour |
|---------|-----------|
| `/remember <text>` | Saves text to channel memory file. No LLM call. |
| `/forget` | Clears all channel memory. No LLM call. |
| `/forget <topic>` | Removes memory entries matching keyword. No LLM call. |
| `/memory_N` | Injects last N history pairs, then continues to LLM. (e.g. `/memory_3`) |
| `/status` | Reports channel mode, memory stats, provider. No LLM call. |
| `/mode <stateless\|standard>` | Explains how to change mode (manual config edit required). |
| `remember that <text>` | NL trigger — saves to memory, then also runs LLM. |
| `note that <text>` | Same as above. |
| `keep in mind <text>` | Same as above. |

---

## Deploy to Pi 2 (Test Environment)

### 1. Push to GitHub

On your dev machine, from `/repos/openclaw`:

```bash
git add src/stateless/ stateless-channels/ src/discord/monitor/message-handler.process.ts
git commit -m "feat: ClawForge Session 1 — stateless channel engine"
git push origin main   # or your working branch
```

### 2. Pull + Build on Pi 2

```bash
ssh pi2
cd ~/openclaw   # or wherever you cloned it
git pull
npm install     # only if new deps (yaml was already a dep)
npm run build
```

### 3. Set Up Config on Pi 2

Copy the `stateless-channels/` directory to `~/.openclaw/`:

```bash
mkdir -p ~/.openclaw
cp -r stateless-channels ~/.openclaw/
```

Then edit the registry to add your test channel:

```bash
nano ~/.openclaw/stateless-channels/registry.yaml
```

Uncomment and fill in your Discord channel ID:

```yaml
channels:
  "YOUR_DISCORD_CHANNEL_ID_HERE":
    config: "test-channel.yaml"
    enabled: true
```

Create the channel config:

```bash
cp ~/.openclaw/stateless-channels/channels/example-channel.yaml \
   ~/.openclaw/stateless-channels/channels/test-channel.yaml
nano ~/.openclaw/stateless-channels/channels/test-channel.yaml
```

Minimum config:

```yaml
channelId: "YOUR_DISCORD_CHANNEL_ID_HERE"
mode: "stateless"
enabled: true
memoryFile: "test-channel.md"
historyOnCommand: true
maxMemoryPairs: 20
customPrompt: |
  You are a helpful assistant with no persistent memory.
  The user's explicit saves appear in the Channel Memory section above.
```

### 4. Restart OpenClaw

```bash
pm2 restart openclaw   # or however you run it on Pi 2
```

---

## Verification Checklist

Run these in order in your test Discord channel:

```
[ ] 1. Send any regular message
        Expected: Bot responds — NO prior chat history injected into prompt
        (Check logs: "statelessHistoryBypass = true" or no history block in prompt)

[ ] 2. Send: /status
        Expected: "Channel Status" embed with mode: stateless, Memory: empty

[ ] 3. Send: /remember My name is Dominik and I prefer concise answers
        Expected: "✅ Memory saved, Dominik!"  — bot does NOT call LLM

[ ] 4. Send: /status
        Expected: Memory shows 1 entry, ~X tokens

[ ] 5. Send: /status again after refreshing
        Expected: Same result (proves mtime cache didn't clear it)

[ ] 6. Send any regular message
        Expected: Bot knows "Dominik prefers concise answers" from memory
        (Memory is injected into system prompt)

[ ] 7. Send: remember that I work in fintech
        (no slash — NL trigger)
        Expected: "✅ Noted, Dominik! I've saved that to channel memory..."
        Then ALSO: bot replies to the NL message (LLM call happens too)

[ ] 8. Send: /memory_2
        Expected: Bot responds WITH the 2 most recent history pairs injected.
        (Stateless mode overridden for this one message)

[ ] 9. Send: /forget
        Expected: "🗑️ Channel memory cleared."

[ ] 10. Send: /status
        Expected: Memory: empty
```

---

## Architecture Notes for Next Sessions

- **Session 2 (Task System)**: The stateless command infrastructure in `commands.ts` is the right place to add `/task`, `/schedule`, `/tasks` commands. The detection phase in `message-handler.process.ts` already handles the terminal/non-terminal split.

- **Session 3 (Agent Router)**: The `provider` and `model` fields in `StatelessChannelConfig` are already plumbed through config but not yet used to override the route. Session 3 will wire those into the provider resolution path.

- **Memory format**: The `.md` format is intentionally human-readable so you can inspect and manually edit `~/.openclaw/stateless-channels/memory/*.md` files. Each entry is separated by `---` for easy grep/diff.

- **Config hot-reload**: The mtime cache means config changes take effect immediately on the next message — no restart needed.

---

*ClawForge Session 1 completed: 2026-03-07*
