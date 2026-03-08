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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Agents</h1>
          <p className="text-gray-400 text-sm mt-1">{(agents ?? []).length} agent{(agents ?? []).length !== 1 ? 's' : ''} configured</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg text-sm transition-colors">
            <RefreshCw size={14} /> Refresh
          </button>
          <Link to="/agents/new" className="flex items-center gap-2 bg-indigo-700 hover:bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm transition-colors">
            <Plus size={14} /> New Agent
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(agents ?? []).map((agent: Agent) => (
          <div key={agent.name} className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors group">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-100 truncate">{agent.name}</p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{agent.description || 'No description'}</p>
              </div>
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={() => handleReload(agent.name)} disabled={reloading === agent.name} title="Reload config" className="text-gray-500 hover:text-gray-300 p-1.5 rounded transition-colors">
                  <RefreshCw size={13} className={reloading === agent.name ? 'animate-spin' : ''} />
                </button>
                <button onClick={() => navigate(`/agents/${agent.name}/edit`)} title="Edit" className="text-gray-500 hover:text-indigo-400 p-1.5 rounded transition-colors">
                  <Edit2 size={13} />
                </button>
                <button onClick={() => handleDelete(agent.name)} disabled={deleting === agent.name} title="Delete" className="text-gray-500 hover:text-red-400 p-1.5 rounded transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-[10px] bg-indigo-900/50 text-indigo-300 px-1.5 py-0.5 rounded">{agent.provider ?? 'anthropic'}</span>
              <span className="text-[10px] text-gray-600">{agent.model ?? 'default'}</span>
              {(agent.tools ?? []).length > 0 && (
                <span className="text-[10px] text-gray-600">{agent.tools!.length} tool{agent.tools!.length !== 1 ? 's' : ''}</span>
              )}
              {(agent.handoffTo ?? []).length > 0 && (
                <span className="text-[10px] text-gray-600">→ {agent.handoffTo!.join(', ')}</span>
              )}
              {agent.canPickTasks && (
                <span className="text-[10px] bg-green-900/50 text-green-400 px-1.5 py-0.5 rounded">autonomous</span>
              )}
            </div>
          </div>
        ))}
        {(agents ?? []).length === 0 && (
          <div className="col-span-2 text-center py-12 text-gray-500 text-sm">
            No agents found. <Link to="/agents/new" className="text-indigo-400 hover:text-indigo-300">Create one</Link>.
          </div>
        )}
      </div>
    </div>
  )
}
