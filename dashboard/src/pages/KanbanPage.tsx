import { useState, useEffect, useRef } from 'react'
import { fetchTasks, updateTask, createTask, deleteTask } from '../api/endpoints'
import { Task, TaskStatus, TaskPriority } from '../api/types'
import { useWebSocket } from '../hooks/useWebSocket'
import { Plus, Archive, RotateCcw, Trash2 } from 'lucide-react'

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  critical: 'bg-red-950/60 text-red-400 border border-red-900/60',
  high:     'bg-orange-950/60 text-orange-400 border border-orange-900/60',
  medium:   'bg-amber-950/60 text-amber-400 border border-amber-900/60',
  low:      'bg-[#1c1816] text-[#5c5040] border border-[#2c2520]',
}

const PRIORITY_BORDER: Record<TaskPriority, string> = {
  critical: 'border-l-2 border-l-red-500',
  high:     'border-l-2 border-l-orange-500',
  medium:   'border-l-2 border-l-amber-500',
  low:      'border-l-2 border-l-[#3a3028]',
}

const MOTIVATIONAL: [number, string][] = [
  [0, '🦴 Board empty — first task awaits!'],
  [25, '🐾 Getting started!'],
  [50, '⚡ Halfway there, keep clawing!'],
  [75, '🔥 Almost done!'],
  [100, '🎉 All done — ClawForge victorious!'],
]

function getMotivation(pct: number): string {
  let msg = MOTIVATIONAL[0][1] as string
  for (const [threshold, text] of MOTIVATIONAL) {
    if (pct >= threshold) msg = text as string
  }
  return msg
}

interface TaskCardProps {
  task: Task
  onDragStart: () => void
  onArchive: () => void
  onDelete: () => void
}

