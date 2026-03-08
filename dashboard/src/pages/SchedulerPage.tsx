import { useState, useEffect } from 'react'
import { fetchSchedulerConfig, updateSchedulerConfig } from '../api/endpoints'
import { SchedulerConfig } from '../api/types'
import { Clock, Save } from 'lucide-react'

const INTERVAL_PRESETS = [
  { label: '30s', value: 30000 },
  { label: '1min', value: 60000 },
  { label: '5min', value: 300000 },
]

export default function SchedulerPage() {
  const [config, setConfig] = useState<SchedulerConfig | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchSchedulerConfig().then(setConfig).catch(console.error)
  }, [])

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    try {
      const updated = await updateSchedulerConfig(config)
      setConfig(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const inputClass = "bg-[#141210] border border-[#2c2520] rounded-md px-3 py-2 text-sm text-[#f0ebe4] focus:outline-none focus:border-amber-500 font-mono transition-colors"
  const labelClass = "text-xs font-display font-semibold text-[#9c8f80] uppercase tracking-wide block mb-2"

  if (!config) return (
    <div className="p-6 space-y-2">
      <div className="h-4 w-24 bg-[#252018] rounded animate-pulse" />
      <div className="h-3 w-40 bg-[#1c1816] rounded animate-pulse" />
    </div>
  )

  return (
    <div className="p-6 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-[#f0ebe4] tracking-tight">Scheduler</h1>
        <p className="text-[10px] text-[#3a3028] font-mono mt-1 uppercase tracking-wider">
          Configure autonomous task heartbeat settings
        </p>
      </div>

      {/* Settings card */}
      <div className="border border-[#2c2520] rounded bg-[#1c1816] p-6 space-y-6">
        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-display font-semibold text-[#f0ebe4]">Autonomous Tasks</p>
            <p className="text-[10px] text-[#5c5040] mt-0.5 font-mono">Enable the task scheduler heartbeat</p>
          </div>
          <button
            onClick={() => setConfig(c => c ? { ...c, enabled: !c.enabled } : c)}
            className={`relative w-11 h-6 rounded-full border transition-all ${
              config.enabled
                ? 'bg-amber-600 border-amber-500 shadow-[0_0_10px_#d9770620]'
                : 'bg-[#252018] border-[#3a3028]'
            }`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-[#0a0907] border border-[#3a3028] transition-transform ${
              config.enabled ? 'translate-x-[22px]' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {/* Heartbeat interval */}
        <div>
          <label className={labelClass}>Heartbeat Interval</label>
          <div className="flex gap-2 mb-3">
            {INTERVAL_PRESETS.map(p => (
              <button
                key={p.value}
                onClick={() => setConfig(c => c ? { ...c, heartbeatIntervalMs: p.value } : c)}
                className={`text-xs px-3 py-1.5 rounded border transition-all font-mono ${
                  config.heartbeatIntervalMs === p.value
                    ? 'bg-amber-900/60 text-amber-300 border-amber-700/60'
                    : 'bg-[#141210] text-[#9c8f80] border-[#2c2520] hover:text-[#f0ebe4] hover:border-[#3a3028]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={config.heartbeatIntervalMs}
              onChange={e => setConfig(c => c ? { ...c, heartbeatIntervalMs: Number(e.target.value) } : c)}
              min={5000}
              step={1000}
              className={`w-32 ${inputClass}`}
            />
            <span className="text-[10px] text-[#5c5040] font-mono">
              ms ({(config.heartbeatIntervalMs / 1000).toFixed(0)}s)
            </span>
          </div>
        </div>

        {/* Max concurrent */}
        <div>
          <label className={labelClass}>Max Concurrent Tasks</label>
          <input
            type="number"
            value={config.maxConcurrentTasks}
            onChange={e => setConfig(c => c ? { ...c, maxConcurrentTasks: Math.min(10, Math.max(1, Number(e.target.value))) } : c)}
            min={1} max={10}
            className={`w-24 ${inputClass}`}
          />
          <p className="text-[10px] text-[#3a3028] mt-1 font-mono">How many tasks can run in parallel (1–10)</p>
        </div>

        {/* Max request depth */}
        <div>
          <label className={labelClass}>Max Request Depth</label>
          <input
            type="number"
            value={config.maxRequestDepth}
            onChange={e => setConfig(c => c ? { ...c, maxRequestDepth: Math.min(10, Math.max(1, Number(e.target.value))) } : c)}
            min={1} max={10}
            className={`w-24 ${inputClass}`}
          />
          <p className="text-[10px] text-[#3a3028] mt-1 font-mono">Recursion depth for sub-task requests (1–10)</p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-stone-950 font-display font-bold px-4 py-2 rounded text-sm transition-colors"
        >
          <Save size={13} />
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

      {/* Status */}
      <div className="mt-4 border border-[#2c2520] rounded bg-[#141210] p-4">
        <div className="flex items-center gap-2">
          <Clock size={14} className={config.enabled ? 'text-amber-400' : 'text-[#3a3028]'} />
          <span className="text-xs text-[#9c8f80] font-mono">
            Scheduler is{' '}
            <span className={config.enabled ? 'text-amber-400' : 'text-[#3a3028]'}>
              {config.enabled ? 'enabled' : 'disabled'}
            </span>
            {config.enabled && ` — heartbeat every ${(config.heartbeatIntervalMs / 1000).toFixed(0)}s`}
          </span>
        </div>
      </div>
    </div>
  )
}
