import { Link } from 'react-router-dom'
import type { ActivityEntry } from '../api/types.js'

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

interface ActivityFeedProps {
  entries: ActivityEntry[];
  maxItems?: number;
  showTaskLink?: boolean;
}

export default function ActivityFeed({ entries, maxItems, showTaskLink }: ActivityFeedProps) {
  const displayed = maxItems ? entries.slice(0, maxItems) : entries;

  if (!displayed.length) return <p className="text-gray-500 text-sm">No activity yet.</p>;

  return (
    <div className="space-y-2">
      {displayed.map((entry) => (
        <div key={entry.id} className="flex items-start gap-3 text-sm">
          <span className="text-gray-500 shrink-0 mt-0.5 text-xs w-16">{relativeTime(entry.createdAt)}</span>
          <div className="flex-1 min-w-0">
            <span className="text-gray-300 font-medium">{entry.action}</span>
            {showTaskLink && entry.taskId && (
              <Link to={`/tasks/${entry.taskId}`} className="ml-2 text-xs text-indigo-400 hover:text-indigo-300 font-mono truncate">
                {entry.taskId.slice(0, 8)}
              </Link>
            )}
            {entry.details && <p className="text-gray-400 text-xs mt-0.5 truncate">{entry.details}</p>}
            {entry.actorId && <span className="text-xs text-gray-600"> — {entry.actorId}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// Named export for any legacy imports
export { ActivityFeed }
