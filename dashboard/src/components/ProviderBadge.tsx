const providerColors: Record<string, string> = {
  anthropic: 'text-orange-300',
  openai: 'text-green-300',
  openrouter: 'text-blue-300',
  groq: 'text-purple-300',
  gemini: 'text-blue-400',
  ollama: 'text-gray-300',
};

interface ProviderBadgeProps {
  provider: string;
  model?: string;
}

export default function ProviderBadge({ provider, model }: ProviderBadgeProps) {
  const color = providerColors[provider?.toLowerCase()] ?? 'text-gray-300';
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" style={{ color: 'inherit' }} />
      <span className={`${color} font-medium`}>{provider}</span>
      {model && <span className="text-gray-500 text-xs font-mono">/ {model}</span>}
    </div>
  );
}

export { ProviderBadge }
