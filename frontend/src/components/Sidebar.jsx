import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Warehouse,
  BookOpen,
  ClipboardList,
  Wrench,
  Settings,
  BarChart2,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Logo from './Logo';

const ROLE_MAP = {
  'admin': 'admin',
  'technologist': 'technologist',
  'production_manager': 'production_manager',
  'warehouse': 'warehouse',
  'operator': 'operator',
};

const Sidebar = ({ collapsed, onToggle, userRole, onLinkClick }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const role = userRole || '';

  const menuItems = [
    { label: 'Дашборд', icon: LayoutDashboard, path: '/', roles: ['all'] },
    { label: 'Склад', icon: Warehouse, path: '/materials', roles: ['admin', 'technologist', 'warehouse', 'production_manager'] },
    { label: 'Техкарты', icon: BookOpen, path: '/techcards', roles: ['admin', 'technologist', 'production_manager'] },
    { label: 'Задачи', icon: ClipboardList, path: '/tasks', roles: ['admin', 'production_manager'] },
    { label: 'Цех', icon: Wrench, path: '/workshop', roles: ['admin', 'operator', 'production_manager'] },
    { label: 'Аналитика', icon: BarChart2, path: '/analytics', roles: ['admin', 'production_manager'] },
    { label: 'Чек-лист 5S', icon: ClipboardCheck, path: '/checklist', roles: ['admin', 'production_manager', 'operator'] },
    { label: 'Настройки', icon: Settings, path: '/settings', roles: ['admin'] }
  ];

  const visibleItems = menuItems.filter(item =>
    item.roles.includes('all') || item.roles.includes(role)
  );

  const isActive = (path) => location.pathname === path;

  return (
    <div className={`layout-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          {collapsed
            ? <Logo size={28} markOnly={true} />
            : <Logo size={28} />
          }
        </div>
      </div>

      <ul className="sidebar-menu">
        {visibleItems.map((item) => (
          <li key={item.path} className="sidebar-item">
            <button
              onClick={() => { navigate(item.path); onLinkClick?.(); }}
              className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
            >
              <item.icon size={20} />
              <span className="sidebar-label">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="sidebar-footer">
        <button className="sidebar-collapse-btn" onClick={onToggle}>
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
