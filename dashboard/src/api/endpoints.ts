import { apiFetch } from './client.js';
import type {
  Task, TaskStats, TaskPriority, TaskStatus,
  Agent, Channel, ResearchFile, ActivityEntry,
  AgentSpend, ProviderSpend, BudgetData, ProviderStatus,
  Note, SchedulerConfig, WeeklyReport,
} from './types.js';

// Tasks

export async function fetchTasks(filters?: { status?: TaskStatus; priority?: TaskPriority }): Promise<Task[]> {
  const qs = filters ? '?' + new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v !== undefined) as [string, string][]
  ).toString() : '';
  const res = await apiFetch<{ tasks: Task[] }>(`/api/tasks${qs}`);
  return res.tasks.map(normalizeTask);
}

export async function fetchTaskStats(): Promise<TaskStats> {
  const res = await apiFetch<{ stats: { backlog: number; todo: number; in_progress: number; blocked: number; done: number; cancelled: number } }>('/api/tasks/stats');
  const s = res.stats;
  const total = (s.backlog ?? 0) + (s.todo ?? 0) + (s.in_progress ?? 0) + (s.blocked ?? 0) + (s.done ?? 0) + (s.cancelled ?? 0);
  return { ...s, total, inProgress: s.in_progress ?? 0, completed: s.done ?? 0, failed: s.cancelled ?? 0 };
}

export async function fetchTask(id: string): Promise<Task> {
  const res = await apiFetch<{ task: Task }>(`/api/tasks/${id}`);
  return normalizeTask(res.task);
}

export async function createTask(input: { title: string; description?: string; priority?: TaskPriority; assigneeAgentId?: string }): Promise<Task> {
  const res = await apiFetch<{ task: Task }>('/api/tasks', { method: 'POST', body: JSON.stringify(input) });
  return normalizeTask(res.task);
}

export async function updateTask(id: string, input: Record<string, unknown>): Promise<Task> {
  const res = await apiFetch<{ task: Task }>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
  return normalizeTask(res.task);
}

export async function deleteTask(id: string): Promise<void> {
  await apiFetch<{ success: boolean }>(`/api/tasks/${id}`, { method: 'DELETE' });
}

function normalizeTask(t: Task): Task {
  return { ...t, assignedAgent: t.assignedAgent ?? (t as unknown as { assigneeAgentId?: string }).assigneeAgentId ?? null };
}

// Agents

export async function fetchAgents(): Promise<Agent[]> {
  const res = await apiFetch<{ agents: Agent[] }>('/api/agents');
  return res.agents;
}

export async function fetchAgent(name: string): Promise<Agent> {
  const res = await apiFetch<{ agent: Agent }>(`/api/agents/${name}`);
  return res.agent;
}

export async function createAgent(agent: Agent): Promise<Agent> {
  const res = await apiFetch<{ agent: Agent }>('/api/agents', { method: 'POST', body: JSON.stringify(agent) });
  return res.agent;
}

export async function updateAgent(name: string, agent: Partial<Agent>): Promise<Agent> {
  const res = await apiFetch<{ agent: Agent }>(`/api/agents/${name}`, { method: 'PUT', body: JSON.stringify(agent) });
  return res.agent;
}

export async function deleteAgent(name: string): Promise<void> {
  await apiFetch<void>(`/api/agents/${name}`, { method: 'DELETE' });
}

export async function reloadAgent(name: string): Promise<void> {
  await apiFetch<{ success: boolean }>(`/api/agents/${name}/reload`, { method: 'POST' });
}

// Memory

export async function fetchMemory(channelId: string): Promise<{ content: string; sizeBytes: number }> {
  const res = await apiFetch<{ content: string; stats: { sizeBytes: number } }>(`/api/memory/${channelId}`);
  return { content: res.content ?? '', sizeBytes: res.stats?.sizeBytes ?? 0 };
}

export async function updateMemory(channelId: string, content: string): Promise<void> {
  await apiFetch<{ success: boolean }>(`/api/memory/${channelId}`, { method: 'DELETE' });
  if (content.trim()) {
    await apiFetch<{ success: boolean }>(`/api/memory/${channelId}`, { method: 'POST', body: JSON.stringify({ content, source: 'dashboard' }) });
  }
}

export async function clearMemory(channelId: string): Promise<void> {
  await apiFetch<{ success: boolean }>(`/api/memory/${channelId}`, { method: 'DELETE' });
}

// Activity

export async function fetchActivity(opts?: { limit?: number; taskId?: string; actorId?: string }): Promise<{ entries: ActivityEntry[] }> {
  const qs = opts ? '?' + new URLSearchParams(
    Object.entries(opts).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
  ).toString() : '';
  const res = await apiFetch<{ activity: ActivityEntry[] }>(`/api/activity${qs}`);
  return { entries: res.activity ?? [] };
}

