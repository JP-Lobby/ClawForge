import { useParams, useNavigate } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { useWebSocket } from '../hooks/useWebSocket'
import { fetchTask, updateTask, fetchActivity } from '../api/endpoints'
import { Task, TaskStatus } from '../api/types'
import { LoadingState, ErrorState } from '../components/ErrorState'
import StatusBadge, { PriorityBadge } from '../components/StatusBadge'
import ActivityFeed from '../components/ActivityFeed'
import MarkdownView from '../components/MarkdownView'
import { ArrowLeft, Calendar, User, Tag } from 'lucide-react'
import { useEffect, useState } from 'react'

const STATUS_OPTIONS: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'done', 'failed', 'backlog']

function fmtDate(ts: number) {
  return new Date(ts).toLocaleString()
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const { data: task, loading, error, refresh } = useApi<Task>(
    () => fetchTask(id!),
    [id]
  )
  const { data: activity, loading: actLoading, refresh: refreshActivity } = useApi(
    () => fetchActivity({ taskId: id, limit: 50 }),
    [id]
  )
  const { lastEvent } = useWebSocket()

  useEffect(() => {
    if (lastEvent?.type === 'task:updated' && lastEvent.data?.id === id) {
      refresh()
      refreshActivity()
    }
  }, [lastEvent])

  async function handleStatusChange(status: TaskStatus) {
    if (!id) return
    setUpdatingStatus(true)
    try {
      await updateTask(id, { status })
      refresh()
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading && !task) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={refresh} />
  if (!task) return <ErrorState message="Task not found" />

  return (
    <div className="p-6 max-w-4xl">
      <button
        onClick={() => navigate('/tasks')}
        className="flex items-center gap-2 text-gray-400 hover:text-gray-200 text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Tasks
      </button>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-xl font-bold text-gray-100 flex-1">{task.title}</h1>
          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>
        </div>

        {task.description && (
          <div className="mb-4">
            <MarkdownView content={task.description} />
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-400 border-t border-gray-800 pt-4">
          <div>
            <div className="flex items-center gap-1 mb-1 text-gray-500 text-xs uppercase tracking-wide">
              <Calendar size={12} /> Created
            </div>
            <span className="text-gray-300">{fmtDate(task.createdAt)}</span>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1 text-gray-500 text-xs uppercase tracking-wide">
              <Calendar size={12} /> Updated
            </div>
            <span className="text-gray-300">{fmtDate(task.updatedAt)}</span>
          </div>
          {task.assignedAgent && (
            <div>
              <div className="flex items-center gap-1 mb-1 text-gray-500 text-xs uppercase tracking-wide">
                <User size={12} /> Agent
              </div>
              <span className="text-gray-300 font-mono text-xs">{task.assignedAgent}</span>
            </div>
          )}
          {task.tags && task.tags.length > 0 && (
            <div>
              <div className="flex items-center gap-1 mb-1 text-gray-500 text-xs uppercase tracking-wide">
                <Tag size={12} /> Tags
              </div>
              <div className="flex flex-wrap gap-1">
                {task.tags.map(tag => (
                  <span key={tag} className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-xs">{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {task.parentId && (
          <div className="mt-3 text-xs text-gray-500">
            Subtask of <span className="font-mono text-gray-400">{task.parentId}</span>
          </div>
        )}

        {/* Status change */}
        <div className="mt-4 flex items-center gap-3 border-t border-gray-800 pt-4">
          <span className="text-sm text-gray-400">Change status:</span>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.filter(s => s !== task.status).map(s => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                disabled={updatingStatus}
                className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded transition-colors disabled:opacity-50"
              >
                → {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Activity */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Activity Log</h2>
        {actLoading && !activity ? (
          <div className="text-gray-500 text-sm">Loading…</div>
        ) : (
          <ActivityFeed entries={activity?.entries ?? []} maxItems={50} />
        )}
      </div>
    </div>
  )
}
