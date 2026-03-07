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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Activity</h1>
          <p className="text-gray-400 text-sm mt-1">Global task activity log</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="bg-gray-900 border border-gray-800 rounded px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
          >
            {LIMIT_OPTIONS.map(l => (
              <option key={l} value={l}>Last {l}</option>
            ))}
          </select>
          <button
            onClick={refresh}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg text-sm transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {loading && !data ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <ActivityFeed entries={data?.entries ?? []} maxItems={limit} showTaskLink />
        </div>
      )}
    </div>
  )
}
