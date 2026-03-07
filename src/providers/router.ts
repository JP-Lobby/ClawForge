import type { OrchestraConfig } from '../orchestration/types.js';
import type { NormalizedMessage, NormalizedTool, Completion, ProviderEntry } from './types.js';
import { callAnthropic } from './anthropic.js';
import { callOpenAICompat } from './openai-compat.js';
import { callGemini } from './gemini.js';
import { callOllama } from './ollama.js';

const OPENAI_COMPAT = new Set(['openai', 'openrouter', 'groq', 'minimax', 'together', 'mistral', 'perplexity']);

function buildEntry(name: string, orchConfig: OrchestraConfig): ProviderEntry {
  const cfg = orchConfig.providers[name] ?? {};
  return { provider: name, apiKey: cfg.apiKey, baseUrl: cfg.baseUrl, model: cfg.defaultModel ?? 'claude-haiku-4-5-20251001', fallback: cfg.fallback };
}

async function callAdapter(entry: ProviderEntry, messages: NormalizedMessage[], tools?: NormalizedTool[]): Promise<Completion> {
  if (entry.provider === 'anthropic') return callAnthropic(entry, messages, tools);
  if (entry.provider === 'gemini') return callGemini(entry, messages, tools);
  if (entry.provider === 'ollama') return callOllama(entry, messages, tools);
  if (OPENAI_COMPAT.has(entry.provider)) return callOpenAICompat(entry, messages, tools);
  console.warn(`[ClawForge] Unknown provider "${entry.provider}" — attempting OpenAI-compat`);
  return callOpenAICompat(entry, messages, tools);
}

export async function callProvider(
  providerName: string,
  orchConfig: OrchestraConfig,
  messages: NormalizedMessage[],
  tools?: NormalizedTool[]
): Promise<Completion> {
  const entry = buildEntry(providerName, orchConfig);

  try {
    return await callAdapter(entry, messages, tools);
  } catch (primaryErr) {
    const fallbackName = entry.fallback;
    if (!fallbackName) throw primaryErr;

    console.warn(`[ClawForge] Provider "${providerName}" failed, falling back to "${fallbackName}":`, primaryErr instanceof Error ? primaryErr.message : String(primaryErr));

    const fallbackEntry = buildEntry(fallbackName, orchConfig);
    try {
      return await callAdapter(fallbackEntry, messages, tools);
    } catch (fallbackErr) {
      throw new Error(
        `[ClawForge] Both "${providerName}" and fallback "${fallbackName}" failed. ` +
        `Primary: ${primaryErr instanceof Error ? primaryErr.message : String(primaryErr)}. ` +
        `Fallback: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`
      );
    }
  }
}
