import { useApi } from '../hooks/useApi'
import { fetchWeeklyReport } from '../api/endpoints'
import { WeeklyReport } from '../api/types'
import { BarChart2, RefreshCw } from 'lucide-react'

function Bar({ value, max, color = 'bg-amber-500' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 4
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-[#252018] rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-[#9c8f80] w-6 text-right tabular-nums">{value}</span>
    </div>
  )
}

export default function ReportsPage() {
  const { data: report, loading, error, refresh } = useApi<WeeklyReport>(fetchWeeklyReport, [])

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#f0ebe4] tracking-tight">Reports</h1>
          <p className="text-[#9c8f80] text-xs font-mono mt-1">{report?.period ?? 'Weekly summary'}</p>
        </div>
        <button onClick={refresh} className="flex items-center gap-2 bg-[#1c1816] hover:bg-[#252018] border border-[#2c2520] hover:border-[#3a3028] text-[#9c8f80] px-3 py-2 rounded text-xs font-mono transition-all">
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {loading && <p className="text-[#5c5040] text-xs font-mono">Loading…</p>}
      {error && <p className="text-red-400 text-xs font-mono">Error: {error}</p>}

      {report && (
        <div className="space-y-6">
          {/* Key metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Tasks Created', value: report.tasksCreated, color: 'text-amber-400' },
              { label: 'Tasks Completed', value: report.tasksCompleted, color: 'text-emerald-400' },
              { label: 'Activity Events', value: report.activityCount, color: 'text-amber-300' },
              { label: 'Active Agents', value: report.topAgents.length, color: 'text-cyan-400' },
            ].map(m => (
              <div key={m.label} className="bg-[#1c1816] border border-[#2c2520] rounded p-4">
                <p className="text-[10px] text-[#5c5040] mb-1 uppercase tracking-wide font-display">{m.label}</p>
                <p className={`text-3xl font-display font-bold ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tasks by status */}
            <div className="bg-[#1c1816] border border-[#2c2520] rounded p-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 size={15} className="text-amber-400" />
                <h2 className="text-xs font-display font-semibold text-[#9c8f80] uppercase tracking-wide">Tasks by Status</h2>
              </div>
              <div className="space-y-2.5">
                {Object.entries(report.tasksByStatus).sort(([, a], [, b]) => b - a).map(([status, count]) => {
                  const max = Math.max(...Object.values(report.tasksByStatus))
                  const colors: Record<string, string> = { done: 'bg-emerald-500', in_progress: 'bg-amber-500', blocked: 'bg-red-500', todo: 'bg-amber-400', backlog: 'bg-[#3a3028]', cancelled: 'bg-red-900', archive: 'bg-[#252018]' }
                  return (
                    <div key={status}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#9c8f80] font-mono">{status.replace('_', ' ')}</span>
                      </div>
                      <Bar value={count} max={max} color={colors[status] ?? 'bg-[#3a3028]'} />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Top agents */}
            <div className="bg-[#1c1816] border border-[#2c2520] rounded p-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 size={15} className="text-cyan-400" />
                <h2 className="text-xs font-display font-semibold text-[#9c8f80] uppercase tracking-wide">Top Agents (by activity)</h2>
              </div>
              {report.topAgents.length === 0 ? (
                <p className="text-[#3a3028] text-xs font-mono">No agent activity this week.</p>
              ) : (
                <div className="space-y-2.5">
                  {report.topAgents.map(({ agent, count }) => {
                    const max = Math.max(...report.topAgents.map(a => a.count))
                    return (
                      <div key={agent}>
                        <div className="text-xs text-[#9c8f80] font-mono mb-1">{agent}</div>
                        <Bar value={count} max={max} color="bg-cyan-600" />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Tasks by agent */}
          {Object.keys(report.tasksByAgent).length > 0 && (
            <div className="bg-[#1c1816] border border-[#2c2520] rounded p-4">
              <h2 className="text-xs font-display font-semibold text-[#9c8f80] uppercase tracking-wide mb-4">Tasks Assigned per Agent (this week)</h2>
              <div className="space-y-2.5">
                {Object.entries(report.tasksByAgent).sort(([, a], [, b]) => b - a).map(([agent, count]) => {
                  const max = Math.max(...Object.values(report.tasksByAgent))
                  return (
                    <div key={agent}>
                      <div className="text-xs text-[#9c8f80] font-mono mb-1">{agent}</div>
                      <Bar value={count} max={max} color="bg-amber-600" />
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
