import type { TaskPriority } from '../api/types.js';

const statusColors: Record<string, string> = {
  backlog: 'bg-gray-700 text-gray-300',
  todo: 'bg-blue-800 text-blue-200',
  in_progress: 'bg-yellow-800 text-yellow-200',
  blocked: 'bg-red-800 text-red-200',
  done: 'bg-green-800 text-green-200',
  cancelled: 'bg-gray-800 text-gray-400',
  failed: 'bg-red-900 text-red-300',
};

const priorityColors: Record<TaskPriority, string> = {
  critical: 'bg-red-700 text-red-100',
  high: 'bg-orange-700 text-orange-100',
  medium: 'bg-yellow-700 text-yellow-100',
  low: 'bg-gray-700 text-gray-300',
};

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const cls = statusColors[status] ?? 'bg-gray-700 text-gray-300';
  const sizeClass = size === 'sm' ? 'px-1.5 py-0 text-xs' : 'px-2 py-0.5 text-xs';
  return <span className={`${sizeClass} rounded font-medium ${cls}`}>{status.replace('_', ' ')}</span>;
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[priority]}`}>{priority}</span>;
}

export default StatusBadge;
