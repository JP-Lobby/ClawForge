import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, Bot, Brain, Hash, FlaskConical, Activity, DollarSign, Settings } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket.js';

const links = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/agents', icon: Bot, label: 'Agents' },
  { to: '/memory', icon: Brain, label: 'Memory' },
  { to: '/channels', icon: Hash, label: 'Channels' },
  { to: '/research', icon: FlaskConical, label: 'Research' },
  { to: '/activity', icon: Activity, label: 'Activity' },
  { to: '/budget', icon: DollarSign, label: 'Budget' },
  { to: '/settings', icon: Settings, label: 'Settings' },
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
        {links.map(({ to, icon: Icon, label }) => (
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
    </nav>
  );
}

export { Sidebar }
