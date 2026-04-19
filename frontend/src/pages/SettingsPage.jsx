import { useState } from 'react'
import { Save, Building, Users, Bell, Shield } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const ROLE_LABELS = { admin: 'Администратор', technologist: 'Технолог', production_manager: 'Нач. производства', warehouse: 'Кладовщик', operator: 'Оператор' }

const DEMO_USERS = [
  { id: 1, name: 'Александр Петров', role: 'admin', avatar_color: '#2563eb' },
  { id: 2, name: 'Мария Сидорова', role: 'technologist', avatar_color: '#7c3aed' },
  { id: 3, name: 'Иван Иванов', role: 'production_manager', avatar_color: '#0891b2' },
  { id: 4, name: 'Елена Федорова', role: 'warehouse', avatar_color: '#d97706' },
  { id: 5, name: 'Николай Сергеев', role: 'operator', avatar_color: '#16a34a' },
]

export default function SettingsPage() {
  const { user, users } = useAuth()
  const [tab, setTab] = useState('general')
  const [success, setSuccess] = useState('')
  const [general, setGeneral] = useState({
    company: 'АромаПро',
    address: 'г. Москва, ул. Производственная, 15',
    phone: '+7 (495) 123-45-67',
    email: 'info@aromapro.ru',
    work_hours: '08:00 - 20:00',
    timezone: 'Europe/Moscow',
  })
  const [notifications, setNotifications] = useState({
    system: true, email: true, push: false,
    critical: true, warning: true, info: false,
  })

  const displayUsers = (users && users.length > 0) ? users : DEMO_USERS

  function showMsg() { setSuccess('Настройки сохранены'); setTimeout(() => setSuccess(''), 3000) }

  function getInitials(name) {
    return name?.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || '??'
  }

  const TABS = [
    { id: 'general', label: 'Общие', icon: Building },
    { id: 'users', label: 'Пользователи', icon: Users },
    { id: 'notifications', label: 'Уведомления', icon: Bell },
    { id: 'security', label: 'Безопасность', icon: Shield },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Настройки</h1>
      </div>

      {success && <div className="alert alert-success mb-3">{success}</div>}

      <div className="settings-layout">
        <div className="settings-tabs">
          {TABS.map(t => (
            <button key={t.id} className={`settings-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              <t.icon size={18} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="settings-content">
          {tab === 'general' && (
            <div className="card">
              <div className="card-header"><h3>Общие настройки</h3></div>
              <div className="card-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Название компании</label>
                    <input className="form-input" value={general.company} onChange={e => setGeneral({...general, company: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input className="form-input" type="email" value={general.email} onChange={e => setGeneral({...general, email: e.target.value})} />
                  </div>
                  <div className="form-group" style={{gridColumn:'1/-1'}}>
                    <label>Адрес</label>
                    <input className="form-input" value={general.address} onChange={e => setGeneral({...general, address: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Телефон</label>
                    <input className="form-input" value={general.phone} onChange={e => setGeneral({...general, phone: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Рабочие часы</label>
                    <input className="form-input" value={general.work_hours} onChange={e => setGeneral({...general, work_hours: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Часовой пояс</label>
                    <select className="form-input" value={general.timezone} onChange={e => setGeneral({...general, timezone: e.target.value})}>
                      <option value="Europe/Moscow">Москва (UTC+3)</option>
                      <option value="Europe/Samara">Самара (UTC+4)</option>
                      <option value="Asia/Yekaterinburg">Екатеринбург (UTC+5)</option>
                    </select>
                  </div>
                </div>
                <button className="btn btn-primary mt-3" onClick={showMsg}><Save size={16} /> Сохранить</button>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div className="card">
              <div className="card-header"><h3>Управление пользователями</h3></div>
              <div className="card-body p-0">
                <table className="table">
                  <thead><tr><th>Пользователь</th><th>Роль</th><th>Статус</th></tr></thead>
                  <tbody>
                    {displayUsers.map(u => (
                      <tr key={u.id}>
                        <td>
                          <div className="flex-gap">
                            <div className="avatar avatar-sm" style={{ backgroundColor: u.avatar_color }}>{getInitials(u.name)}</div>
                            <span>{u.name}</span>
                            {u.id === user?.id && <span className="badge badge-info">Вы</span>}
                          </div>
                        </td>
                        <td><span className="badge badge-success">{ROLE_LABELS[u.role] || u.role}</span></td>
                        <td><span className="badge badge-success">Активен</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="card">
              <div className="card-header"><h3>Настройки уведомлений</h3></div>
              <div className="card-body">
                <div className="settings-section mb-4">
                  <div className="settings-section-title">Каналы уведомлений</div>
                  {[
                    { key: 'system', label: 'Системные уведомления', desc: 'Уведомления внутри приложения' },
                    { key: 'email', label: 'Email уведомления', desc: 'Отправка на email' },
                    { key: 'push', label: 'Push уведомления', desc: 'Уведомления в браузере' },
                  ].map(item => (
                    <div key={item.key} className="toggle-row">
                      <div>
                        <div className="toggle-label">{item.label}</div>
                        <div className="text-muted text-sm">{item.desc}</div>
                      </div>
                      <label className="toggle">
                        <input type="checkbox" checked={notifications[item.key]} onChange={e => setNotifications({...notifications, [item.key]: e.target.checked})} />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  ))}
                </div>
                <div className="settings-section">
                  <div className="settings-section-title">Типы оповещений</div>
                  {[
                    { key: 'critical', label: 'Критические', desc: 'Нехватка материалов, аварии' },
                    { key: 'warning', label: 'Предупреждения', desc: 'Низкий уровень запасов' },
                    { key: 'info', label: 'Информационные', desc: 'Завершение задач, события' },
                  ].map(item => (
                    <div key={item.key} className="toggle-row">
                      <div>
                        <div className="toggle-label">{item.label}</div>
                        <div className="text-muted text-sm">{item.desc}</div>
                      </div>
                      <label className="toggle">
                        <input type="checkbox" checked={notifications[item.key]} onChange={e => setNotifications({...notifications, [item.key]: e.target.checked})} />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  ))}
                </div>
                <button className="btn btn-primary mt-3" onClick={showMsg}><Save size={16} /> Сохранить</button>
              </div>
            </div>
          )}

          {tab === 'security' && (
            <div className="card">
              <div className="card-header"><h3>Безопасность</h3></div>
              <div className="card-body">
                <div className="security-info mb-4">
                  <div className="flex-between mb-2"><span className="text-muted">Тип аутентификации:</span><span>Демо (без пароля)</span></div>
                  <div className="flex-between mb-2"><span className="text-muted">Сессия:</span><span>Session Storage</span></div>
                  <div className="flex-between mb-2"><span className="text-muted">База данных:</span><span>SQLite (локальная)</span></div>
                  <div className="flex-between"><span className="text-muted">API:</span><span>Express.js REST API</span></div>
                </div>
                <div className="form-group mb-3">
                  <label>Резервное копирование</label>
                  <select className="form-input">
                    <option>Ежедневно в 00:00</option>
                    <option>Каждые 6 часов</option>
                    <option>Еженедельно</option>
                    <option>Вручную</option>
                  </select>
                </div>
                <button className="btn btn-primary" onClick={showMsg}><Save size={16} /> Сохранить</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
