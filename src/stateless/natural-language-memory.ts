export interface NLMemoryResult {
  isMemoryTrigger: boolean;
  content: string;
}

const TRIGGERS: RegExp[] = [
  /^remember\s+that\s+(.+)/i,
  /^note\s+that\s+(.+)/i,
  /^keep\s+in\s+mind\s+(?:that\s+)?(.+)/i,
  /^don['']t\s+forget\s+that\s+(.+)/i,
  /^save\s+this:\s*(.+)/i,
  /^store\s+this:\s*(.+)/i,
  /^i\s+want\s+you\s+to\s+remember\s+(.+)/i,
  /^please\s+remember\s+(?:that\s+)?(.+)/i,
  /^make\s+a\s+note\s+that\s+(.+)/i,
];

export function detectNaturalLanguageMemoryTrigger(text: string): NLMemoryResult {
  const trimmed = text.trim();
  for (const pattern of TRIGGERS) {
    const match = trimmed.match(pattern);
    if (match) {
      return { isMemoryTrigger: true, content: match[1].trim() };
    }
  }
  return { isMemoryTrigger: false, content: '' };
}
