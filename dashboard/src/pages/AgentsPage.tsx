import { useApi } from '../hooks/useApi'
import { fetchAgents, reloadAgent } from '../api/endpoints'
import { Agent } from '../api/types'
import { LoadingState, ErrorState } from '../components/ErrorState'
import AgentCard from '../components/AgentCard'
import { Link } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { useState } from 'react'

export default function AgentsPage() {
  const { data: agents, loading, error, refresh } = useApi<Agent[]>(fetchAgents, [])
  const [reloading, setReloading] = useState<string | null>(null)

  async function handleReload(name: string) {
    setReloading(name)
    try {
      await reloadAgent(name)
      refresh()
    } catch (err) {
      console.error('Failed to reload agent', err)
    } finally {
      setReloading(null)
    }
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
        <button
          onClick={refresh}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg text-sm transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(agents ?? []).map((agent: Agent) => (
          <div key={agent.name} className="relative group">
            <Link to={`/agents/${agent.name}`} className="block">
              <AgentCard agent={agent} />
            </Link>
            <button
              onClick={(e) => { e.preventDefault(); handleReload(agent.name) }}
              disabled={reloading === agent.name}
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 p-1.5 rounded"
              title="Reload agent config"
            >
              <RefreshCw size={12} className={reloading === agent.name ? 'animate-spin' : ''} />
            </button>
          </div>
        ))}
        {(agents ?? []).length === 0 && (
          <div className="col-span-2 text-center py-12 text-gray-500 text-sm">
            No agents found. Add YAML files to the <code className="text-gray-400">agents/</code> directory.
          </div>
        )}
      </div>
    </div>
  )
}
