import type { CommandParseResult, StatelessChannelConfig } from './types.js';
import {
  appendChannelMemory,
  clearChannelMemory,
  clearChannelMemoryByKeyword,
  getMemoryStats,
} from './memory-store.js';

export interface CommandResult {
  reply: string;
  isTerminal: boolean;
}

export function parseCommand(text: string): CommandParseResult {
  const trimmed = text.trim();

  if (!trimmed.startsWith('/')) {
    return { type: 'unknown', isCommand: false, isTerminal: false, raw: trimmed };
  }

  // /remember <text>
  const rememberMatch = trimmed.match(/^\/remember\s+(.+)/i);
  if (rememberMatch) {
    return {
      type: 'remember',
      isCommand: true,
      isTerminal: true,
      text: rememberMatch[1].trim(),
      raw: trimmed,
    };
  }

  // /forget [keyword]
  const forgetMatch = trimmed.match(/^\/forget(?:\s+(.+))?$/i);
  if (forgetMatch) {
    const keyword = forgetMatch[1]?.trim();
    return {
      type: keyword ? 'forget_keyword' : 'forget',
      isCommand: true,
      isTerminal: true,
      keyword,
      raw: trimmed,
    };
  }

  // /memory_N
  const memoryNMatch = trimmed.match(/^\/memory_(\d+)$/i);
  if (memoryNMatch) {
    return {
      type: 'memory_n',
      isCommand: true,
      isTerminal: false,
      n: parseInt(memoryNMatch[1], 10),
      raw: trimmed,
    };
  }

  // /status
  if (/^\/status$/i.test(trimmed)) {
    return { type: 'status', isCommand: true, isTerminal: true, raw: trimmed };
  }

  // /mode
  if (/^\/mode$/i.test(trimmed)) {
    return { type: 'mode', isCommand: true, isTerminal: true, raw: trimmed };
  }

  return { type: 'unknown', isCommand: true, isTerminal: false, raw: trimmed };
}

export function executeCommand(
  cmd: CommandParseResult,
  channelId: string,
  config?: StatelessChannelConfig
): CommandResult {
  switch (cmd.type) {
    case 'remember': {
      appendChannelMemory(channelId, cmd.text ?? '', config?.memoryFile);
      return { reply: `✅ Memory saved!`, isTerminal: true };
    }

    case 'forget': {
      clearChannelMemory(channelId, config?.memoryFile);
      return { reply: `🗑️ Channel memory cleared.`, isTerminal: true };
    }

    case 'forget_keyword': {
      const removed = clearChannelMemoryByKeyword(
        channelId,
        cmd.keyword ?? '',
        config?.memoryFile
      );
      return {
        reply: removed > 0
          ? `🗑️ Removed ${removed} memory entry/entries matching "${cmd.keyword}".`
          : `ℹ️ No memory entries matched "${cmd.keyword}".`,
        isTerminal: true,
      };
    }

    case 'status': {
      const stats = getMemoryStats(channelId, config?.memoryFile);
      const mode = config?.mode ?? 'unknown';
      const provider = config?.provider ?? 'default';
      const model = config?.model ?? 'default';
      return {
        reply: [
          `**Channel Status**`,
          `Mode: ${mode}`,
          `Memory: ${stats.entryCount} entries (~${Math.round(stats.sizeBytes / 1024)} KB)`,
          `Provider: ${provider} / ${model}`,
        ].join('\n'),
        isTerminal: true,
      };
    }

    case 'mode': {
      return {
        reply: `Current mode: **${config?.mode ?? 'unknown'}**. To change modes, edit the channel config YAML file and restart.`,
        isTerminal: true,
      };
    }

    default:
      return { reply: '', isTerminal: false };
  }
}

export function isMemoryCommand(text: string): boolean {
  return parseCommand(text).isCommand;
}

export function parseMemoryNCommand(text: string): number | null {
  const cmd = parseCommand(text);
  if (cmd.type === 'memory_n' && cmd.n !== undefined) return cmd.n;
  return null;
}
