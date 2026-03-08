import { useState, useEffect, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchAgent, fetchAgents, createAgent, updateAgent } from '../api/endpoints'
import { Agent } from '../api/types'
import { Save, ArrowLeft } from 'lucide-react'

const ALL_TOOLS = [
  'web_search', 'read_file', 'write_file', 'run_command', 'research',
  'task_manager', 'memory_read', 'memory_write', 'http_request',
]

const PROVIDERS = ['anthropic', 'openai', 'gemini', 'ollama']

export default function AgentEditPage() {
  const { name } = useParams<{ name?: string }>()
  const navigate = useNavigate()
  const isNew = !name || name === 'new'

  const [allAgents, setAllAgents] = useState<Agent[]>([])
  const [form, setForm] = useState<Agent>({
    name: '',
    description: '',
    provider: 'anthropic',
    model: 'claude-haiku-4-5-20251001',
    instructions: '',
    maxTurns: 20,
    tools: [],
    handoffTo: [],
    canPickTasks: false,
    taskPriorities: [],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAgents().then(setAllAgents).catch(console.error)
    if (!isNew && name) {
      fetchAgent(name).then(agent => setForm({ ...form, ...agent })).catch(console.error)
    }
  }, [name])

  const toggleTool = (tool: string) => {
    setForm(f => ({
      ...f,
      tools: f.tools?.includes(tool) ? f.tools.filter(t => t !== tool) : [...(f.tools ?? []), tool],
    }))
  }

  const toggleHandoff = (agentName: string) => {
    setForm(f => ({
      ...f,
      handoffTo: f.handoffTo?.includes(agentName) ? f.handoffTo.filter(n => n !== agentName) : [...(f.handoffTo ?? []), agentName],
    }))
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Agent name is required'); return }
    setSaving(true)
    setError('')
    try {
      if (isNew) {
        await createAgent(form)
      } else {
        await updateAgent(name!, form)
      }
      navigate('/agents')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save agent')
    } finally {
      setSaving(false)
    }
  }

  const field = (label: string, child: ReactNode, hint?: string) => (
    <div>
      <label className="text-sm font-medium text-gray-300 block mb-1.5">{label}</label>
      {child}
      {hint && <p className="text-xs text-gray-600 mt-1">{hint}</p>}
    </div>
  )

  const inputClass = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-600"

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/agents')} className="text-gray-500 hover:text-gray-300 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-100">{isNew ? 'New Agent' : `Edit ${name}`}</h1>
          <p className="text-gray-400 text-sm mt-0.5">Configure agent YAML settings</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-5">
        {error && <div className="text-red-400 text-sm bg-red-900/20 border border-red-900 rounded-lg px-3 py-2">{error}</div>}

        {field('Name', <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} disabled={!isNew} className={inputClass} placeholder="my-agent" />, isNew ? 'Lowercase, hyphens OK. Used as filename.' : 'Name cannot be changed.')}

        {field('Description', <input value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputClass} placeholder="What this agent does" />)}

        <div className="grid grid-cols-2 gap-4">
          {field('Provider',
            <select value={form.provider ?? 'anthropic'} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))} className={inputClass}>
              {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
          {field('Model',
            <input value={form.model ?? ''} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} className={inputClass} placeholder="claude-haiku-4-5-20251001" />
          )}
        </div>

        {field('Max Turns',
          <input type="number" value={form.maxTurns ?? 20} min={1} max={100} onChange={e => setForm(f => ({ ...f, maxTurns: Number(e.target.value) }))} className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-600" />,
          'Maximum agentic turns before stopping'
        )}

        {field('System Instructions',
          <textarea
            value={form.instructions ?? ''}
            onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
            rows={8}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-600 resize-y font-mono"
            placeholder="You are a helpful assistant that..."
          />,
          'System prompt that defines agent behavior'
        )}

        {field('Tools', (
          <div className="grid grid-cols-3 gap-2">
            {ALL_TOOLS.map(tool => (
              <label key={tool} className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                <input type="checkbox" checked={form.tools?.includes(tool) ?? false} onChange={() => toggleTool(tool)} className="accent-indigo-500" />
                {tool}
              </label>
            ))}
          </div>
        ), 'Select tools this agent can use')}

        {allAgents.length > 1 && field('Handoff To', (
          <div className="flex flex-wrap gap-2">
            {allAgents.filter(a => a.name !== form.name).map(a => (
              <label key={a.name} className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer bg-gray-800 px-2 py-1 rounded">
                <input type="checkbox" checked={form.handoffTo?.includes(a.name) ?? false} onChange={() => toggleHandoff(a.name)} className="accent-indigo-500" />
                {a.name}
              </label>
            ))}
          </div>
        ), 'Agents this agent can hand off to')}

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" checked={form.canPickTasks ?? false} onChange={e => setForm(f => ({ ...f, canPickTasks: e.target.checked }))} className="accent-indigo-500" />
            Can pick autonomous tasks
          </label>
        </div>

        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 text-white px-5 py-2 rounded-lg text-sm transition-colors">
          <Save size={14} />
          {saving ? 'Saving…' : 'Save Agent'}
        </button>
      </div>
    </div>
  )
}
