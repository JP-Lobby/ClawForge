import { Link } from 'react-router-dom'
import type { ActivityEntry } from '../api/types.js'

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function dotColor(action: string): string {
  if (action.includes('created')) return 'bg-amber-500';
  if (action.includes('done') || action.includes('completed')) return 'bg-emerald-500';
  if (action.includes('updated') || action.includes('moved')) return 'bg-cyan-500';
  if (action.includes('deleted') || action.includes('error')) return 'bg-red-500';
  return 'bg-[#3a3028]';
}

interface ActivityFeedProps {
  entries: ActivityEntry[];
  maxItems?: number;
  showTaskLink?: boolean;
}

export default function ActivityFeed({ entries, maxItems, showTaskLink }: ActivityFeedProps) {
  const displayed = maxItems ? entries.slice(0, maxItems) : entries;

  if (!displayed.length) {
    return <p className="text-[#3a3028] text-xs font-mono">No activity yet.</p>;
  }

  return (
    <div className="relative pl-5">
      {/* vertical timeline line */}
      <div className="absolute left-[7px] top-1 bottom-1 w-px bg-[#2c2520]" />
      <div className="space-y-3">
        {displayed.map((entry) => (
          <div key={entry.id} className="flex items-start gap-3 relative">
            <span
              className={`absolute left-[-14px] top-1 w-2 h-2 rounded-full shrink-0 ${dotColor(entry.action)}`}
            />
            <div className="flex-1 min-w-0">
              <span className="text-[#f0ebe4] text-xs font-medium">{entry.action}</span>
              {showTaskLink && entry.taskId && (
                <Link
                  to={`/kanban/${entry.taskId}`}
                  className="ml-2 text-[10px] text-amber-500 hover:text-amber-400 font-mono"
                >
                  {entry.taskId.slice(0, 8)}
                </Link>
              )}
              {entry.details && (
                <p className="text-[#5c5040] text-[10px] mt-0.5 truncate">{entry.details}</p>
              )}
              {entry.actorId && (
                <span className="text-[10px] text-[#3a3028]"> — {entry.actorId}</span>
              )}
            </div>
            <span className="text-[10px] text-[#3a3028] shrink-0 tabular-nums">
              {relativeTime(entry.createdAt)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export { ActivityFeed }
