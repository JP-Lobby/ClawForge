import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { AnyAgentTool } from '../orchestration/handoff.js';
import type { OrchestraConfig } from '../orchestration/types.js';

const RESEARCH_DIR = path.join(os.homedir(), '.openclaw', 'research');
const DDGO_URL = 'https://lite.duckduckgo.com/lite/';
const FETCH_TIMEOUT_MS = 10_000;

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

async function fetchDDGO(query: string): Promise<string[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const url = `${DDGO_URL}?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'ClawForge/1.0 research-tool' },
    });
    if (!res.ok) return [];
    const html = await res.text();
    // Extract result snippets from DuckDuckGo Lite HTML
    const snippets: string[] = [];
    const snippetRe = /<td class="result-snippet"[^>]*>([\s\S]*?)<\/td>/gi;
    let match: RegExpExecArray | null;
    while ((match = snippetRe.exec(html)) !== null) {
      const text = match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (text) snippets.push(text);
    }
    return snippets.slice(0, 5);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function generateSubQueries(topic: string): string[] {
  return [
    topic,
    `${topic} overview`,
    `${topic} latest 2025`,
  ];
}

function buildTemplateReport(topic: string, snippets: string[]): string {
  const date = new Date().toISOString().slice(0, 10);
  const lines = [
    `# Research Report: ${topic}`,
    `*Generated: ${date}*`,
    ``,
    `## Summary`,
    `Research results for "${topic}":`,
    ``,
    `## Findings`,
    ...snippets.map((s, i) => `### Result ${i + 1}\n${s}`),
    ``,
    `## Sources`,
    `- DuckDuckGo Lite search results`,
    ``,
    `*Note: This is an automated template report. LLM synthesis was unavailable.*`,
  ];
  return lines.join('\n');
}

export function createResearchTool(orchConfig: OrchestraConfig): AnyAgentTool {
  return {
    name: 'research',
    description: 'Search the web and produce a structured Markdown research report on a topic. Saves the report to disk and returns a summary.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'The topic or question to research' },
      },
      required: ['topic'],
    },
    execute: async (input: Record<string, unknown>): Promise<string> => {
      const topic = input['topic'] as string;
      if (!topic?.trim()) return JSON.stringify({ error: 'Topic is required' });

      // Fetch search results for multiple sub-queries in parallel
      const queries = generateSubQueries(topic);
      const results = await Promise.all(queries.map((q) => fetchDDGO(q)));

      // Flatten and deduplicate snippets
      const seen = new Set<string>();
      const allSnippets: string[] = [];
      for (const batch of results) {
        for (const snippet of batch) {
          if (!seen.has(snippet)) { seen.add(snippet); allSnippets.push(snippet); }
        }
      }

      let reportContent: string;

      // Try LLM synthesis
      try {
        const { callProvider } = await import('../providers/router.js');
        const providerName = Object.keys(orchConfig.providers)[0] ?? 'anthropic';

        const prompt = `You are a research assistant. Based on these search result snippets about "${topic}", write a concise, well-structured Markdown research report. Include a brief summary, key findings, and note any limitations.

Search results:
${allSnippets.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Write the report in Markdown format with headings.`;

        const completion = await callProvider(providerName, orchConfig, [
          { role: 'user', content: prompt },
        ]);

        reportContent = `# Research Report: ${topic}\n*Generated: ${todayStr()}*\n\n${completion.content}`;
      } catch {
        // Fall back to template
        reportContent = buildTemplateReport(topic, allSnippets);
      }

      // Save report to disk
      if (!existsSync(RESEARCH_DIR)) mkdirSync(RESEARCH_DIR, { recursive: true });
      const filename = `${slugify(topic)}-${todayStr()}.md`;
      const filePath = path.join(RESEARCH_DIR, filename);
      try {
        writeFileSync(filePath, reportContent, 'utf8');
      } catch {
        // Non-fatal
      }

      const summary = reportContent.split('\n').slice(0, 5).join('\n');
      return JSON.stringify({ success: true, filename, filePath, snippet_count: allSnippets.length, summary });
    },
  };
}
