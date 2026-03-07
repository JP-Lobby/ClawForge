import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { fetchChannels } from '../api/endpoints'
import { Channel } from '../api/types'
import { LoadingState, ErrorState } from '../components/ErrorState'
import { ChevronDown, ChevronRight, Radio } from 'lucide-react'

function ChannelDetail({ channel }: { channel: Channel }) {
  return (
    <div className="mt-3 ml-4 space-y-2 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wide">Mode</span>
          <div className="text-gray-300 font-mono text-xs mt-0.5">{channel.mode ?? 'stateless'}</div>
        </div>
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wide">Memory Limit</span>
          <div className="text-gray-300 text-xs mt-0.5">{channel.memoryLimitKb ? `${channel.memoryLimitKb} KB` : 'default'}</div>
        </div>
        {channel.orchestration && (
          <>
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Agent</span>
              <div className="text-gray-300 font-mono text-xs mt-0.5">{channel.orchestration.entryAgent}</div>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Providers</span>
              <div className="text-gray-300 font-mono text-xs mt-0.5">
                {channel.orchestration.providers?.map((p: any) => p.name ?? p).join(', ') ?? '—'}
              </div>
            </div>
          </>
        )}
      </div>
      {channel.systemPrompt && (
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wide">System Prompt</span>
          <pre className="text-xs text-gray-400 bg-gray-800 rounded p-2 mt-1 whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">
            {channel.systemPrompt}
          </pre>
        </div>
      )}
    </div>
  )
}

export default function ChannelsPage() {
  const { data: channels, loading, error, refresh } = useApi<Channel[]>(fetchChannels, [])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  function toggle(id: string) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  if (loading && !channels) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={refresh} />

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Channels</h1>
        <p className="text-gray-400 text-sm mt-1">{(channels ?? []).length} stateless channel{(channels ?? []).length !== 1 ? 's' : ''} configured</p>
      </div>

      <div className="space-y-2">
        {(channels ?? []).map((ch: Channel) => (
          <div key={ch.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <button
              onClick={() => toggle(ch.id)}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <Radio size={14} className="text-indigo-400 flex-shrink-0" />
                <div>
                  <span className="text-sm font-medium text-gray-200">{ch.name || ch.id}</span>
                  <span className="ml-2 text-xs text-gray-500 font-mono">{ch.id}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{ch.mode ?? 'stateless'}</span>
                {expanded[ch.id] ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
              </div>
            </button>
            {expanded[ch.id] && <ChannelDetail channel={ch} />}
          </div>
        ))}
        {(channels ?? []).length === 0 && (
          <div className="text-center py-12 text-gray-500 text-sm">
            No channels configured. Add YAML files to{' '}
            <code className="text-gray-400">stateless-channels/channels/</code>
            {' '}and register them in{' '}
            <code className="text-gray-400">stateless-channels/registry.yaml</code>.
          </div>
        )}
      </div>
    </div>
  )
}
