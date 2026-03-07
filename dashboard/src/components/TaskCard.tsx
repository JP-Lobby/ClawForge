import type { Task } from '../api/types.js';
import { StatusBadge, PriorityBadge } from './StatusBadge.js';

export default function TaskCard({ task }: { task: Task }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 hover:border-gray-700 transition-colors cursor-pointer">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-sm font-medium text-gray-100 truncate">{task.title}</span>
        <PriorityBadge priority={task.priority} />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge status={task.status} />
        {(task.assignedAgent ?? task.assigneeAgentId) && (
          <span className="text-xs text-gray-500">{task.assignedAgent ?? task.assigneeAgentId}</span>
        )}
        <span className="text-xs text-gray-600 ml-auto font-mono">{task.id.slice(0, 8)}</span>
      </div>
      {task.description && (
        <p className="text-xs text-gray-500 mt-2 truncate">{task.description}</p>
      )}
    </div>
  );
}

export { TaskCard }
