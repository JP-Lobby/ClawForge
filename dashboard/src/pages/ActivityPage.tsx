import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi'
import { useWebSocket } from '../hooks/useWebSocket'
import { fetchActivity } from '../api/endpoints'
import { LoadingState, ErrorState } from '../components/ErrorState'
import ActivityFeed from '../components/ActivityFeed'
import { RefreshCw } from 'lucide-react'

const LIMIT_OPTIONS = [50, 100, 200, 500]

export default function ActivityPage() {
  const [limit, setLimit] = useState(100)
  const { data, loading, error, refresh } = useApi(
    () => fetchActivity({ limit }),
    [limit]
  )
  const { lastEvent } = useWebSocket()

  useEffect(() => {
    if (lastEvent?.type === 'task:created' || lastEvent?.type === 'task:updated') {
      refresh()
    }
  }, [lastEvent])

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#f0ebe4] tracking-tight">Activity</h1>
          <p className="text-[10px] text-[#3a3028] font-mono mt-1 uppercase tracking-wider">Global task activity log</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="bg-[#141210] border border-[#2c2520] rounded px-3 py-2 text-xs text-[#9c8f80] focus:outline-none focus:border-amber-500 font-mono transition-colors"
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
          >
            {LIMIT_OPTIONS.map(l => (
              <option key={l} value={l}>Last {l}</option>
            ))}
          </select>
          <button
            onClick={refresh}
            className="flex items-center gap-2 bg-[#1c1816] hover:bg-[#252018] border border-[#2c2520] hover:border-[#3a3028] text-[#9c8f80] px-3 py-2 rounded text-xs transition-all font-mono"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
      </div>

      {loading && !data ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : (
        <div className="border border-[#2c2520] rounded bg-[#1c1816] p-5">
          <ActivityFeed entries={data?.entries ?? []} maxItems={limit} showTaskLink />
        </div>
      )}
    </div>
  )
}
