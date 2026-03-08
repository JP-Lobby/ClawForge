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
    <nav className="w-52 bg-[#141210] border-r border-[#2c2520] flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[#2c2520]">
        <div className="flex items-center gap-2.5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 20 C6 14, 12 8, 18 4" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M10 20 C10 15, 15 10, 20 7" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
            <path d="M14 20 C14 16, 18 12, 22 10" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
          </svg>
          <div>
            <h1 className="font-display text-sm font-bold tracking-wide text-[#f0ebe4]">ClawForge</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  connected
                    ? 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]'
                    : 'bg-[#3a3028]'
                }`}
              />
              <span className="text-[10px] text-[#5c5040] font-mono">
                {connected ? 'live' : 'offline'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-2 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.label} className="mb-1">
            <div className="px-4 pt-4 pb-1 text-[9px] font-semibold tracking-[0.15em] text-[#3a3028] uppercase font-display">
              {group.label}
            </div>
            {group.links.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 py-2 pl-[14px] pr-4 text-xs transition-all duration-150 ${
                    isActive
                      ? 'bg-amber-950/40 text-amber-300 border-l-2 border-amber-400'
                      : 'text-[#9c8f80] hover:bg-[#252018] hover:text-[#f0ebe4] border-l-2 border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={14} className={isActive ? 'text-amber-400 shrink-0' : 'text-[#5c5040] shrink-0'} />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </div>
    </nav>
  );
}

export { Sidebar };
