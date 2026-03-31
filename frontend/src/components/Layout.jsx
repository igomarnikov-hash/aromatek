import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, X } from 'lucide-react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
};

const Layout = ({ children }) => {
  const isMobile = useIsMobile();
  // On mobile, sidebar starts closed; on desktop, starts open
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth <= 768);
  const [eventsPanelOpen, setEventsPanelOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Close sidebar when switching to mobile
  useEffect(() => {
    if (isMobile) setSidebarCollapsed(true);
    else setSidebarCollapsed(false);
  }, [isMobile]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
  };

  const closeSidebarOnMobile = () => {
    if (isMobile) setSidebarCollapsed(true);
  };

  const ROLE_LABELS = {
    'admin': 'Владелец',
    'technologist': 'Технолог',
    'production_manager': 'Нач. производства',
    'warehouse': 'Кладовщик',
    'operator': 'Оператор'
  };

  const userRole = user?.role || 'operator';
  const userRoleLabel = ROLE_LABELS[userRole] || userRole;
  const userName = user?.name || user?.fullName || 'Пользователь';
  const userInitials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const getAvatarColor = (role) => {
    const colors = {
      'admin': '#2563eb',
      'technologist': '#8b5cf6',
      'production_manager': '#06b6d4',
      'warehouse': '#f59e0b',
      'operator': '#10b981'
    };
    return colors[role] || user?.avatarColor || '#64748b';
  };

  return (
    <div className="layout">
      {/* Overlay backdrop on mobile when sidebar is open */}
      {isMobile && !sidebarCollapsed && (
        <div className="sidebar-overlay" onClick={closeSidebarOnMobile} />
      )}

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        userRole={userRole}
        onLinkClick={closeSidebarOnMobile}
      />

      <div className="layout-main">
        <div className="layout-topbar">
          <div className="topbar-left">
            {/* Hamburger button — visible always on mobile, acts as toggle */}
            <button
              className="hamburger-btn icon-btn"
              onClick={toggleSidebar}
              title="Меню"
              style={{ display: 'flex' }}
            >
              {isMobile && !sidebarCollapsed ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h2 className="topbar-title" style={{ margin: 0 }}>АромаТек</h2>
          </div>

          <div className="topbar-right">
            <button
              className="icon-btn"
              onClick={() => setEventsPanelOpen(!eventsPanelOpen)}
              title="Уведомления"
            >
              <Bell size={20} />
              <span className="icon-badge">3</span>
            </button>

            <div className="user-profile">
              <div
                className="user-avatar"
                style={{ backgroundColor: getAvatarColor(userRole) }}
              >
                {userInitials}
              </div>
              <div className="user-info">
                <div className="user-name">{userName}</div>
                <div className="user-role">{userRoleLabel}</div>
              </div>
            </div>

            <button
              className="icon-btn"
              onClick={handleLogout}
              title="Выход"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        <div className="layout-content">
          <div className="layout-content-wrapper">
            {children}
          </div>

          <div className={`layout-sidebar-right ${eventsPanelOpen ? '' : 'hidden'}`}>
            <h4>Последние события</h4>
            <div className="mt-3">
              <div className="card p-2 mb-2">
                <p className="text-sm text-muted">Материал поступил: Клей 500ml</p>
                <p className="text-xs text-muted">5 минут назад</p>
              </div>
              <div className="card p-2 mb-2">
                <p className="text-sm text-muted">Задача завершена: Упаковка партии #1052</p>
                <p className="text-xs text-muted">15 минут назад</p>
              </div>
              <div className="card p-2 mb-2">
                <p className="text-sm text-muted">Критический уровень: Эфирное масло</p>
                <p className="text-xs text-muted">30 минут назад</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;
