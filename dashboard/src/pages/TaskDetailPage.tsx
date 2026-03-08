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
    if (lastEvent?.type === 'task:updated' && (lastEvent.data as { id?: string })?.id === id) {
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
        className="flex items-center gap-2 text-[#9c8f80] hover:text-[#f0ebe4] text-xs font-mono mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Tasks
      </button>

      <div className="bg-[#1c1816] border border-[#2c2520] rounded p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-xl font-display font-bold text-[#f0ebe4] flex-1">{task.title}</h1>
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border-t border-[#2c2520] pt-4">
          <div>
            <div className="flex items-center gap-1 mb-1 text-[#5c5040] text-[9px] uppercase tracking-wider font-display">
              <Calendar size={12} /> Created
            </div>
            <span className="text-[#9c8f80] text-xs font-mono">{fmtDate(task.createdAt)}</span>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1 text-[#5c5040] text-[9px] uppercase tracking-wider font-display">
              <Calendar size={12} /> Updated
            </div>
            <span className="text-[#9c8f80] text-xs font-mono">{fmtDate(task.updatedAt)}</span>
          </div>
          {task.assignedAgent && (
            <div>
              <div className="flex items-center gap-1 mb-1 text-[#5c5040] text-[9px] uppercase tracking-wider font-display">
                <User size={12} /> Agent
              </div>
              <span className="text-[#9c8f80] font-mono text-xs">{task.assignedAgent}</span>
            </div>
          )}
          {task.tags && task.tags.length > 0 && (
            <div>
              <div className="flex items-center gap-1 mb-1 text-[#5c5040] text-[9px] uppercase tracking-wider font-display">
                <Tag size={12} /> Tags
              </div>
              <div className="flex flex-wrap gap-1">
                {task.tags.map(tag => (
                  <span key={tag} className="bg-[#252018] text-[#9c8f80] px-2 py-0.5 rounded text-xs font-mono">{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {task.parentId && (
          <div className="mt-3 text-xs text-[#5c5040] font-mono">
            Subtask of <span className="text-[#9c8f80]">{task.parentId}</span>
          </div>
        )}

        {/* Status change */}
        <div className="mt-4 flex items-center gap-3 border-t border-[#2c2520] pt-4">
          <span className="text-xs text-[#5c5040] font-mono">Change status:</span>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.filter(s => s !== task.status).map(s => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                disabled={updatingStatus}
                className="text-xs bg-[#252018] hover:bg-[#1c1816] border border-[#2c2520] hover:border-[#3a3028] text-[#9c8f80] hover:text-[#f0ebe4] px-3 py-1 rounded transition-colors disabled:opacity-50 font-mono"
              >
                → {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Activity */}
      <div className="bg-[#1c1816] border border-[#2c2520] rounded p-4">
        <h2 className="text-[10px] font-display font-semibold text-[#9c8f80] uppercase tracking-widest mb-3">Activity Log</h2>
        {actLoading && !activity ? (
          <div className="text-[#5c5040] text-xs font-mono">Loading…</div>
        ) : (
          <ActivityFeed entries={activity?.entries ?? []} maxItems={50} />
        )}
      </div>
    </div>
  )
}
