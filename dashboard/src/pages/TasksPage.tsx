import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { useWebSocket } from '../hooks/useWebSocket'
import { fetchTasks, createTask } from '../api/endpoints'
import { Task, TaskStatus, TaskPriority } from '../api/types'
import { LoadingState, ErrorState } from '../components/ErrorState'
import TaskCard from '../components/TaskCard'
import { Plus, Filter, Search } from 'lucide-react'

const STATUS_OPTIONS: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'done', 'failed', 'backlog']
const PRIORITY_OPTIONS: TaskPriority[] = ['critical', 'high', 'medium', 'low']

export default function TasksPage() {
  const [filterStatus, setFilterStatus] = useState<TaskStatus | ''>('')
  const [filterPriority, setFilterPriority] = useState<TaskPriority | ''>('')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium')
  const [creating, setCreating] = useState(false)

  const { data: tasks, loading, error, refresh } = useApi(
    () => fetchTasks({ status: filterStatus || undefined, priority: filterPriority || undefined }),
    [filterStatus, filterPriority]
  )
  const { lastEvent } = useWebSocket()

  useEffect(() => {
    if (lastEvent?.type === 'task:created' || lastEvent?.type === 'task:updated') {
      refresh()
    }
  }, [lastEvent])

  const filtered = (tasks ?? []).filter((t: Task) =>
    !search || t.title.toLowerCase().includes(search.toLowerCase())
  )

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setCreating(true)
    try {
      await createTask({ title: newTitle.trim(), description: newDesc.trim() || undefined, priority: newPriority })
      setNewTitle('')
      setNewDesc('')
      setNewPriority('medium')
      setShowCreate(false)
      refresh()
    } catch (err) {
      console.error('Failed to create task', err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Tasks</h1>
          <p className="text-gray-400 text-sm mt-1">{filtered.length} task{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          New Task
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Create Task</h3>
          <div className="space-y-3">
            <input
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              placeholder="Task title *"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              required
            />
            <textarea
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
              placeholder="Description (optional)"
              rows={2}
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
            />
            <select
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500"
              value={newPriority}
              onChange={e => setNewPriority(e.target.value as TaskPriority)}
            >
              {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              type="submit"
              disabled={creating}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            className="bg-gray-900 border border-gray-800 rounded px-3 pl-8 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-48"
            placeholder="Search tasks…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-gray-900 border border-gray-800 rounded px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as TaskStatus | '')}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          className="bg-gray-900 border border-gray-800 rounded px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value as TaskPriority | '')}
        >
          <option value="">All priorities</option>
          {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {loading && !tasks ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : (
        <div className="space-y-2">
          {filtered.map((task: Task) => (
            <Link key={task.id} to={`/tasks/${task.id}`} className="block">
              <TaskCard task={task} />
            </Link>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-500 text-sm">
              {search || filterStatus || filterPriority ? 'No tasks match your filters.' : 'No tasks yet. Create one above!'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
