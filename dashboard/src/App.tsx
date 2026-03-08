import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import DashboardPage from './pages/DashboardPage'
import KanbanPage from './pages/KanbanPage'
import OrchestratorPage from './pages/OrchestratorPage'
import NotesPage from './pages/NotesPage'
import AgentsPage from './pages/AgentsPage'
import AgentEditPage from './pages/AgentEditPage'
import ActivityPage from './pages/ActivityPage'
import DocsPage from './pages/DocsPage'
import ReportsPage from './pages/ReportsPage'
import ChannelsPage from './pages/ChannelsPage'
import MemoryPage from './pages/MemoryPage'
import SchedulerPage from './pages/SchedulerPage'
import SettingsPage from './pages/SettingsPage'
import TaskDetailPage from './pages/TaskDetailPage'

function AppLayout() {
  return (
    <div className="flex h-screen bg-[#0a0907] text-[#f0ebe4] overflow-hidden font-mono">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="animate-enter opacity-0" style={{ animationFillMode: 'forwards' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/orchestrator" element={<OrchestratorPage />} />
            <Route path="/kanban" element={<KanbanPage />} />
            <Route path="/kanban/:id" element={<TaskDetailPage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/agents" element={<AgentsPage />} />
            <Route path="/agents/new" element={<AgentEditPage />} />
            <Route path="/agents/:name/edit" element={<AgentEditPage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/docs" element={<DocsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/channels" element={<ChannelsPage />} />
            <Route path="/memory" element={<MemoryPage />} />
            <Route path="/scheduler" element={<SchedulerPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  )
}
