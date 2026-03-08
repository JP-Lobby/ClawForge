import { useEffect, useState, type ReactNode } from 'react'
import { useApi } from '../hooks/useApi'
import { useWebSocket } from '../hooks/useWebSocket'
import { fetchTaskStats, fetchAgents, fetchActivity, fetchNotes } from '../api/endpoints'
import { TaskStats, Agent, Note } from '../api/types'
import { LoadingState, ErrorState } from '../components/ErrorState'
import ActivityFeed from '../components/ActivityFeed'
import { CheckSquare, Bot, StickyNote, Activity, Pin } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const AGENT_COLORS = ['#6366f1', '#06B6D4', '#F59E0B', '#10B981', '#EC4899']

function StatCard({ icon, label, value, sub, color = 'text-indigo-400' }: { icon: ReactNode; label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-2">
        <span className={color}>{icon}</span>
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-100">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { data: stats, loading: statsLoading, error: statsError, refresh: refreshStats } = useApi<TaskStats>(fetchTaskStats, [])
  const { data: agents, loading: agentsLoading } = useApi<Agent[]>(fetchAgents, [])
  const { data: activity, refresh: refreshActivity } = useApi(() => fetchActivity({ limit: 15 }), [])
  const { data: notes } = useApi<Note[]>(fetchNotes, [])
  const { lastEvent } = useWebSocket()
  const [activeTasks] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (lastEvent?.type === 'task:created' || lastEvent?.type === 'task:updated') {
      refreshStats(); refreshActivity()
    }
  }, [lastEvent])

  if (statsLoading && !stats) return <LoadingState />
  if (statsError) return <ErrorState message={statsError} onRetry={refreshStats} />

  const pinnedNotes = (notes ?? []).filter(n => n.pinned).slice(0, 3)

  return (
    <div className="p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Mission control overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<CheckSquare size={18} />} label="Total Tasks" value={stats?.total ?? 0} sub={`${stats?.inProgress ?? 0} in progress`} />
        <StatCard icon={<CheckSquare size={18} />} label="Done" value={stats?.completed ?? 0} sub={`${stats?.todo ?? 0} pending`} color="text-green-400" />
        <StatCard icon={<Bot size={18} />} label="Agents" value={(agents ?? []).length} sub="configured" color="text-cyan-400" />
        <StatCard icon={<StickyNote size={18} />} label="Notes" value={(notes ?? []).length} sub={`${pinnedNotes.length} pinned`} color="text-yellow-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-indigo-400" />
            <h2 className="text-sm font-semibold text-gray-300">Recent Activity</h2>
          </div>
          <ActivityFeed entries={activity?.entries ?? []} maxItems={15} />
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Agent status */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bot size={15} className="text-cyan-400" />
              <h2 className="text-sm font-semibold text-gray-300">Agent Status</h2>
            </div>
            {agentsLoading ? (
              <p className="text-gray-600 text-xs">Loading…</p>
            ) : (
              <div className="space-y-2">
                {(agents ?? []).map((agent, idx) => {
                  const color = AGENT_COLORS[idx % AGENT_COLORS.length]
                  const isActive = activeTasks[agent.name]
                  return (
                    <div key={agent.name} className="flex items-center gap-2.5 p-2 rounded-lg" style={{ background: `${color}10`, border: `1px solid ${color}30` }}>
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'animate-pulse' : ''}`}
                        style={{ background: isActive ? color : '#374151' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color }}>{agent.name}</p>
                        <p className="text-[10px] text-gray-600 truncate">{agent.model ?? 'unknown model'}</p>
                      </div>
                    </div>
                  )
                })}
                {(agents ?? []).length === 0 && <p className="text-gray-600 text-xs">No agents configured.</p>}
              </div>
            )}
          </div>

          {/* Pinned notes */}
          {pinnedNotes.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Pin size={13} className="text-yellow-400" />
                  <h2 className="text-sm font-semibold text-gray-300">Pinned Notes</h2>
                </div>
                <button onClick={() => navigate('/notes')} className="text-xs text-indigo-400 hover:text-indigo-300">View all</button>
              </div>
              <div className="space-y-2">
                {pinnedNotes.map(note => (
                  <button
                    key={note.id}
                    onClick={() => navigate('/notes')}
                    className="w-full text-left bg-gray-800/50 rounded p-2 hover:bg-gray-800 transition-colors"
                  >
                    <p className="text-xs text-gray-300 line-clamp-2">{note.content}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
