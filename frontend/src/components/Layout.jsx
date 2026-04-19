import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Bell, LogOut, X, AlertTriangle, AlertCircle, Info,
  CheckCheck, Trash2, Package, ClipboardList, Layers, Settings2
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Sidebar from './Sidebar'
import api from '../api'

// ─── Иконки и цвета по типу уведомления ──────────────────────────────────
const TYPE_CONFIG = {
  critical: { icon: AlertCircle, color: '#dc2626', bg: 'rgba(220,38,38,0.12)', label: 'Критично' },
  warning:  { icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Предупреждение' },
  info:     { icon: Info, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: 'Информация' },
}

const CATEGORY_ICON = {
  stock:  Package,
  task:   ClipboardList,
  batch:  Layers,
  system: Settings2,
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'только что'
  if (m < 60) return `${m} мин. назад`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} ч. назад`
  return `${Math.floor(h / 24)} дн. назад`
}

// ─── Демо-уведомления (работают без сервера) ─────────────────────────────
const DEMO_NOTIFICATIONS = [
  { id: 1, type: 'critical', category: 'stock', title: 'Критический уровень запасов', message: 'Масло лаванда: осталось 5.5 л (мин. 10 л)', link: '/materials', is_read: 0, created_at: new Date(Date.now() - 600000).toISOString() },
  { id: 2, type: 'critical', category: 'stock', title: 'Критический уровень запасов', message: 'Масло новый автомобиль: осталось 8.2 л (мин. 10 л)', link: '/materials', is_read: 0, created_at: new Date(Date.now() - 1200000).toISOString() },
  { id: 3, type: 'warning', category: 'task', title: 'Задача выполняется слишком долго', message: 'Задача #1 «Ароматизатор Лимон» в работе уже 9 ч. (исполнитель: Николай С.)', link: '/tasks', is_read: 0, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 4, type: 'info', category: 'task', title: 'Контроль качества', message: '1 задача ожидает проверки качества', link: '/tasks', is_read: 1, created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 5, type: 'warning', category: 'stock', title: 'Запас подходит к минимуму', message: 'Абсорбирующий материал: 18.5 кг (мин. 20 кг)', link: '/materials', is_read: 1, created_at: new Date(Date.now() - 10800000).toISOString() },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showNotifs, setShowNotifs] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const panelRef = useRef(null)

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000) // обновление каждую минуту
    return () => clearInterval(interval)
  }, [])

  // Закрытие панели при клике вне её
  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        const bellBtn = document.querySelector('.bell-btn')
        if (bellBtn && !bellBtn.contains(e.target)) {
          setShowNotifs(false)
        }
      }
    }
    if (showNotifs) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showNotifs])

  // Закрытие при смене маршрута
  useEffect(() => {
    setShowNotifs(false)
  }, [location.pathname])

  async function fetchNotifications() {
    try {
      const data = await api.get('/notifications')
      setNotifications(data.data || DEMO_NOTIFICATIONS)
      setUnreadCount(data.unread_count ?? 0)
    } catch {
      setNotifications(DEMO_NOTIFICATIONS)
      setUnreadCount(DEMO_NOTIFICATIONS.filter(n => !n.is_read).length)
    }
  }

  async function markAsRead(id) {
    try {
      await api.put(`/notifications/${id}/read`)
    } catch {}
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  async function markAllAsRead() {
    try {
      await api.put('/notifications/read-all')
    } catch {}
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })))
    setUnreadCount(0)
  }

  async function clearRead() {
    try {
      await api.delete('/notifications/read')
    } catch {}
    setNotifications(prev => prev.filter(n => !n.is_read))
  }

  function handleNotifClick(notif) {
    if (!notif.is_read) markAsRead(notif.id)
    if (notif.link) navigate(notif.link)
    setShowNotifs(false)
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  function getInitials(name) {
    return name?.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || '??'
  }

  const unread = notifications.filter(n => !n.is_read)
  const read   = notifications.filter(n => n.is_read)

  return (
    <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <span className="topbar-title">АромаПро</span>
          </div>
          <div className="topbar-right">

            {/* ── Кнопка колокольчика ─────────────────────────── */}
            <button
              className="btn-icon bell-btn"
              onClick={() => setShowNotifs(v => !v)}
              title="Уведомления"
              style={{ position: 'relative' }}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="badge-dot" style={{
                  position: 'absolute', top: 2, right: 2,
                  minWidth: 16, height: 16, borderRadius: 8,
                  background: unreadCount > 0 && notifications.some(n => !n.is_read && n.type === 'critical')
                    ? '#dc2626' : '#f59e0b',
                  color: '#fff', fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 3px', lineHeight: 1,
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <div className="user-info">
              <div className="avatar" style={{ backgroundColor: user?.avatar_color || '#2563eb' }}>
                {getInitials(user?.name)}
              </div>
              <div className="user-details">
                <span className="user-name">{user?.name}</span>
                <span className="user-role">{user?.roleLabel}</span>
              </div>
            </div>

            <button className="btn-icon btn-danger-soft" onClick={handleLogout} title="Выход">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="page-content">
          {children}
        </main>
      </div>

      {/* ── Панель уведомлений ───────────────────────────────────────── */}
      {showNotifs && (
        <div className="notif-panel" ref={panelRef}>
          {/* Заголовок */}
          <div className="notif-panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={16} />
              <span>Уведомления</span>
              {unreadCount > 0 && (
                <span style={{
                  background: '#3b82f6', color: '#fff',
                  borderRadius: 10, fontSize: 11, fontWeight: 700,
                  padding: '1px 7px'
                }}>{unreadCount}</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {unreadCount > 0 && (
                <button className="btn-icon" onClick={markAllAsRead} title="Прочитать все">
                  <CheckCheck size={15} />
                </button>
              )}
              {read.length > 0 && (
                <button className="btn-icon" onClick={clearRead} title="Удалить прочитанные">
                  <Trash2 size={15} />
                </button>
              )}
              <button className="btn-icon" onClick={() => setShowNotifs(false)}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Список */}
          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <Bell size={28} style={{ opacity: 0.3 }} />
                <span>Нет уведомлений</span>
              </div>
            ) : (
              <>
                {/* Непрочитанные */}
                {unread.length > 0 && (
                  <>
                    <div className="notif-section-label">Новые</div>
                    {unread.map(n => <NotifItem key={n.id} n={n} onClick={() => handleNotifClick(n)} />)}
                  </>
                )}

                {/* Прочитанные */}
                {read.length > 0 && (
                  <>
                    <div className="notif-section-label" style={{ opacity: 0.5 }}>Прочитанные</div>
                    {read.map(n => <NotifItem key={n.id} n={n} onClick={() => handleNotifClick(n)} dimmed />)}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Карточка уведомления ──────────────────────────────────────────────────
function NotifItem({ n, onClick, dimmed }) {
  const { icon: TypeIcon, color, bg } = TYPE_CONFIG[n.type] || TYPE_CONFIG.info
  const CatIcon = CATEGORY_ICON[n.category] || Info

  return (
    <div
      className="notif-item"
      onClick={onClick}
      style={{
        opacity: dimmed ? 0.55 : 1,
        borderLeft: `3px solid ${color}`,
        background: n.is_read ? 'transparent' : bg,
      }}
    >
      <div className="notif-item-icon" style={{ color }}>
        <TypeIcon size={16} />
      </div>
      <div className="notif-item-body">
        <div className="notif-item-title">{n.title}</div>
        <div className="notif-item-msg">{n.message}</div>
        <div className="notif-item-meta">
          <CatIcon size={11} style={{ opacity: 0.5 }} />
          <span>{timeAgo(n.created_at)}</span>
        </div>
      </div>
    </div>
  )
}
