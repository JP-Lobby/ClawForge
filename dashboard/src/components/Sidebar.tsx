import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Zap, Columns, StickyNote, Bot, Activity,
  FolderOpen, BarChart2, Hash, Brain, Clock, Settings,
} from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket.js';

const groups = [
  {
    label: 'CONTROL',
    links: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/orchestrator', icon: Zap, label: 'Orchestrator' },
    ],
  },
  {
    label: 'WORK',
    links: [
      { to: '/kanban', icon: Columns, label: 'Kanban' },
      { to: '/notes', icon: StickyNote, label: 'Notes' },
    ],
  },
  {
    label: 'INTELLIGENCE',
    links: [
      { to: '/agents', icon: Bot, label: 'Agents' },
      { to: '/activity', icon: Activity, label: 'Activity' },
    ],
  },
  {
    label: 'DATA',
    links: [
      { to: '/docs', icon: FolderOpen, label: 'Docs' },
      { to: '/reports', icon: BarChart2, label: 'Reports' },
    ],
  },
  {
    label: 'CONFIGURE',
    links: [
      { to: '/channels', icon: Hash, label: 'Channels' },
      { to: '/memory', icon: Brain, label: 'Memory' },
      { to: '/scheduler', icon: Clock, label: 'Scheduler' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

export default function Sidebar() {
  const { connected } = useWebSocket();

  return (
    <nav className="w-52 bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-base font-bold text-gray-100">ClawForge</h1>
        <div className="flex items-center gap-1.5 mt-1">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-600'}`} />
          <span className="text-xs text-gray-500">{connected ? 'Live' : 'Disconnected'}</span>
        </div>
      </div>
      <div className="flex-1 py-2 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.label} className="mb-2">
            <div className="px-4 py-1.5 text-[10px] font-semibold tracking-widest text-gray-600 uppercase">
              {group.label}
            </div>
            {group.links.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-indigo-900/60 text-indigo-300 border-r-2 border-indigo-500'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                  }`
                }
              >
                <Icon size={15} />
                {label}
              </NavLink>
            ))}
          </div>
        ))}
      </div>
    </nav>
  );
}

export { Sidebar };
