import { useState, useRef, useEffect } from 'react'
import { fetchAgents, runOrchestrator } from '../api/endpoints'
import { Agent } from '../api/types'
import { useApi } from '../hooks/useApi'
import { Zap, Clock, ChevronDown, ChevronUp } from 'lucide-react'

interface RunRecord {
  id: string
  agentName: string
  message: string
  response: string
  timestamp: number
  turnsNote?: string
}

export default function OrchestratorPage() {
  const { data: agents } = useApi<Agent[]>(fetchAgents, [])
  const [selectedAgent, setSelectedAgent] = useState('')
  const [message, setMessage] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [liveContent, setLiveContent] = useState('')
  const [history, setHistory] = useState<RunRecord[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const responseRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (agents && agents.length > 0 && !selectedAgent) {
      setSelectedAgent(agents[0].name)
    }
  }, [agents])

  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight
    }
  }, [liveContent])

  const handleRun = async () => {
    if (!selectedAgent || !message.trim() || streaming) return
    setStreaming(true)
    setLiveContent('')
    const id = crypto.randomUUID()
    const ts = Date.now()
    const input = message.trim()
    setMessage('')

    try {
      const response = await runOrchestrator(selectedAgent, input, undefined, (chunk) => {
        setLiveContent(chunk)
      })
      const record: RunRecord = { id, agentName: selectedAgent, message: input, response, timestamp: ts }
      setHistory(prev => [record, ...prev].slice(0, 10))
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setHistory(prev => [{ id, agentName: selectedAgent, message: input, response: `Error: ${errMsg}`, timestamp: ts }, ...prev].slice(0, 10))
    } finally {
      setStreaming(false)
      setLiveContent('')
    }
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Orchestrator</h1>
        <p className="text-gray-400 text-sm mt-1">Dispatch messages directly to agents</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-6">
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">Agent</label>
            <select
              value={selectedAgent}
              onChange={e => setSelectedAgent(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-600"
            >
              {(agents ?? []).map(a => (
                <option key={a.name} value={a.name}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>
        <label className="text-xs text-gray-500 mb-1 block">Message</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleRun() }}
          placeholder="Type your message… (Ctrl+Enter to send)"
          rows={4}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-600 resize-none"
        />
        <button
          onClick={handleRun}
          disabled={streaming || !selectedAgent || !message.trim()}
          className="mt-3 flex items-center gap-2 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <Zap size={14} />
          {streaming ? 'Running…' : 'Run'}
        </button>
      </div>

      {/* Live stream */}
      {(streaming || liveContent) && (
        <div className="bg-gray-900 border border-indigo-900 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
            <span className="text-xs text-indigo-400 font-medium">Live response — {selectedAgent}</span>
          </div>
          <div ref={responseRef} className="text-sm text-gray-200 whitespace-pre-wrap max-h-64 overflow-y-auto font-mono">
            {liveContent || <span className="text-gray-600 animate-pulse">Waiting for response…</span>}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 mb-3">Recent Runs</h2>
          <div className="space-y-2">
            {history.map(run => (
              <div key={run.id} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedId(expandedId === run.id ? null : run.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded">{run.agentName}</span>
                    <span className="text-sm text-gray-300 truncate max-w-xs">{run.message}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock size={11} />
                    <span className="text-xs">{new Date(run.timestamp).toLocaleTimeString()}</span>
                    {expandedId === run.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </div>
                </button>
                {expandedId === run.id && (
                  <div className="px-4 pb-4 border-t border-gray-800">
                    <p className="text-xs text-gray-500 mt-3 mb-1">Response:</p>
                    <p className="text-sm text-gray-200 whitespace-pre-wrap font-mono">{run.response}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