function TaskCard({ task, onDragStart, onArchive, onDelete }: TaskCardProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`bg-[#1c1816] border border-[#2c2520] rounded ${PRIORITY_BORDER[task.priority]} p-3 cursor-grab active:cursor-grabbing hover:border-[#3a3028] transition-all group`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-[#f0ebe4] leading-snug flex-1 font-mono">{task.title}</p>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {task.status === 'done' && (
            <button onClick={onArchive} title="Archive" className="text-[#3a3028] hover:text-amber-400 p-0.5 transition-colors">
              <Archive size={12} />
            </button>
          )}
          <button onClick={onDelete} title="Delete" className="text-[#3a3028] hover:text-red-400 p-0.5 transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-mono font-medium ${PRIORITY_COLORS[task.priority]}`}>
          {task.priority}
        </span>
        {task.assignedAgent && (
          <span className="text-[9px] text-[#3a3028] font-mono truncate">{task.assignedAgent}</span>
        )}
        {task.dueDate && (
          <span className="text-[9px] text-[#3a3028] font-mono">{new Date(task.dueDate).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  )
}

interface ColumnProps {
  title: string
  status: TaskStatus
  tasks: Task[]
  onDrop: (status: TaskStatus) => void
  onArchive: (id: string) => void
  onDelete: (id: string) => void
  onDragStart: (id: string) => void
  headerColor?: string
}

function Column({ title, status, tasks, onDrop, onArchive, onDelete, onDragStart, headerColor = 'text-[#9c8f80] border-t-[#504030]' }: ColumnProps) {
  const [over, setOver] = useState(false)

  return (
    <div
      className={`flex flex-col flex-1 min-w-0 rounded border border-t-2 transition-all ${
        over
          ? 'border-amber-600/60 bg-amber-950/10'
          : `bg-[#141210]/80 border-[#2c2520] ${headerColor.split(' ')[1]}`
      }`}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={() => { setOver(false); onDrop(status) }}
    >
      <div className="p-3 border-b border-[#2c2520] flex items-center justify-between">
        <span className={`text-xs font-display font-semibold ${headerColor.split(' ')[0]}`}>{title}</span>
        <span className="text-[10px] text-[#3a3028] bg-[#1c1816] px-1.5 py-0.5 rounded font-mono">{tasks.length}</span>
      </div>
      <div className="flex-1 p-2 space-y-2 min-h-[200px] overflow-y-auto">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onDragStart={() => onDragStart(task.id)}
            onArchive={() => onArchive(task.id)}
            onDelete={() => onDelete(task.id)}
          />
        ))}
      </div>
    </div>
  )
}

export default function KanbanPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showArchive, setShowArchive] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium')
  const [adding, setAdding] = useState(false)
  const dragId = useRef<string | null>(null)
  const { lastEvent } = useWebSocket()

  const load = async () => {
    try {
      const all = await fetchTasks()
      setTasks(all)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    if (lastEvent?.type === 'task:created' || lastEvent?.type === 'task:updated') load()
  }, [lastEvent])

  const handleDrop = async (targetStatus: TaskStatus) => {
    const id = dragId.current
    if (!id) return
    const task = tasks.find(t => t.id === id)
    if (!task || task.status === targetStatus) return
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: targetStatus } : t))
    await updateTask(id, { status: targetStatus }).catch(() => load())
  }

  const handleArchive = async (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'archive' } : t))
    await updateTask(id, { status: 'archive' }).catch(() => load())
  }

  const handleRestore = async (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'todo' } : t))
    await updateTask(id, { status: 'todo' }).catch(() => load())
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this task?')) return
    setTasks(prev => prev.filter(t => t.id !== id))
    await deleteTask(id).catch(() => load())
  }

  const handleAdd = async () => {
    if (!newTitle.trim()) return
    setAdding(true)
    try {
      const task = await createTask({ title: newTitle.trim(), priority: newPriority })
      setTasks(prev => [...prev, task])
      setNewTitle('')
    } finally {
      setAdding(false)
    }
  }

  const done = tasks.filter(t => t.status === 'done')
  const archived = tasks.filter(t => t.status === 'archive')
  const completedPct = tasks.length > 0
    ? Math.round(((done.length + archived.length) / tasks.length) * 100)
    : 0

  const cols: { title: string; status: TaskStatus; headerColor: string }[] = [
    { title: 'To Do', status: 'todo', headerColor: 'text-[#9c8f80] border-t-[#504030]' },
    { title: 'In Progress', status: 'in_progress', headerColor: 'text-amber-400 border-t-amber-500' },
    { title: 'Done', status: 'done', headerColor: 'text-emerald-400 border-t-emerald-600' },
  ]

  if (loading) return (
    <div className="p-6 space-y-2">
      <div className="h-4 w-24 bg-[#252018] rounded animate-pulse" />
      <div className="h-3 w-40 bg-[#1c1816] rounded animate-pulse" />
    </div>
  )

  return (
    <div className="p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-display font-bold text-[#f0ebe4]">Kanban</h1>
          <div className="flex items-center gap-2.5 mt-1.5">
            <div className="w-32 h-1 bg-[#2c2520] rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${completedPct}%` }}
              />
            </div>
            <span className="text-[10px] text-[#5c5040] font-mono">
              {completedPct}% — {getMotivation(completedPct)}
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowArchive(v => !v)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border transition-all font-mono ${
            showArchive
              ? 'bg-amber-900/40 text-amber-300 border-amber-800/60'
              : 'bg-[#1c1816] text-[#9c8f80] border-[#2c2520] hover:text-[#f0ebe4] hover:border-[#3a3028]'
          }`}
        >
          <Archive size={12} />
          Archive {archived.length > 0 && `(${archived.length})`}
        </button>
      </div>

      {showArchive ? (
        <div className="flex-1 overflow-y-auto">
          <h2 className="text-[10px] font-display font-semibold tracking-widest uppercase text-[#5c5040] mb-3">
            Archived Tasks
          </h2>
          <div className="space-y-2">
            {archived.length === 0 && (
              <p className="text-[#3a3028] text-xs font-mono">No archived tasks.</p>
            )}
            {archived.map(task => (
              <div key={task.id} className={`flex items-center justify-between border border-[#2c2520] rounded bg-[#1c1816] p-3 ${PRIORITY_BORDER[task.priority]}`}>
                <div>
                  <p className="text-xs text-[#9c8f80] font-mono">{task.title}</p>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-sm mt-1 inline-block font-mono ${PRIORITY_COLORS[task.priority]}`}>
                    {task.priority}
                  </span>
                </div>
                <button
                  onClick={() => handleRestore(task.id)}
                  className="flex items-center gap-1 text-xs text-[#5c5040] hover:text-amber-400 transition-colors font-mono"
                >
                  <RotateCcw size={11} /> Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex gap-3 min-h-0">
          {cols.map(({ title, status, headerColor }) => (
            <Column
              key={status}
              title={title}
              status={status}
              tasks={status === 'todo'
                ? tasks.filter(t => t.status === 'backlog' || t.status === 'todo')
                : tasks.filter(t => t.status === status)}
              onDrop={handleDrop}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onDragStart={(id) => { dragId.current = id }}
              headerColor={headerColor}
            />
          ))}
        </div>
      )}

      {/* Add task */}
      {!showArchive && (
        <div className="mt-3 flex items-center gap-2">
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="New task title…"
            className="flex-1 bg-[#141210] border border-[#2c2520] rounded px-3 py-2 text-xs text-[#f0ebe4] placeholder-[#3a3028] focus:outline-none focus:border-amber-600 font-mono transition-colors"
          />
          <select
            value={newPriority}
            onChange={e => setNewPriority(e.target.value as TaskPriority)}
            className="bg-[#141210] border border-[#2c2520] rounded px-2 py-2 text-xs text-[#9c8f80] focus:outline-none focus:border-amber-600 font-mono transition-colors"
          >
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="critical">critical</option>
          </select>
          <button
            onClick={handleAdd}
            disabled={adding || !newTitle.trim()}
            className="flex items-center gap-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-stone-950 font-display font-semibold px-3 py-2 rounded text-xs transition-colors"
          >
            <Plus size={13} /> Add
          </button>
        </div>
      )}
    </div>
  )
}
