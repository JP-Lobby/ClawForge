import { useApi } from '../hooks/useApi'
import { useWebSocket } from '../hooks/useWebSocket'
import { fetchTaskStats, fetchAllAgentSpends, fetchActivity } from '../api/endpoints'
import { TaskStats, ActivityEntry } from '../api/types'
import { LoadingState, ErrorState } from '../components/ErrorState'
import ActivityFeed from '../components/ActivityFeed'
import BudgetGauge from '../components/BudgetGauge'
import StatusBadge from '../components/StatusBadge'
import { useEffect } from 'react'
import { CheckSquare, Bot, DollarSign, Activity } from 'lucide-react'

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  color?: string
}

function StatCard({ icon, label, value, sub, color = 'text-indigo-400' }: StatCardProps) {
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
  const { data: stats, loading: statsLoading, error: statsError, refresh: refreshStats } = useApi<TaskStats>(fetchTaskStats, [])
  const { data: budgetData, loading: budgetLoading, refresh: refreshBudget } = useApi(fetchAllAgentSpends, [])
  const { data: activity, loading: activityLoading, refresh: refreshActivity } = useApi(
    () => fetchActivity({ limit: 20 }),
    []
  )
  const { lastEvent } = useWebSocket()

  useEffect(() => {
    if (lastEvent?.type === 'task:created' || lastEvent?.type === 'task:updated') {
      refreshStats()
      refreshActivity()
    }
  }, [lastEvent])

  if (statsLoading && !stats) return <LoadingState />
  if (statsError) return <ErrorState message={statsError} onRetry={refreshStats} />

  const totalSpentCents = budgetData?.agents?.reduce((sum: number, a: any) => sum + (a.monthlySpentCents ?? 0), 0) ?? 0
  const totalLimitCents = budgetData?.agents?.reduce((sum: number, a: any) => sum + (a.monthlyLimitCents ?? 0), 0) ?? 0

  return (
    <div className="p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">System overview and recent activity</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<CheckSquare size={18} />}
          label="Total Tasks"
          value={stats?.total ?? 0}
          sub={`${stats?.inProgress ?? 0} in progress`}
        />
        <StatCard
          icon={<CheckSquare size={18} />}
          label="Completed"
          value={stats?.completed ?? 0}
          sub={`${stats?.failed ?? 0} failed`}
          color="text-green-400"
        />
        <StatCard
          icon={<Bot size={18} />}
          label="Pending Tasks"
          value={stats?.todo ?? 0}
          sub={`${stats?.blocked ?? 0} blocked`}
          color="text-yellow-400"
        />
        <StatCard
          icon={<DollarSign size={18} />}
          label="Monthly Spend"
          value={`$${((totalSpentCents) / 100).toFixed(2)}`}
          sub={totalLimitCents > 0 ? `of $${(totalLimitCents / 100).toFixed(2)} limit` : 'no limit set'}
          color="text-purple-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent activity */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-indigo-400" />
            <h2 className="text-sm font-semibold text-gray-300">Recent Activity</h2>
          </div>
          {activityLoading && !activity ? (
            <div className="text-gray-500 text-sm">Loading…</div>
          ) : (
            <ActivityFeed entries={activity?.entries ?? []} maxItems={15} />
          )}
        </div>

        {/* Budget overview */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={16} className="text-purple-400" />
            <h2 className="text-sm font-semibold text-gray-300">Agent Budgets</h2>
          </div>
          {budgetLoading && !budgetData ? (
            <div className="text-gray-500 text-sm">Loading…</div>
          ) : (
            <div className="space-y-3">
              {(budgetData?.agents ?? []).map((agent: any) => (
                <div key={agent.agentName}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-300">{agent.agentName}</span>
                    {agent.paused && <StatusBadge status="blocked" size="sm" />}
                  </div>
                  <BudgetGauge
                    spentCents={agent.monthlySpentCents}
                    limitCents={agent.monthlyLimitCents}
                  />
                </div>
              ))}
              {(budgetData?.agents ?? []).length === 0 && (
                <p className="text-gray-500 text-sm">No agent spend data yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
