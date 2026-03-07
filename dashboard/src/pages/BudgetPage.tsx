import { useApi } from '../hooks/useApi'
import { fetchAllAgentSpends } from '../api/endpoints'
import { LoadingState, ErrorState } from '../components/ErrorState'
import BudgetGauge from '../components/BudgetGauge'
import StatusBadge from '../components/StatusBadge'
import ProviderBadge from '../components/ProviderBadge'
import { DollarSign, TrendingUp, AlertTriangle } from 'lucide-react'

interface AgentSpend {
  agentName: string
  monthlySpentCents: number
  monthlyLimitCents: number
  paused: boolean
}

interface ProviderSpend {
  provider: string
  monthlySpentCents: number
}

function fmt(cents: number) {
  if (cents < 1) return `$${(cents / 100).toFixed(6)}`
  if (cents < 100) return `$${(cents / 100).toFixed(4)}`
  return `$${(cents / 100).toFixed(2)}`
}

export default function BudgetPage() {
  const { data, loading, error, refresh } = useApi(fetchAllAgentSpends, [])

  if (loading && !data) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={refresh} />

  const agents: AgentSpend[] = data?.agents ?? []
  const providers: ProviderSpend[] = data?.providers ?? []
  const totalCents = agents.reduce((s, a) => s + a.monthlySpentCents, 0)
  const totalLimitCents = agents.reduce((s, a) => s + a.monthlyLimitCents, 0)
  const pausedAgents = agents.filter(a => a.paused)

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Budget</h1>
        <p className="text-gray-400 text-sm mt-1">Monthly API spending by agent and provider</p>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} className="text-purple-400" />
            <span className="text-xs text-gray-500 uppercase tracking-wide">Total Spent (MTD)</span>
          </div>
          <div className="text-2xl font-bold text-gray-100">{fmt(totalCents)}</div>
          {totalLimitCents > 0 && (
            <div className="text-xs text-gray-400 mt-1">of {fmt(totalLimitCents)} limit</div>
          )}
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-indigo-400" />
            <span className="text-xs text-gray-500 uppercase tracking-wide">Active Agents</span>
          </div>
          <div className="text-2xl font-bold text-gray-100">{agents.length - pausedAgents.length}</div>
          <div className="text-xs text-gray-400 mt-1">of {agents.length} total</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-400" />
            <span className="text-xs text-gray-500 uppercase tracking-wide">Paused Agents</span>
          </div>
          <div className="text-2xl font-bold text-gray-100">{pausedAgents.length}</div>
          <div className="text-xs text-gray-400 mt-1">budget exceeded</div>
        </div>
      </div>

      {/* Per-agent */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">By Agent</h2>
        {agents.length === 0 ? (
          <p className="text-gray-500 text-sm">No agent spending data yet.</p>
        ) : (
          <div className="divide-y divide-gray-800">
            {agents.map(agent => (
              <div key={agent.agentName} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-200">{agent.agentName}</span>
                    {agent.paused && <StatusBadge status="blocked" size="sm" />}
                  </div>
                  <div className="text-sm font-mono text-gray-300">
                    {fmt(agent.monthlySpentCents)}
                    {agent.monthlyLimitCents > 0 && (
                      <span className="text-gray-500"> / {fmt(agent.monthlyLimitCents)}</span>
                    )}
                  </div>
                </div>
                <BudgetGauge spentCents={agent.monthlySpentCents} limitCents={agent.monthlyLimitCents} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Per-provider */}
      {providers.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">By Provider</h2>
          <div className="divide-y divide-gray-800">
            {providers.map(p => (
              <div key={p.provider} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                <ProviderBadge provider={p.provider} />
                <span className="text-sm font-mono text-gray-300">{fmt(p.monthlySpentCents)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