// Budget (kept for backward compat)

export async function fetchAllAgentSpends(): Promise<BudgetData> {
  type RawAgent = { agentId: string; spendCents: number; limitCents: number; paused: boolean };
  type RawProvider = { provider: string; spendCents: number };
  const res = await apiFetch<{ agents: RawAgent[]; providers: RawProvider[] }>('/api/budget');
  return {
    agents: (res.agents ?? []).map((a): AgentSpend => ({ agentName: a.agentId, agentId: a.agentId, monthlySpentCents: a.spendCents, monthlyLimitCents: a.limitCents, paused: a.paused })),
    providers: (res.providers ?? []).map((p): ProviderSpend => ({ provider: p.provider, monthlySpentCents: p.spendCents })),
  };
}

// Channels

export async function fetchChannels(): Promise<Channel[]> {
  type RawChannel = { channelId: string; mode?: string; enabled?: boolean; customPrompt?: string; orchestration?: { agent?: string; maxTurns?: number }; maxMemoryPairs?: number };
  const res = await apiFetch<{ channels: RawChannel[] }>('/api/channels');
  return (res.channels ?? []).map((ch): Channel => ({
    ...ch, id: ch.channelId, channelId: ch.channelId, name: ch.channelId, systemPrompt: ch.customPrompt,
    orchestration: ch.orchestration ? { ...ch.orchestration, entryAgent: ch.orchestration.agent } : undefined,
  }));
}

// Research / Docs

export async function fetchResearchFiles(): Promise<ResearchFile[]> {
  const res = await apiFetch<{ files: ResearchFile[] }>('/api/research');
  return res.files ?? [];
}

export async function fetchResearchFile(filename: string): Promise<{ content: string }> {
  return apiFetch<{ filename: string; content: string }>(`/api/research/${encodeURIComponent(filename)}`);
}

// Providers

export async function fetchProviderStatus(): Promise<ProviderStatus[]> {
  type RawProvider = { provider: string; status: 'ok' | 'error'; latencyMs?: number; error?: string };
  const res = await apiFetch<{ providers: RawProvider[] }>('/api/providers/health');
  return (res.providers ?? []).map((p): ProviderStatus => ({ name: p.provider, provider: p.provider, ok: p.status === 'ok', latencyMs: p.latencyMs, error: p.error }));
}

// Notes

export async function fetchNotes(): Promise<Note[]> {
  const res = await apiFetch<{ notes: Note[] }>('/api/notes');
  return res.notes ?? [];
}

export async function createNote(content: string, pinned = false): Promise<Note> {
  const res = await apiFetch<{ note: Note }>('/api/notes', { method: 'POST', body: JSON.stringify({ content, pinned }) });
  return res.note;
}

export async function updateNote(id: string, updates: { content?: string; pinned?: boolean }): Promise<Note> {
  const res = await apiFetch<{ note: Note }>(`/api/notes/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
  return res.note;
}

export async function deleteNote(id: string): Promise<void> {
  await apiFetch<void>(`/api/notes/${id}`, { method: 'DELETE' });
}

// Config

export async function fetchConfig(): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>('/api/config');
}

export async function updateConfig(partial: Record<string, unknown>): Promise<void> {
  await apiFetch<{ ok: boolean }>('/api/config', { method: 'PUT', body: JSON.stringify(partial) });
}

// Orchestrator

export async function runOrchestrator(
  agentName: string,
  message: string,
  channelId?: string,
  onChunk?: (text: string) => void,
): Promise<string> {
  if (onChunk) {
    const token = localStorage.getItem('clawforge:authToken') ?? '';
    const resp = await fetch('/api/orchestrate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ agentName, message, channelId }),
    });
    const reader = resp.body?.getReader();
    const decoder = new TextDecoder();
    let finalContent = '';
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6)) as { type: string; content?: string };
              if ((data.type === 'turn' || data.type === 'done') && data.content) {
                finalContent = data.content;
                onChunk(data.content);
              }
            } catch { /* skip */ }
          }
        }
      }
    }
    return finalContent;
  } else {
    const res = await apiFetch<{ response: string }>('/api/orchestrate', {
      method: 'POST',
      body: JSON.stringify({ agentName, message, channelId }),
    });
    return res.response;
  }
}

// Reports

export async function fetchWeeklyReport(): Promise<WeeklyReport> {
  return apiFetch<WeeklyReport>('/api/reports/weekly');
}

// Scheduler

export async function fetchSchedulerConfig(): Promise<SchedulerConfig> {
  return apiFetch<SchedulerConfig>('/api/scheduler');
}

export async function updateSchedulerConfig(partial: Partial<SchedulerConfig>): Promise<SchedulerConfig> {
  return apiFetch<SchedulerConfig>('/api/scheduler', { method: 'PUT', body: JSON.stringify(partial) });
}
