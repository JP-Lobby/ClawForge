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

  const inputClass = "w-full bg-[#141210] border border-[#2c2520] rounded-md px-3 py-2 text-sm text-[#f0ebe4] placeholder-[#3a3028] focus:outline-none focus:border-amber-500 font-mono transition-colors"
  const sectionClass = "border border-[#2c2520] rounded bg-[#1c1816] p-5"
  const headingClass = "text-[10px] uppercase tracking-widest text-[#5c5040] font-display font-semibold mb-4"
  const labelClass = "text-[10px] text-[#5c5040] block mb-1 font-mono uppercase tracking-wider"
  const btnClass = "flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-display font-semibold px-4 py-2 rounded text-xs transition-colors"

  return (
    <div className="p-6 max-w-2xl space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-[#f0ebe4] tracking-tight">Settings</h1>
        <p className="text-[10px] text-[#3a3028] font-mono mt-1 uppercase tracking-wider">Dashboard configuration</p>
      </div>

      {/* Connection */}
      <div className={sectionClass}>
        <h2 className={headingClass}>Connection</h2>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>API URL</label>
            <input value={apiUrl} onChange={e => setApiUrl(e.target.value)} className={inputClass} placeholder="http://100.65.59.79:3001" />
          </div>
          <div>
            <label className={labelClass}>Auth Token</label>
            <input value={token} onChange={e => setToken(e.target.value)} type="password" className={inputClass} placeholder="••••••••" />
          </div>
          <button onClick={handleSaveConnection} className={btnClass}>
            <Save size={13} /> {saved ? 'Saved!' : 'Save & Reload'}
          </button>
        </div>
      </div>

      {/* Provider Health */}
      <div className={sectionClass}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={headingClass.replace(' mb-4', '')}>Provider Health</h2>
          <button onClick={refreshProviders} className="text-[#3a3028] hover:text-[#9c8f80] transition-colors">
            <RefreshCw size={12} />
          </button>
        </div>
        {providersLoading ? (
          <div className="h-3 w-24 bg-[#252018] rounded animate-pulse" />
        ) : (
          <div className="space-y-2.5">
            {(providers ?? []).map(p => (
              <div key={p.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {p.ok
                    ? <CheckCircle size={13} className="text-emerald-400" />
                    : <XCircle size={13} className="text-red-400" />
                  }
                  <span className="text-xs text-[#9c8f80] font-mono">{p.name}</span>
                </div>
                <span className="text-[10px] text-[#3a3028] font-mono">
                  {p.ok ? `${p.latencyMs ?? 0}ms` : (p.error ?? 'error')}
                </span>
              </div>
            ))}
            {(providers ?? []).length === 0 && (
              <p className="text-[#3a3028] text-xs font-mono">No providers configured.</p>
            )}
          </div>
        )}
      </div>

      {/* Discord Orchestrator Channel */}
      <div className={sectionClass}>
        <h2 className={headingClass}>Discord Orchestrator Channel</h2>
        <p className="text-[10px] text-[#3a3028] mb-3 font-mono">The Discord channel ID to use as the orchestrator entry point</p>
        <input
          value={orchestratorChannelId}
          onChange={e => setOrchestratorChannelId(e.target.value)}
          className={inputClass}
          placeholder="123456789012345678"
        />
        <button onClick={handleSaveChannel} className={`${btnClass} mt-3`}>
          <Save size={13} /> {channelSaved ? 'Saved!' : 'Save Channel'}
        </button>
      </div>

      {/* ClawForge Config JSON */}
      <div className={sectionClass}>
        <h2 className={headingClass}>ClawForge Config (JSON)</h2>
        <p className="text-[10px] text-[#3a3028] mb-3 font-mono">Raw orchestration/tasks/dashboard sections from clawforge.json</p>
        {configError && <p className="text-red-400 text-[10px] mb-2 font-mono">{configError}</p>}
        <textarea
          value={configJson}
          onChange={e => setConfigJson(e.target.value)}
          rows={12}
          className="w-full bg-[#0a0907] border border-[#2c2520] rounded-md px-3 py-2 text-[11px] text-amber-300 font-mono focus:outline-none focus:border-amber-500 resize-y transition-colors"
        />
        <button onClick={handleSaveConfig} className={`${btnClass} mt-3`}>
          <Save size={13} /> Save Config
        </button>
      </div>
    </div>
  )
}
