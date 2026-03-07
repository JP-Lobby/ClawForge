# ClawForge Session 3 — Agent Orchestration + Provider Router

**Completed:** March 7, 2026
**Branch:** clawforge-dev (commit after testing)
**Status:** All TypeScript compiles cleanly, zero errors

---

## What Was Built

Session 3 adds **Swarm-style multi-agent orchestration** to ClawForge. Any stateless channel can now be upgraded to use an **agent run loop** — a multi-turn LLM conversation with tool use, agent handoffs, and multi-provider support.

The key architectural decision: the orchestration layer **sits alongside** OpenClaw's existing pipeline, activated per-channel via a YAML config flag. Channels without `orchestration.agent` set continue to use the standard `dispatchInboundMessage()` flow unchanged.

---

## Files Created

### `src/orchestration/` — The Run Loop Module

| File | Purpose |
|------|---------|
| `types.ts` | `ClawAgent`, `AgentContext`, `AgentResponse`, `RunMessage`, `OrchestraConfig` interfaces |
| `context.ts` | Deep-clone, merge, and `{{var}}` interpolation for context variables |
| `handoff.ts` | `HANDOFF_KEY` sentinel, `buildHandoffTools()`, `extractToolResult()` |
| `agent.ts` | YAML registry: `loadAgent()`, `listAgents()`, mtime-based cache |
| `run-loop.ts` | `runOrchestrationLoop()` — the Swarm-style multi-turn LLM loop |
| `index.ts` | Public barrel export |

### `src/providers/` — Provider Router + Adapters

| File | Purpose |
|------|---------|
| `types.ts` | `NormalizedMessage`, `NormalizedTool`, `Completion`, `ProviderEntry` |
| `normalizer.ts` | Anthropic ↔ OpenAI ↔ Gemini message format conversion |
| `anthropic.ts` | Anthropic Claude adapter (fetch-based, supports all claude-* models) |
| `openai-compat.ts` | OpenAI, OpenRouter, Groq, MiniMax, Together adapters |
| `gemini.ts` | Google Gemini adapter |
| `ollama.ts` | Local Ollama adapter (5-min timeout, no API key needed) |
| `router.ts` | `callProvider()` with automatic fallback chain |
| `index.ts` | Public barrel export |

### `agents/` — Agent YAML Definitions (copy to `~/.openclaw/agents/`)

| File | Role |
|------|------|
| `triage.yaml` | Entry-point: classifies messages, routes to specialists |
| `researcher.yaml` | Web research, fact-finding, report synthesis |
| `coder.yaml` | Code writing, debugging, TypeScript/Python/Bash |

---

## Files Modified

### `src/stateless/types.ts`
Added optional `orchestration` field to `StatelessChannelConfig`:
```typescript
orchestration?: {
  agent: string;       // e.g. "triage"
  maxTurns?: number;   // override agent YAML default
  context?: Record<string, unknown>;  // seed context vars
};
```

### `src/discord/monitor/message-handler.process.ts`
Three additions (all prefixed `// ClawForge:`):
1. **Import block** — `runOrchestrationLoop`, `loadAgent`, `OrchestraConfig`, `createOpenClawTools`
2. **Detection phase** (~line 227) — sets `isOrchestrationChannel` boolean
3. **Delivery phase** (~line 924) — runs the orchestration loop and delivers reply, short-circuits before `dispatchInboundMessage`

---

## Configuration

### Step 1: Add provider API keys to `openclaw.json`

```json
{
  "orchestration": {
    "enabled": true,
    "agentsDir": "~/.openclaw/agents",
    "providers": {
      "anthropic": {
        "apiKey": "sk-ant-YOUR_KEY_HERE",
        "defaultModel": "claude-sonnet-4-6"
      },
      "openai": {
        "apiKey": "sk-YOUR_KEY_HERE",
        "defaultModel": "gpt-4o",
        "fallback": "anthropic"
      },
      "ollama": {
        "baseUrl": "http://localhost:11434",
        "defaultModel": "llama3"
      }
    }
  }
}
```

> **Note:** Provider fallback works automatically. If `openai` fails, it falls back to `anthropic`.

### Step 2: Copy agent YAML files to your Pi

```bash
mkdir -p ~/.openclaw/agents
cp agents/*.yaml ~/.openclaw/agents/
```

Customise the agents as needed — the YAML files are self-documented.

### Step 3: Enable orchestration for a Discord channel

Edit the channel's stateless config YAML (in `~/.openclaw/stateless-channels/channels/`):

```yaml
# ~/.openclaw/stateless-channels/channels/my-channel.yaml
channelId: "YOUR_DISCORD_CHANNEL_ID"
mode: "stateless"
enabled: true
memoryFile: "my-channel.md"
historyOnCommand: false
maxMemoryPairs: 20

# Add this block to enable orchestration:
orchestration:
  agent: "triage"          # must match agents/triage.yaml
  maxTurns: 20             # optional, overrides triage.yaml default
  context:
    project: "ClawForge"   # optional seed variables
```

> Any message to this channel now runs through the Triage → Researcher/Coder agent loop.

---

## How It Works

