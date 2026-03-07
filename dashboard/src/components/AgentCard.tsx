import type { Agent } from '../api/types.js';

export default function AgentCard({ agent }: { agent: Agent }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors cursor-pointer">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-100 capitalize">{agent.name}</h3>
        {agent.canPickTasks && (
          <span className="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded border border-green-800">autonomous</span>
        )}
      </div>
      {agent.description && (
        <p className="text-sm text-gray-400 mb-3 line-clamp-2">{agent.description}</p>
      )}
      <div className="text-xs text-gray-500 font-mono">
        {agent.provider ?? 'anthropic'} / {agent.model ?? 'default'}
      </div>
      {agent.handoffTo && agent.handoffTo.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {agent.handoffTo.map(h => (
            <span key={h} className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">→ {h}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export { AgentCard }
