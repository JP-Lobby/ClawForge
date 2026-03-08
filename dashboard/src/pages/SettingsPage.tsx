import { useState, useEffect } from 'react'
import { fetchProviderStatus, fetchConfig, updateConfig } from '../api/endpoints'
import { ProviderStatus } from '../api/types'
import { useApi } from '../hooks/useApi'
import { CheckCircle, XCircle, RefreshCw, Save } from 'lucide-react'

const API_URL_KEY = 'cf_api_url'
const TOKEN_KEY = 'cf_token'

export default function SettingsPage() {
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem(API_URL_KEY) ?? '')
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? '')
  const [saved, setSaved] = useState(false)
  const [orchestratorChannelId, setOrchestratorChannelId] = useState('')
  const [channelSaved, setChannelSaved] = useState(false)
  const [configJson, setConfigJson] = useState('')
  const [configError, setConfigError] = useState('')

  const { data: providers, loading: providersLoading, refresh: refreshProviders } = useApi<ProviderStatus[]>(fetchProviderStatus, [])

  useEffect(() => {
    fetchConfig().then((cfg) => {
      const dashboard = cfg.dashboard as Record<string, unknown> | undefined
      setOrchestratorChannelId((dashboard?.orchestratorChannelId as string) ?? '')
      setConfigJson(JSON.stringify(cfg, null, 2))
    }).catch(console.error)
  }, [])

  const handleSaveConnection = () => {
    localStorage.setItem(API_URL_KEY, apiUrl)
    localStorage.setItem(TOKEN_KEY, token)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    window.location.reload()
  }

  const handleSaveChannel = async () => {
    await updateConfig({ dashboard: { orchestratorChannelId } })
    setChannelSaved(true)
    setTimeout(() => setChannelSaved(false), 2000)
  }

  const handleSaveConfig = async () => {
    setConfigError('')
    try {
      const parsed = JSON.parse(configJson) as Record<string, unknown>
      await updateConfig(parsed)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setConfigError(e instanceof Error ? e.message : 'Invalid JSON')
    }
  }

  const inputClass = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-600"

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Dashboard configuration</p>
      </div>

      {/* Connection */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">Connection</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">API URL</label>
            <input value={apiUrl} onChange={e => setApiUrl(e.target.value)} className={inputClass} placeholder="http://100.65.59.79:3001" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Auth Token</label>
            <input value={token} onChange={e => setToken(e.target.value)} type="password" className={inputClass} placeholder="••••••••" />
          </div>
          <button onClick={handleSaveConnection} className="flex items-center gap-2 bg-indigo-700 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
            <Save size={14} /> {saved ? 'Saved!' : 'Save & Reload'}
          </button>
        </div>
      </div>

      {/* Provider Health */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-300">Provider Health</h2>
          <button onClick={refreshProviders} className="text-gray-600 hover:text-gray-400 transition-colors">
            <RefreshCw size={13} />
          </button>
        </div>
        {providersLoading ? (
          <p className="text-gray-600 text-sm">Checking…</p>
        ) : (
          <div className="space-y-2">
            {(providers ?? []).map(p => (
              <div key={p.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {p.ok ? <CheckCircle size={14} className="text-green-400" /> : <XCircle size={14} className="text-red-400" />}
                  <span className="text-sm text-gray-300">{p.name}</span>
                </div>
                <span className="text-xs text-gray-600">
                  {p.ok ? `${p.latencyMs ?? 0}ms` : (p.error ?? 'error')}
                </span>
              </div>
            ))}
            {(providers ?? []).length === 0 && <p className="text-gray-600 text-sm">No providers configured.</p>}
          </div>
        )}
      </div>

      {/* Discord Orchestrator Channel */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-1">Discord Orchestrator Channel</h2>
        <p className="text-xs text-gray-600 mb-3">The Discord channel ID to use as the orchestrator entry point</p>
        <input
          value={orchestratorChannelId}
          onChange={e => setOrchestratorChannelId(e.target.value)}
          className={inputClass}
          placeholder="123456789012345678"
        />
        <button
          onClick={handleSaveChannel}
          className="mt-3 flex items-center gap-2 bg-indigo-700 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <Save size={14} /> {channelSaved ? 'Saved!' : 'Save Channel'}
        </button>
      </div>

      {/* ClawForge Config JSON */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-1">ClawForge Config (JSON)</h2>
        <p className="text-xs text-gray-600 mb-3">Raw orchestration/tasks/dashboard sections from openclaw.json</p>
        {configError && <p className="text-red-400 text-xs mb-2">{configError}</p>}
        <textarea
          value={configJson}
          onChange={e => setConfigJson(e.target.value)}
          rows={12}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 font-mono focus:outline-none focus:border-indigo-600 resize-y"
        />
        <button
          onClick={handleSaveConfig}
          className="mt-3 flex items-center gap-2 bg-indigo-700 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <Save size={14} /> Save Config
        </button>
      </div>
    </div>
  )
}
