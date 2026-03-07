import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
} from 'node:fs';
import path from 'node:path';

const COMPRESS_SIZE_THRESHOLD = 32 * 1024; // 32 KB
const COMPRESS_OLD_ENTRIES_THRESHOLD = 5;

export interface MemoryEntryParsed {
  content: string;
  timestamp: Date | null;
  raw: string;
}

export function parseMemoryEntries(content: string): MemoryEntryParsed[] {
  if (!content.trim()) return [];
  return content
    .split(/\n---\n/)
    .filter((e) => e.trim())
    .map((raw) => {
      const tsMatch = raw.match(/<!-- ([^>]+) -->/);
      const timestamp = tsMatch ? new Date(tsMatch[1]) : null;
      const textContent = raw.replace(/<!-- [^>]+ -->\n?/, '').trim();
      return { content: textContent, timestamp, raw };
    });
}

export function isEntryOld(entry: MemoryEntryParsed, olderThanDays: number): boolean {
  if (!entry.timestamp) return false;
  const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
  return entry.timestamp.getTime() < cutoff;
}

export function buildSummaryBlock(entries: MemoryEntryParsed[]): string {
  const timestamp = new Date().toISOString();
  const lines = entries.map((e) => `- ${e.content}`).join('\n');
  return `<!-- ${timestamp} -->\n[Compressed summary of ${entries.length} older entries]\n${lines}`;
}

export interface CompressResult {
  removedEntries: number;
  bytesSaved: number;
  filePath: string;
}

export interface CompressOptions {
  olderThanDays?: number;
}

export function shouldCompress(filePath: string): boolean {
  if (!existsSync(filePath)) return false;
  const stat = statSync(filePath);
  if (stat.size > COMPRESS_SIZE_THRESHOLD) return true;

  const content = readFileSync(filePath, 'utf8');
  const entries = parseMemoryEntries(content);
  const oldEntries = entries.filter((e) => isEntryOld(e, 30));
  return oldEntries.length >= COMPRESS_OLD_ENTRIES_THRESHOLD;
}

export function compressChannelMemory(
  filePath: string,
  opts: CompressOptions = {}
): CompressResult {
  const olderThanDays = opts.olderThanDays ?? 30;
  if (!existsSync(filePath)) {
    return { removedEntries: 0, bytesSaved: 0, filePath };
  }

  const originalContent = readFileSync(filePath, 'utf8');
  const entries = parseMemoryEntries(originalContent);
  const oldEntries = entries.filter((e) => isEntryOld(e, olderThanDays));
  const recentEntries = entries.filter((e) => !isEntryOld(e, olderThanDays));

  if (oldEntries.length === 0) {
    return { removedEntries: 0, bytesSaved: 0, filePath };
  }

  const summaryBlock = buildSummaryBlock(oldEntries);
  const newContent = [summaryBlock, ...recentEntries.map((e) => e.raw)]
    .filter(Boolean)
    .join('\n---\n');

  writeFileSync(filePath, newContent, 'utf8');

  const bytesSaved = Buffer.byteLength(originalContent) - Buffer.byteLength(newContent);
  return { removedEntries: oldEntries.length, bytesSaved, filePath };
}

export interface CompressAllResult {
  total: number;
  compressed: number;
  skipped: number;
}

export function compressAllMemoryFiles(
  dir: string,
  opts: CompressOptions = {}
): CompressAllResult {
  if (!existsSync(dir)) return { total: 0, compressed: 0, skipped: 0 };

  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  let compressed = 0;
  let skipped = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    if (shouldCompress(filePath)) {
      compressChannelMemory(filePath, opts);
      compressed++;
    } else {
      skipped++;
    }
  }

  return { total: files.length, compressed, skipped };
}
