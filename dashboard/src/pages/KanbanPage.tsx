import { useState, useEffect, useRef } from 'react'
import { fetchTasks, updateTask, createTask, deleteTask } from '../api/endpoints'
import { Task, TaskStatus, TaskPriority } from '../api/types'
import { useWebSocket } from '../hooks/useWebSocket'
import { Plus, Archive, RotateCcw, Trash2 } from 'lucide-react'

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  critical: 'bg-red-900/60 text-red-300 border border-red-800',
  high: 'bg-orange-900/60 text-orange-300 border border-orange-800',
  medium: 'bg-yellow-900/60 text-yellow-300 border border-yellow-800',
  low: 'bg-gray-800 text-gray-400 border border-gray-700',
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
      className="bg-gray-900 border border-gray-800 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-gray-700 transition-colors group"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-gray-200 leading-snug flex-1">{task.title}</p>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {task.status === 'done' && (
            <button onClick={onArchive} title="Archive" className="text-gray-500 hover:text-indigo-400 p-0.5">
              <Archive size={12} />
            </button>
          )}
          <button onClick={onDelete} title="Delete" className="text-gray-500 hover:text-red-400 p-0.5">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${PRIORITY_COLORS[task.priority]}`}>
          {task.priority}
        </span>
        {task.assignedAgent && (
          <span className="text-[10px] text-gray-500 truncate">{task.assignedAgent}</span>
        )}
        {task.dueDate && (
          <span className="text-[10px] text-gray-600">{new Date(task.dueDate).toLocaleDateString()}</span>
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
  accent?: string
}

function Column({ title, status, tasks, onDrop, onArchive, onDelete, onDragStart, accent = 'border-gray-700' }: ColumnProps) {
  const [over, setOver] = useState(false)

  return (
    <div
      className={`flex flex-col flex-1 min-w-0 bg-gray-900/50 rounded-lg border ${over ? 'border-indigo-600 bg-indigo-950/20' : accent}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={() => { setOver(false); onDrop(status) }}
    >
      <div className="p-3 border-b border-gray-800 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-300">{title}</span>
        <span className="text-xs text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">{tasks.length}</span>
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

  const active = tasks.filter(t => !['archive', 'done', 'cancelled'].includes(t.status))
  const done = tasks.filter(t => t.status === 'done')
  const archived = tasks.filter(t => t.status === 'archive')
  const completedPct = tasks.length > 0
    ? Math.round(((done.length + archived.length) / tasks.length) * 100)
    : 0

  const cols: { title: string; status: TaskStatus; accent?: string }[] = [
    { title: 'To Do', status: 'todo', accent: 'border-gray-700' },
    { title: 'In Progress', status: 'in_progress', accent: 'border-indigo-900' },
    { title: 'Done', status: 'done', accent: 'border-green-900' },
  ]

  if (loading) return <div className="p-6 text-gray-400 text-sm">Loading tasks…</div>

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Kanban</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-gray-800 rounded-full w-32">
              <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${completedPct}%` }} />
            </div>
            <span className="text-xs text-gray-500">{completedPct}% — {getMotivation(completedPct)}</span>
          </div>
        </div>
        <button
          onClick={() => setShowArchive(v => !v)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${showArchive ? 'bg-indigo-900/60 text-indigo-300' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}
        >
          <Archive size={13} />
          Archive {archived.length > 0 && `(${archived.length})`}
        </button>
      </div>

      {showArchive ? (
        <div className="flex-1 overflow-y-auto">
          <h2 className="text-sm font-semibold text-gray-400 mb-3">Archived Tasks</h2>
          <div className="space-y-2">
            {archived.length === 0 && <p className="text-gray-600 text-sm">No archived tasks.</p>}
            {archived.map(task => (
              <div key={task.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg p-3">
                <div>
                  <p className="text-sm text-gray-300">{task.title}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded mt-1 inline-block ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
                </div>
                <button onClick={() => handleRestore(task.id)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-400 transition-colors">
                  <RotateCcw size={12} /> Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex gap-3 min-h-0">
          {cols.map(({ title, status, accent }) => (
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
              accent={accent}
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
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-600"
          />
          <select
            value={newPriority}
            onChange={e => setNewPriority(e.target.value as TaskPriority)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-2 text-sm text-gray-300 focus:outline-none"
          >
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="critical">critical</option>
          </select>
          <button
            onClick={handleAdd}
            disabled={adding || !newTitle.trim()}
            className="flex items-center gap-1 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 text-white px-3 py-2 rounded-lg text-sm transition-colors"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      )}
    </div>
  )
}
