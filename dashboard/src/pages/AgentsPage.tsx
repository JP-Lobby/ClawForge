import { useApi } from '../hooks/useApi'
import { fetchAgents, deleteAgent, reloadAgent } from '../api/endpoints'
import { Agent } from '../api/types'
import { LoadingState, ErrorState } from '../components/ErrorState'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, Edit2, Trash2 } from 'lucide-react'
import { useState } from 'react'

export default function AgentsPage() {
  const { data: agents, loading, error, refresh } = useApi<Agent[]>(fetchAgents, [])
  const [reloading, setReloading] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const navigate = useNavigate()

  async function handleReload(name: string) {
    setReloading(name)
    try { await reloadAgent(name); refresh() } catch (e) { console.error(e) } finally { setReloading(null) }
  }

  async function handleDelete(name: string) {
    if (!confirm(`Delete agent "${name}"? This removes the YAML file.`)) return
    setDeleting(name)
    try { await deleteAgent(name); refresh() } catch (e) { console.error(e) } finally { setDeleting(null) }
  }

  if (loading && !agents) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={refresh} />

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#f0ebe4] tracking-tight">Agents</h1>
          <p className="text-[10px] text-[#3a3028] font-mono mt-1 uppercase tracking-wider">
            {(agents ?? []).length} agent{(agents ?? []).length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="flex items-center gap-2 bg-[#1c1816] hover:bg-[#252018] border border-[#2c2520] hover:border-[#3a3028] text-[#9c8f80] px-3 py-2 rounded text-xs transition-all font-mono"
          >
            <RefreshCw size={13} /> Refresh
          </button>
          <Link
            to="/agents/new"
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-display font-bold px-3 py-2 rounded text-xs transition-colors"
          >
            <Plus size={13} /> New Agent
          </Link>
        </div>
      </div>

      {/* Agent grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(agents ?? []).map((agent: Agent) => (
          <div
            key={agent.name}
            className="border border-[#2c2520] rounded bg-[#1c1816] p-4 hover:border-[#3a3028] hover:bg-[#252018] transition-all group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-display font-semibold text-[#f0ebe4] truncate">{agent.name}</p>
                <p className="text-[10px] text-[#5c5040] mt-0.5 truncate font-mono">
                  {agent.description || 'No description'}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={() => handleReload(agent.name)}
                  disabled={reloading === agent.name}
                  title="Reload config"
                  className="text-[#3a3028] hover:text-[#9c8f80] p-1.5 rounded transition-colors"
                >
                  <RefreshCw size={12} className={reloading === agent.name ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={() => navigate(`/agents/${agent.name}/edit`)}
                  title="Edit"
                  className="text-[#3a3028] hover:text-amber-400 p-1.5 rounded transition-colors"
                >
                  <Edit2 size={12} />
                </button>
                <button
                  onClick={() => handleDelete(agent.name)}
                  disabled={deleting === agent.name}
                  title="Delete"
                  className="text-[#3a3028] hover:text-red-400 p-1.5 rounded transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-[9px] bg-amber-950/60 text-amber-400 px-1.5 py-0.5 rounded-sm font-mono uppercase tracking-wide">
                {agent.provider ?? 'anthropic'}
              </span>
              <span className="text-[9px] text-[#3a3028] font-mono">{agent.model ?? 'default'}</span>
              {(agent.tools ?? []).length > 0 && (
                <span className="text-[9px] text-[#3a3028] font-mono">
                  {agent.tools!.length} tool{agent.tools!.length !== 1 ? 's' : ''}
                </span>
              )}
              {(agent.handoffTo ?? []).length > 0 && (
                <span className="text-[9px] text-[#3a3028] font-mono">→ {agent.handoffTo!.join(', ')}</span>
              )}
              {agent.canPickTasks && (
                <span className="text-[9px] bg-emerald-950/60 text-emerald-400 px-1.5 py-0.5 rounded-sm font-mono">
                  autonomous
                </span>
              )}
            </div>
          </div>
        ))}
        {(agents ?? []).length === 0 && (
          <div className="col-span-2 text-center py-12 text-[#3a3028] text-xs font-mono">
            No agents found.{' '}
            <Link to="/agents/new" className="text-amber-500 hover:text-amber-400 transition-colors">
              Create one
            </Link>
            .
          </div>
        )}
      </div>
    </div>
  )
}
