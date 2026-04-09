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
  ChevronRight,
  Layers,
  Grid2X2,
  Palette,
  Frame,
  Scissors,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useState } from 'react';
import Logo from './Logo';

const Sidebar = ({ collapsed, onToggle, userRole, onLinkClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [prodOpen, setProdOpen] = useState(true);

  const role = userRole || '';

  const mainItems = [
    { label: 'Панель показателей', icon: LayoutDashboard, path: '/',          roles: ['all'] },
    { label: 'Склад',              icon: Warehouse,        path: '/materials', roles: ['admin','technologist','warehouse','production_manager'] },
    { label: 'Техкарты',           icon: BookOpen,         path: '/techcards', roles: ['admin','technologist','production_manager'] },
    { label: 'Задачи',             icon: ClipboardList,    path: '/tasks',     roles: ['admin','production_manager'] },
    { label: 'Цех',                icon: Wrench,           path: '/workshop',  roles: ['admin','operator','production_manager'] },
    { label: 'Аналитика',          icon: BarChart2,        path: '/analytics', roles: ['admin','production_manager'] },
    { label: 'Чек-лист 5S',        icon: ClipboardCheck,   path: '/checklist', roles: ['admin','production_manager','operator'] },
    { label: 'Настройки',          icon: Settings,         path: '/settings',  roles: ['admin'] },
  ];

  // Production module submenu
  const prodItems = [
    { label: 'Партии',     icon: Layers,      path: '/batches',   roles: ['admin','production_manager','operator','technologist'] },
    { label: 'Сетки',      icon: Grid2X2,     path: '/screens',   roles: ['admin','production_manager','operator'] },
    { label: 'Краска',     icon: Palette,     path: '/ink',       roles: ['admin','production_manager','operator','technologist'] },
    { label: 'Печать',     icon: Frame,       path: '/printing',  roles: ['admin','production_manager','operator'] },
    { label: 'Вырубка',    icon: Scissors,    path: '/diecut',    roles: ['admin','production_manager','operator'] },
  ];

  const visible = (items) => items.filter(i => i.roles.includes('all') || i.roles.includes(role));
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const NavItem = ({ item }) => (
    <li className="sidebar-item">
      <button
        onClick={() => { navigate(item.path); onLinkClick?.(); }}
        className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
      >
        <item.icon size={20} />
        <span className="sidebar-label">{item.label}</span>
      </button>
    </li>
  );

  const prodVisible = visible(prodItems);
  const hasProdAccess = prodVisible.length > 0;

  return (
    <div className={`layout-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          {collapsed ? <Logo size={28} markOnly={true} /> : <Logo size={28} />}
        </div>
      </div>

      <ul className="sidebar-menu">
        {visible(mainItems).map(item => <NavItem key={item.path} item={item} />)}

        {/* Production modules section */}
        {hasProdAccess && (
          <>
            {!collapsed && (
              <li style={{ padding: '8px 12px 2px', listStyle: 'none' }}>
                <button
                  onClick={() => setProdOpen(o => !o)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                    color: '#94a3b8', fontSize: '11px', fontWeight: '600',
                    textTransform: 'uppercase', letterSpacing: '0.05em', padding: '2px 0'
                  }}
                >
                  <span>Производство</span>
                  {prodOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </li>
            )}
            {(prodOpen || collapsed) && prodVisible.map(item => <NavItem key={item.path} item={item} />)}
          </>
        )}
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
