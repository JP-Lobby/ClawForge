import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { fetchMemory, updateMemory, clearMemory, fetchChannels } from '../api/endpoints'
import { LoadingState, ErrorState } from '../components/ErrorState'
import { Save, ChevronDown, ChevronRight } from 'lucide-react'

function MemoryEditor({ channelId }: { channelId: string }) {
  const { data, loading, error, refresh } = useApi<{ content: string; sizeBytes: number }>(
    () => fetchMemory(channelId),
    [channelId]
  )
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [clearing, setClearing] = useState(false)

  function startEdit() {
    setContent(data?.content ?? '')
    setEditing(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateMemory(channelId, content)
      setEditing(false)
      refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleClear() {
    if (!confirm(`Clear all memory for channel "${channelId}"?`)) return
    setClearing(true)
    try {
      await clearMemory(channelId)
      setEditing(false)
      refresh()
    } finally {
      setClearing(false)
    }
  }

  if (loading && !data) return <div className="text-[#5c5040] text-xs font-mono p-3">Loading…</div>
  if (error) return <div className="text-red-400 text-sm p-3">{error}</div>

  const sizeKb = ((data?.sizeBytes ?? 0) / 1024).toFixed(1)

  return (
    <div className="mt-2 ml-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xs text-[#5c5040] font-mono">{sizeKb} KB</span>
        <button onClick={startEdit} className="text-xs text-amber-400 hover:text-amber-300 transition-colors">Edit</button>
        <button onClick={handleClear} disabled={clearing} className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors">
          {clearing ? 'Clearing…' : 'Clear'}
        </button>
      </div>
      {editing ? (
        <div>
          <textarea
            className="w-full bg-[#252018] border border-[#2c2520] rounded-md px-3 py-2 text-sm text-[#f0ebe4] font-mono focus:outline-none focus:border-amber-500 resize-y transition-colors"
            rows={10}
            value={content}
            onChange={e => setContent(e.target.value)}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-stone-950 font-display font-semibold px-3 py-1.5 rounded text-xs transition-colors"
            >
              <Save size={12} />
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="bg-[#252018] hover:bg-[#1c1816] text-[#9c8f80] px-3 py-1.5 rounded text-xs transition-colors font-mono"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <pre className="text-xs text-[#9c8f80] bg-[#252018] rounded p-3 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
          {data?.content || <span className="text-[#3a3028] italic">No memory stored</span>}
        </pre>
      )}
    </div>
  )
}

export default function MemoryPage() {
  const { data: channels, loading, error, refresh } = useApi(fetchChannels, [])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  function toggle(id: string) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  if (loading && !channels) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={refresh} />

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-[#f0ebe4] tracking-tight">Memory</h1>
        <p className="text-[#9c8f80] text-xs font-mono mt-1">Persistent memory per stateless channel</p>
      </div>

      <div className="space-y-2">
        {(channels ?? []).map((ch: any) => (
          <div key={ch.id} className="bg-[#1c1816] border border-[#2c2520] rounded p-4">
            <button
              onClick={() => toggle(ch.id)}
              className="w-full flex items-center justify-between text-left"
            >
              <div>
                <span className="text-sm font-display font-medium text-[#f0ebe4]">{ch.name || ch.id}</span>
                <span className="ml-2 text-xs text-[#5c5040] font-mono">{ch.id}</span>
              </div>
              {expanded[ch.id] ? <ChevronDown size={16} className="text-[#9c8f80]" /> : <ChevronRight size={16} className="text-[#9c8f80]" />}
            </button>
            {expanded[ch.id] && <MemoryEditor channelId={ch.id} />}
          </div>
        ))}
        {(channels ?? []).length === 0 && (
          <div className="text-center py-12 text-[#5c5040] text-xs font-mono">
            No channels configured yet.
          </div>
        )}
      </div>
    </div>
  )
}
