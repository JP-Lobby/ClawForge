import { useState, useEffect } from 'react'
import { getApiUrl, setApiUrl, getAuthToken, setAuthToken } from '../api/client'
import { fetchProviderStatus } from '../api/endpoints'
import ProviderBadge from '../components/ProviderBadge'
import { Save, CheckCircle, XCircle, RefreshCw, Server } from 'lucide-react'

interface ProviderStatus {
  name: string
  ok: boolean
  latencyMs?: number
  error?: string
}

export default function SettingsPage() {
  const [apiUrl, setApiUrlState] = useState(getApiUrl())
  const [token, setTokenState] = useState(getAuthToken())
  const [saved, setSaved] = useState(false)
  const [providers, setProviders] = useState<ProviderStatus[]>([])
  const [checkingProviders, setCheckingProviders] = useState(false)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setApiUrl(apiUrl.trim() || 'http://localhost:3001')
    setAuthToken(token.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function checkProviders() {
    setCheckingProviders(true)
    try {
      const result = await fetchProviderStatus()
      setProviders(result ?? [])
    } catch {
      setProviders([])
    } finally {
      setCheckingProviders(false)
    }
  }

  useEffect(() => {
    checkProviders()
  }, [])

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Dashboard connection and display preferences</p>
      </div>

      {/* Connection settings */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">API Connection</h2>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">
              API URL
            </label>
            <input
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 font-mono placeholder-gray-600 focus:outline-none focus:border-indigo-500"
              placeholder="http://localhost:3001"
              value={apiUrl}
              onChange={e => setApiUrlState(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">
              Auth Token
            </label>
            <input
              type="password"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 font-mono placeholder-gray-600 focus:outline-none focus:border-indigo-500"
              placeholder="Leave blank if not required"
              value={token}
              onChange={e => setTokenState(e.target.value)}
            />
            <p className="text-xs text-gray-600 mt-1">Stored in localStorage. Set DASHBOARD_TOKEN in your environment on the server.</p>
          </div>
          <button
            type="submit"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
          >
            <Save size={14} />
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </form>
      </div>

      {/* Provider health */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Server size={14} className="text-indigo-400" />
            <h2 className="text-sm font-semibold text-gray-300">Provider Health</h2>
          </div>
          <button
            onClick={checkProviders}
            disabled={checkingProviders}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            <RefreshCw size={12} className={checkingProviders ? 'animate-spin' : ''} />
            Re-check
          </button>
        </div>

        {checkingProviders && providers.length === 0 ? (
          <div className="text-gray-500 text-sm">Checking providers…</div>
        ) : providers.length === 0 ? (
          <div className="text-gray-500 text-sm">No provider status available. Configure providers in your <code className="text-gray-400">openclaw.json</code>.</div>
        ) : (
          <div className="space-y-2">
            {providers.map((p: ProviderStatus) => (
              <div key={p.name} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <ProviderBadge provider={p.name} />
                <div className="flex items-center gap-3">
                  {p.latencyMs && (
                    <span className="text-xs text-gray-500">{p.latencyMs}ms</span>
                  )}
                  {p.ok ? (
                    <div className="flex items-center gap-1 text-green-400 text-xs">
                      <CheckCircle size={14} />
                      <span>OK</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-red-400 text-xs" title={p.error}>
                      <XCircle size={14} />
                      <span>Error</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-4 text-xs text-gray-600 space-y-1">
        <p>ClawForge Dashboard — built with React + Vite + Tailwind</p>
        <p>Settings are stored in your browser's localStorage.</p>
      </div>
    </div>
  )
}
