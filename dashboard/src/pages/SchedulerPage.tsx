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

  if (!config) return <div className="p-6 text-gray-400 text-sm">Loading…</div>

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Scheduler</h1>
        <p className="text-gray-400 text-sm mt-1">Configure autonomous task heartbeat settings</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-6">
        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-200">Autonomous Tasks</p>
            <p className="text-xs text-gray-500 mt-0.5">Enable the task scheduler heartbeat</p>
          </div>
          <button
            onClick={() => setConfig(c => c ? { ...c, enabled: !c.enabled } : c)}
            className={`relative w-10 h-5 rounded-full transition-colors ${config.enabled ? 'bg-indigo-600' : 'bg-gray-700'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${config.enabled ? 'translate-x-5' : ''}`} />
          </button>
        </div>

        {/* Heartbeat interval */}
        <div>
          <label className="text-sm font-medium text-gray-200 block mb-2">Heartbeat Interval</label>
          <div className="flex gap-2 mb-2">
            {INTERVAL_PRESETS.map(p => (
              <button
                key={p.value}
                onClick={() => setConfig(c => c ? { ...c, heartbeatIntervalMs: p.value } : c)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${config.heartbeatIntervalMs === p.value ? 'bg-indigo-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}
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
              className="w-32 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-600"
            />
            <span className="text-xs text-gray-500">ms ({(config.heartbeatIntervalMs / 1000).toFixed(0)}s)</span>
          </div>
        </div>

        {/* Max concurrent */}
        <div>
          <label className="text-sm font-medium text-gray-200 block mb-2">Max Concurrent Tasks</label>
          <input
            type="number"
            value={config.maxConcurrentTasks}
            onChange={e => setConfig(c => c ? { ...c, maxConcurrentTasks: Math.min(10, Math.max(1, Number(e.target.value))) } : c)}
            min={1} max={10}
            className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-600"
          />
          <p className="text-xs text-gray-600 mt-1">How many tasks can run in parallel (1–10)</p>
        </div>

        {/* Max request depth */}
        <div>
          <label className="text-sm font-medium text-gray-200 block mb-2">Max Request Depth</label>
          <input
            type="number"
            value={config.maxRequestDepth}
            onChange={e => setConfig(c => c ? { ...c, maxRequestDepth: Math.min(10, Math.max(1, Number(e.target.value))) } : c)}
            min={1} max={10}
            className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-600"
          />
          <p className="text-xs text-gray-600 mt-1">Recursion depth for sub-task requests (1–10)</p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <Save size={14} />
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

      {/* Status */}
      <div className="mt-4 bg-gray-900 border border-gray-800 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Clock size={15} className={config.enabled ? 'text-green-400' : 'text-gray-600'} />
          <span className="text-sm text-gray-300">
            Scheduler is <span className={config.enabled ? 'text-green-400' : 'text-gray-500'}>{config.enabled ? 'enabled' : 'disabled'}</span>
            {config.enabled && ` — heartbeat every ${(config.heartbeatIntervalMs / 1000).toFixed(0)}s`}
          </span>
        </div>
      </div>
    </div>
  )
}
