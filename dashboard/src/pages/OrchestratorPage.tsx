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
      setHistory(prev => [
        { id, agentName: selectedAgent, message: input, response: `Error: ${errMsg}`, timestamp: ts },
        ...prev,
      ].slice(0, 10))
    } finally {
      setStreaming(false)
      setLiveContent('')
    }
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-[#f0ebe4] tracking-tight">Orchestrator</h1>
        <p className="text-[10px] text-[#3a3028] font-mono mt-1 tracking-wider uppercase">Dispatch messages to agents</p>
      </div>

      {/* Terminal dispatch panel */}
      <div className="bg-[#0a0907] border border-[#2c2520] rounded p-5 mb-5 font-mono">
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="text-[10px] text-[#5c5040] font-mono tracking-widest uppercase mb-1 block">
              Agent
            </label>
            <select
              value={selectedAgent}
              onChange={e => setSelectedAgent(e.target.value)}
              className="w-full bg-[#141210] border border-[#2c2520] rounded-md px-3 py-2 text-sm text-amber-300 focus:outline-none focus:border-amber-500 font-mono transition-colors"
            >
              {(agents ?? []).map(a => (
                <option key={a.name} value={a.name}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>

        <label className="text-[10px] text-amber-500 font-mono tracking-widest uppercase mb-1 flex items-center gap-2">
          <span className="opacity-70">&gt;_</span> Message
        </label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleRun() }}
          placeholder="Type your message… (Ctrl+Enter to send)"
          rows={4}
          className="w-full bg-[#0a0907] border border-[#2c2520] rounded-md px-3 py-2.5 text-sm text-[#f0ebe4] placeholder-[#2c2520] focus:outline-none focus:border-amber-600 font-mono resize-none transition-colors"
        />
        <button
          onClick={handleRun}
          disabled={streaming || !selectedAgent || !message.trim()}
          className="mt-3 flex items-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-stone-950 font-display font-bold px-5 py-2 rounded text-sm transition-colors"
        >
          <Zap size={14} />
          {streaming ? 'Running…' : 'Run'}
        </button>
      </div>

      {/* Live stream */}
      {(streaming || liveContent) && (
        <div className="border border-amber-800/60 bg-[#0f0a02] rounded p-4 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-forge-pulse shadow-[0_0_8px_#f59e0b]" />
            <span className="text-xs text-amber-400 font-mono">live — {selectedAgent}</span>
          </div>
          <div
            ref={responseRef}
            className="text-sm text-[#f0ebe4] whitespace-pre-wrap max-h-64 overflow-y-auto font-mono leading-relaxed"
          >
            {liveContent || (
              <span className="text-[#3a3028] animate-pulse">Waiting for response…</span>
            )}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <h2 className="text-[10px] font-display font-semibold tracking-widest uppercase text-[#5c5040] mb-3">
            Recent Runs
          </h2>
          <div className="space-y-2">
            {history.map(run => (
              <div key={run.id} className="border border-[#2c2520] rounded bg-[#141210] overflow-hidden">
                <button
                  onClick={() => setExpandedId(expandedId === run.id ? null : run.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#252018] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] bg-amber-950/60 text-amber-400 px-2 py-0.5 rounded-sm font-mono">
                      {run.agentName}
                    </span>
                    <span className="text-xs text-[#9c8f80] truncate max-w-xs font-mono">{run.message}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#3a3028]">
                    <Clock size={11} />
                    <span className="text-[10px] font-mono">{new Date(run.timestamp).toLocaleTimeString()}</span>
                    {expandedId === run.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </div>
                </button>
                {expandedId === run.id && (
                  <div className="px-4 pb-4 border-t border-[#2c2520]">
                    <p className="text-[10px] text-[#3a3028] mt-3 mb-1 font-mono uppercase tracking-wider">Response:</p>
                    <p className="text-xs text-[#f0ebe4] whitespace-pre-wrap font-mono leading-relaxed">{run.response}</p>
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