```
Discord message
    ↓
/task command? → deliver terminal reply → return
    ↓
stateless command (/remember etc)? → deliver ack → (maybe return)
    ↓
isOrchestrationChannel?
    YES → loadAgent("triage")
          → runOrchestrationLoop(agent, input, tools)
               → while turn < maxTurns:
                    → callProvider(anthropic, claude-sonnet-4-6, messages, tools)
                    → if tool_calls: execute each tool
                    → if transfer_to_researcher: switch agent, reset turn counter
                    → if no tool_calls: break
          → deliver final reply → return
    NO  → dispatchInboundMessage() [unchanged existing pipeline]
```

### Agent Handoffs

The run loop auto-generates `transfer_to_<name>` tools from each agent's `handoffTo` list. When Triage calls `transfer_to_researcher`:

1. The tool returns `{ __clawforge_handoff__: ResearcherAgent }` in its `details`
2. The run loop detects this via `extractToolResult()`
3. `activeAgent` switches to Researcher
4. System prompt is replaced with Researcher's instructions
5. Turn counter resets (Researcher gets its own full `maxTurns` budget)

### Context Variables

- Deep-copied at run start (Swarm pattern)
- `{{channelId}}`, `{{senderName}}`, `{{userId}}` auto-injected from the message
- Tools can update context by returning `{ __context_update: {...} }` in `details`
- `{{varName}}` placeholders in agent instructions are interpolated

### Provider Fallback

If a provider call fails (network error, rate limit, etc.):
```
anthropic fails → fallback: "ollama" → call ollama/llama3
```
Configure in `openclaw.json` under `orchestration.providers.<name>.fallback`.

---

## Verification Checklist

1. **Basic compile check:**
   ```bash
   tsc --noEmit    # must produce 0 errors
   ```

2. **Agent YAML loading:**
   ```bash
   node -e "
   import { loadAgent } from './src/orchestration/agent.js';
   const a = loadAgent('triage');
   console.log(a?.name, a?.tools);
   "
   ```
   Expected: `Triage ['create_task', 'list_my_tasks', 'update_task_status']`

3. **Standard channel still works:**
   Send a message to a non-orchestration channel → should reply normally (unchanged pipeline).

4. **Orchestration channel with triage:**
   Enable orchestration on a test channel → send "Hello" → should get a direct Triage reply without handoff.

5. **Test handoff to researcher:**
   Send "What is the current price of Raspberry Pi 5?" → Triage should hand off to Researcher → Researcher uses `web_search` → returns synthesized answer.

6. **Test handoff to coder:**
   Send "Write a Python script that prints the Fibonacci sequence" → Triage hands off to Coder → Coder returns code.

7. **Test provider fallback:**
   Temporarily set an invalid `anthropic.apiKey`, add `"fallback": "ollama"` → send a message → verify it falls back and responds via Ollama.

8. **Test Ollama (local):**
   If Ollama is running on the Pi: configure a channel agent to use `provider: "ollama"` + `model: "llama3"` → verify local inference works.

9. **Task tools in orchestration:**
   Ask Triage to "create a task to research Raspberry Pi 5 benchmarks" → verify `/task list` shows the new task.

10. **Context variables in instructions:**
    Check that Researcher replies mention the sender's name (from `{{senderName}}` in instructions).

11. **maxTurns guard:**
    Configure `maxTurns: 1` in channel YAML → verify the agent doesn't loop infinitely.

---

## Architecture Notes for Future Sessions

- **Session 4 (Dashboard):** `src/orchestration/run-loop.ts` emits no events yet — add `EventEmitter` calls here for the dashboard's live activity feed.
- **Budget tracking:** The `Completion.usage` field is already populated — Session 6 will wire this to `src/budget/tracker.ts`.
- **Tool filtering:** Agent YAMLs list tool names; `resolveAgentTools()` filters `createOpenClawTools()` output by name. If an agent YAML lists `web_search` but the tool isn't in `createOpenClawTools()` (e.g., web search is disabled in config), the agent simply won't have it.
- **Adding new agents:** Drop a new `.yaml` file in `~/.openclaw/agents/` — no code changes needed. The cache invalidates on file mtime change.
- **Ollama for Pi-local inference:** Use `provider: "ollama"` + whatever model you have pulled. The Ollama adapter uses a 5-minute timeout, suitable for larger models on Pi hardware.

---

## File Inventory (Session 3 Changes Only)

**New files (16 total):**
```
src/orchestration/types.ts
src/orchestration/context.ts
src/orchestration/handoff.ts
src/orchestration/agent.ts
src/orchestration/run-loop.ts
src/orchestration/index.ts
src/providers/types.ts
src/providers/normalizer.ts
src/providers/anthropic.ts
src/providers/openai-compat.ts
src/providers/gemini.ts
src/providers/ollama.ts
src/providers/router.ts
src/providers/index.ts
agents/triage.yaml
agents/researcher.yaml
agents/coder.yaml
```

**Modified files (2 total):**
```
src/stateless/types.ts                                (+orchestration field)
src/discord/monitor/message-handler.process.ts        (+3 blocks)
```
