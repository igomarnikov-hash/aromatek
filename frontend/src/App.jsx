import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'

// Базовые страницы
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import MaterialsPage from './pages/MaterialsPage'
import TechCardsPage from './pages/TechCardsPage'
import TasksPage from './pages/TasksPage'
import WorkshopPage from './pages/WorkshopPage'
import SettingsPage from './pages/SettingsPage'

// Производственные модули
import BatchesPage from './pages/BatchesPage'
import PrintingPage from './pages/PrintingPage'
import InkPage from './pages/InkPage'
import ScreensPage from './pages/ScreensPage'
import DieCutPage from './pages/DieCutPage'
import PerfumePage from './pages/PerfumePage'
import PackagingPage from './pages/PackagingPage'
import ChecklistPage from './pages/ChecklistPage'
import AnalyticsPage from './pages/AnalyticsPage'

function ProtectedRoutes() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/materials" element={<MaterialsPage />} />
        <Route path="/techcards" element={<TechCardsPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/workshop" element={<WorkshopPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        {/* Производственные модули */}
        <Route path="/batches" element={<BatchesPage />} />
        <Route path="/printing" element={<PrintingPage />} />
        <Route path="/ink" element={<InkPage />} />
        <Route path="/screens" element={<ScreensPage />} />
        <Route path="/diecut" element={<DieCutPage />} />
        <Route path="/perfume" element={<PerfumePage />} />
        <Route path="/packaging" element={<PackagingPage />} />
        <Route path="/checklist" element={<ChecklistPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </AuthProvider>
  )
}
