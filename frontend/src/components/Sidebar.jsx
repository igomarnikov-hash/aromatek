import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, FileText, ClipboardList, Wrench,
  Settings, ChevronLeft, ChevronRight, Layers, Printer,
  Droplets, Scissors, Package2, FlaskConical, CheckSquare,
  BarChart2, Paintbrush
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const NAV_SECTIONS = [
  {
    label: 'Основное',
    items: [
      { path: '/dashboard',  label: 'Дашборд',    icon: LayoutDashboard, roles: ['admin','technologist','production_manager','warehouse','operator'] },
      { path: '/materials',  label: 'Склад',       icon: Package,         roles: ['admin','warehouse','production_manager'] },
      { path: '/techcards',  label: 'Тех. карты',  icon: FileText,        roles: ['admin','technologist','production_manager'] },
      { path: '/tasks',      label: 'Задачи',      icon: ClipboardList,   roles: ['admin','production_manager','operator'] },
      { path: '/workshop',   label: 'Цех',         icon: Wrench,          roles: ['admin','production_manager','operator'] },
    ]
  },
  {
    label: 'Производство',
    items: [
      { path: '/batches',    label: 'Партии',      icon: Layers,          roles: ['admin','production_manager','operator','technologist'] },
      { path: '/printing',   label: 'Печать',      icon: Printer,         roles: ['admin','production_manager','operator'] },
      { path: '/ink',        label: 'Краски',      icon: Paintbrush,      roles: ['admin','production_manager','operator'] },
      { path: '/screens',    label: 'Трафареты',   icon: Layers,          roles: ['admin','production_manager','technologist'] },
      { path: '/diecut',     label: 'Вырубка',     icon: Scissors,        roles: ['admin','production_manager','operator'] },
      { path: '/perfume',    label: 'Парфюм',      icon: Droplets,        roles: ['admin','production_manager','operator','technologist'] },
      { path: '/packaging',  label: 'Упаковка',    icon: Package2,        roles: ['admin','production_manager','operator'] },
    ]
  },
  {
    label: 'Контроль',
    items: [
      { path: '/checklist',  label: 'Чек-листы',   icon: CheckSquare,     roles: ['admin','production_manager','operator','technologist'] },
      { path: '/analytics',  label: 'Аналитика',   icon: BarChart2,       roles: ['admin','production_manager','technologist'] },
      { path: '/settings',   label: 'Настройки',   icon: Settings,        roles: ['admin'] },
    ]
  }
]

export default function Sidebar({ collapsed, onToggle }) {
  const { user } = useAuth()

  const filteredSections = NAV_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item => !user?.role || item.roles.includes(user.role))
  })).filter(section => section.items.length > 0)

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-logo">
        {!collapsed && <span className="logo-text">АромаПро</span>}
        {collapsed && <span className="logo-text" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>АП</span>}
      </div>

      <nav className="sidebar-nav" style={{ flex: 1, overflowY: 'auto' }}>
        {filteredSections.map((section, si) => (
          <div key={si}>
            {!collapsed && section.label && si > 0 && (
              <div style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--text-muted)',
                padding: '0.75rem 1rem 0.25rem',
                opacity: 0.6
              }}>
                {section.label}
              </div>
            )}
            {collapsed && si > 0 && (
              <div style={{ height: 1, background: 'var(--border-light)', margin: '0.5rem 0.75rem' }} />
            )}
            {section.items.map(({ path, label, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                title={collapsed ? label : ''}
              >
                <Icon size={18} className="nav-icon" />
                {!collapsed && <span className="nav-label">{label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <button className="sidebar-toggle" onClick={onToggle} title={collapsed ? 'Развернуть' : 'Свернуть'}>
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        {!collapsed && <span>Свернуть</span>}
      </button>
    </aside>
  )
}
