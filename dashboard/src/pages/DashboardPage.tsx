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

function StatCard({
  icon, label, value, sub, color = 'text-amber-400', delay = 0,
}: {
  icon: ReactNode
  label: string
  value: string | number
  sub?: string
  color?: string
  delay?: number
}) {
  return (
    <div
      className="border border-[#2c2520] rounded bg-[#1c1816] p-4 animate-enter opacity-0"
      style={{ animationFillMode: 'forwards', animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className={color}>{icon}</span>
        <span className="text-[10px] tracking-widest uppercase font-display text-[#3a3028]">{label}</span>
      </div>
      <div className="text-3xl font-display font-bold text-[#f0ebe4]">{value}</div>
      {sub && <div className="text-[10px] text-[#5c5040] mt-1 font-mono">{sub}</div>}
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
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-[#f0ebe4] tracking-tight">Dashboard</h1>
        <p className="text-[10px] text-[#3a3028] font-mono mt-1 tracking-wider uppercase">Mission Control</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          icon={<CheckSquare size={16} />}
          label="Total Tasks"
          value={stats?.total ?? 0}
          sub={`${stats?.inProgress ?? 0} in progress`}
          delay={0}
        />
        <StatCard
          icon={<CheckSquare size={16} />}
          label="Done"
          value={stats?.completed ?? 0}
          sub={`${stats?.todo ?? 0} pending`}
          color="text-emerald-400"
          delay={60}
        />
        <StatCard
          icon={<Bot size={16} />}
          label="Agents"
          value={(agents ?? []).length}
          sub="configured"
          color="text-cyan-400"
          delay={120}
        />
        <StatCard
          icon={<StickyNote size={16} />}
          label="Notes"
          value={(notes ?? []).length}
          sub={`${pinnedNotes.length} pinned`}
          color="text-amber-300"
          delay={180}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Activity Feed */}
        <div className="lg:col-span-2 border border-[#2c2520] rounded bg-[#1c1816] p-4">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={14} className="text-amber-400" />
            <h2 className="text-[10px] font-display font-semibold tracking-widest uppercase text-[#5c5040]">
              Recent Activity
            </h2>
          </div>
          <ActivityFeed entries={activity?.entries ?? []} maxItems={15} />
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Agent status */}
          <div className="border border-[#2c2520] rounded bg-[#1c1816] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bot size={13} className="text-cyan-400" />
              <h2 className="text-[10px] font-display font-semibold tracking-widest uppercase text-[#5c5040]">
                Agent Status
              </h2>
            </div>
            {agentsLoading ? (
              <div className="h-3 w-24 bg-[#252018] rounded animate-pulse" />
            ) : (
              <div className="space-y-2">
                {(agents ?? []).map((agent, idx) => {
                  const color = AGENT_COLORS[idx % AGENT_COLORS.length]
                  const isActive = activeTasks[agent.name]
                  return (
                    <div
                      key={agent.name}
                      className="flex items-center gap-2.5 p-2 rounded"
                      style={{ background: `${color}08`, border: `1px solid ${color}25` }}
                    >
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'animate-forge-pulse' : ''}`}
                        style={{
                          background: isActive ? color : '#2c2520',
                          boxShadow: isActive ? `0 0 8px ${color}` : 'none',
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono font-medium truncate" style={{ color }}>{agent.name}</p>
                        <p className="text-[10px] text-[#3a3028] truncate font-mono">{agent.model ?? 'unknown model'}</p>
                      </div>
                    </div>
                  )
                })}
                {(agents ?? []).length === 0 && (
                  <p className="text-[#3a3028] text-xs font-mono">No agents configured.</p>
                )}
              </div>
            )}
          </div>

          {/* Pinned notes */}
          {pinnedNotes.length > 0 && (
            <div className="border border-[#2c2520] rounded bg-[#1c1816] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Pin size={12} className="text-amber-400" />
                  <h2 className="text-[10px] font-display font-semibold tracking-widest uppercase text-[#5c5040]">
                    Pinned Notes
                  </h2>
                </div>
                <button
                  onClick={() => navigate('/notes')}
                  className="text-[10px] text-amber-500 hover:text-amber-400 font-mono transition-colors"
                >
                  View all
                </button>
              </div>
              <div className="space-y-2">
                {pinnedNotes.map(note => (
                  <button
                    key={note.id}
                    onClick={() => navigate('/notes')}
                    className="w-full text-left border border-[#2c2520] rounded p-2.5 hover:bg-[#252018] hover:border-[#3a3028] transition-all"
                  >
                    <p className="text-xs text-[#9c8f80] font-mono line-clamp-2">{note.content}</p>
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
