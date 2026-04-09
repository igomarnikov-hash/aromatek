import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MaterialsPage from './pages/MaterialsPage';
import TechCardsPage from './pages/TechCardsPage';
import TasksPage from './pages/TasksPage';
import WorkshopPage from './pages/WorkshopPage';
import SettingsPage from './pages/SettingsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ChecklistPage from './pages/ChecklistPage';

// Production modules
import BatchesPage  from './pages/BatchesPage';
import ScreensPage  from './pages/ScreensPage';
import InkPage      from './pages/InkPage';
import PrintingPage from './pages/PrintingPage';
import DieCutPage   from './pages/DieCutPage';

const ProtectedRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#0f172a',
        color: '#f1f5f9'
      }}>
        <p>Загрузка системы...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Layout>
      <Routes>
        {/* Existing routes */}
        <Route path="/"           element={<DashboardPage />} />
        <Route path="/materials"  element={<MaterialsPage />} />
        <Route path="/techcards"  element={<TechCardsPage />} />
        <Route path="/tasks"      element={<TasksPage />} />
        <Route path="/workshop"   element={<WorkshopPage />} />
        <Route path="/analytics"  element={<AnalyticsPage />} />
        <Route path="/checklist"  element={<ChecklistPage />} />
        <Route path="/settings"   element={<SettingsPage />} />

        {/* Production module routes */}
        <Route path="/batches"    element={<BatchesPage />} />
        <Route path="/batches/:id" element={<BatchesPage />} />
        <Route path="/screens"    element={<ScreensPage />} />
        <Route path="/ink"        element={<InkPage />} />
        <Route path="/printing"   element={<PrintingPage />} />
        <Route path="/diecut"     element={<DieCutPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<ProtectedRoutes />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
