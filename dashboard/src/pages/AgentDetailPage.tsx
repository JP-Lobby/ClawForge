import { useParams, useNavigate } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { fetchAgent, fetchAllAgentSpends, reloadAgent } from '../api/endpoints'
import { Agent } from '../api/types'
import { LoadingState, ErrorState } from '../components/ErrorState'
import BudgetGauge from '../components/BudgetGauge'
import ProviderBadge from '../components/ProviderBadge'
import { ArrowLeft, RefreshCw, Bot, DollarSign, Cpu } from 'lucide-react'
import { useState } from 'react'

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-2 border-b border-gray-800 last:border-0">
      <span className="text-xs text-gray-500 uppercase tracking-wide w-32 flex-shrink-0 pt-0.5">{label}</span>
      <div className="text-sm text-gray-200 flex-1">{children}</div>
    </div>
  )
}

export default function AgentDetailPage() {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const [reloading, setReloading] = useState(false)

  const { data: agent, loading, error, refresh } = useApi<Agent>(
    () => fetchAgent(name!),
    [name]
  )
  const { data: budgetData } = useApi(fetchAllAgentSpends, [])

  const agentBudget = budgetData?.agents?.find((a: any) => a.agentName === name)

  async function handleReload() {
    setReloading(true)
    try {
      await reloadAgent(name!)
      refresh()
    } finally {
      setReloading(false)
    }
  }

  if (loading && !agent) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={refresh} />
  if (!agent) return <ErrorState message="Agent not found" />

  return (
    <div className="p-6 max-w-3xl">
      <button
        onClick={() => navigate('/agents')}
        className="flex items-center gap-2 text-gray-400 hover:text-gray-200 text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Agents
      </button>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-900/50 border border-indigo-800 rounded-lg flex items-center justify-center">
            <Bot size={20} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-100">{agent.name}</h1>
            {agent.description && <p className="text-gray-400 text-sm">{agent.description}</p>}
          </div>
        </div>
        <button
          onClick={handleReload}
          disabled={reloading}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg text-sm transition-colors"
        >
          <RefreshCw size={14} className={reloading ? 'animate-spin' : ''} />
          Reload
        </button>
      </div>

      {/* Config */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Cpu size={14} className="text-indigo-400" />
          <h2 className="text-sm font-semibold text-gray-300">Configuration</h2>
        </div>
        <InfoRow label="Provider">
          <ProviderBadge provider={agent.provider ?? 'anthropic'} model={agent.model} />
        </InfoRow>
        <InfoRow label="Model">
          <code className="font-mono text-xs bg-gray-800 px-2 py-0.5 rounded">{agent.model ?? 'default'}</code>
        </InfoRow>
        <InfoRow label="Max Turns">
          {agent.maxTurns ?? 10}
        </InfoRow>
        {agent.handoffTo && agent.handoffTo.length > 0 && (
          <InfoRow label="Handoff To">
            <div className="flex flex-wrap gap-1">
              {agent.handoffTo.map((h: string) => (
                <span key={h} className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-xs font-mono">{h}</span>
              ))}
            </div>
          </InfoRow>
        )}
        {agent.canPickTasks !== undefined && (
          <InfoRow label="Can Pick Tasks">
            <span className={agent.canPickTasks ? 'text-green-400' : 'text-gray-400'}>
              {agent.canPickTasks ? 'Yes' : 'No'}
            </span>
          </InfoRow>
        )}
        {agent.taskPriorities && agent.taskPriorities.length > 0 && (
          <InfoRow label="Task Priorities">
            <div className="flex flex-wrap gap-1">
              {agent.taskPriorities.map((p: string) => (
                <span key={p} className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-xs">{p}</span>
              ))}
            </div>
          </InfoRow>
        )}
        {agent.instructions && (
          <InfoRow label="Instructions">
            <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono bg-gray-800 rounded p-2 max-h-32 overflow-y-auto">{agent.instructions}</pre>
          </InfoRow>
        )}
      </div>

      {/* Budget */}
      {agentBudget && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign size={14} className="text-purple-400" />
            <h2 className="text-sm font-semibold text-gray-300">Budget</h2>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Monthly spend</span>
              <span className="text-gray-200 font-mono">${(agentBudget.monthlySpentCents / 100).toFixed(4)}</span>
            </div>
            {agentBudget.monthlyLimitCents > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Monthly limit</span>
                <span className="text-gray-200 font-mono">${(agentBudget.monthlyLimitCents / 100).toFixed(2)}</span>
              </div>
            )}
            <BudgetGauge spentCents={agentBudget.monthlySpentCents} limitCents={agentBudget.monthlyLimitCents} />
            {agentBudget.paused && (
              <div className="bg-red-900/30 border border-red-800 rounded p-2 text-sm text-red-300 text-center mt-2">
                Agent is paused — budget exceeded
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
