import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  statSync,
} from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const MEMORY_DIR = path.join(os.homedir(), '.openclaw', 'stateless-channels', 'memory');

function ensureMemoryDir(): void {
  if (!existsSync(MEMORY_DIR)) {
    mkdirSync(MEMORY_DIR, { recursive: true });
  }
}

export function resolveMemoryFilePath(channelId: string, memoryFile?: string): string {
  const filename = memoryFile ?? `${channelId}.md`;
  ensureMemoryDir();
  return path.join(MEMORY_DIR, filename);
}

export function readChannelMemory(channelId: string, memoryFile?: string): string {
  const filePath = resolveMemoryFilePath(channelId, memoryFile);
  if (!existsSync(filePath)) return '';
  return readFileSync(filePath, 'utf8');
}

export function appendChannelMemory(
  channelId: string,
  text: string,
  memoryFile?: string
): void {
  const filePath = resolveMemoryFilePath(channelId, memoryFile);
  const existing = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
  const timestamp = new Date().toISOString();
  const entry = `<!-- ${timestamp} -->\n${text.trim()}\n`;
  const separator = existing.trim() ? '\n---\n' : '';
  writeFileSync(filePath, existing + separator + entry, 'utf8');
}

export function clearChannelMemory(channelId: string, memoryFile?: string): void {
  const filePath = resolveMemoryFilePath(channelId, memoryFile);
  writeFileSync(filePath, '', 'utf8');
}

export function clearChannelMemoryByKeyword(
  channelId: string,
  keyword: string,
  memoryFile?: string
): number {
  const filePath = resolveMemoryFilePath(channelId, memoryFile);
  if (!existsSync(filePath)) return 0;

  const content = readFileSync(filePath, 'utf8');
  const entries = content.split(/\n---\n/).filter(Boolean);
  const lowerKeyword = keyword.toLowerCase();
  const filtered = entries.filter(
    (e) => !e.toLowerCase().includes(lowerKeyword)
  );
  const removed = entries.length - filtered.length;
  writeFileSync(filePath, filtered.join('\n---\n'), 'utf8');
  return removed;
}

export interface MemoryStats {
  entryCount: number;
  sizeBytes: number;
  filePath: string;
}

export function getMemoryStats(channelId: string, memoryFile?: string): MemoryStats {
  const filePath = resolveMemoryFilePath(channelId, memoryFile);
  if (!existsSync(filePath)) {
    return { entryCount: 0, sizeBytes: 0, filePath };
  }
  const content = readFileSync(filePath, 'utf8');
  const entryCount = content.trim()
    ? content.split(/\n---\n/).filter((e) => e.trim()).length
    : 0;
  const sizeBytes = statSync(filePath).size;
  return { entryCount, sizeBytes, filePath };
}

export function getMemoryContent(channelId: string, memoryFile?: string): string {
  return readChannelMemory(channelId, memoryFile);
}
