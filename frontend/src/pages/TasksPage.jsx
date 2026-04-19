import { useState, useEffect } from 'react'
import { Plus, Play, CheckCircle, XCircle, X, AlertTriangle } from 'lucide-react'
import api from '../api'

const PRIORITY_LABELS = { high: 'Высокий', medium: 'Средний', low: 'Низкий' }
const STATUS_LABELS = { planned: 'Запланировано', in_progress: 'В работе', quality_check: 'Контроль', completed: 'Завершено', cancelled: 'Отменено' }
const STATUS_CLS = { planned: 'info', in_progress: 'warning', quality_check: 'warning', completed: 'success', cancelled: 'danger' }
const PRIORITY_CLS = { high: 'danger', medium: 'warning', low: 'success' }

const DEMO_TASKS = [
  { id: 1, tech_card_name: 'Ароматизатор подвесной Лимон', assigned_name: 'Николай Сергеев', quantity_planned: 500, quantity_produced: 340, status: 'in_progress', priority: 'high', due_date: new Date().toISOString().split('T')[0], avatar_color: '#16a34a' },
  { id: 2, tech_card_name: 'Ароматизатор Новый автомобиль', assigned_name: 'Николай Сергеев', quantity_planned: 300, quantity_produced: 0, status: 'planned', priority: 'medium', due_date: new Date().toISOString().split('T')[0], avatar_color: '#16a34a' },
  { id: 3, tech_card_name: 'Ароматизатор на панель Лаванда', assigned_name: 'Иван Иванов', quantity_planned: 200, quantity_produced: 0, status: 'planned', priority: 'low', due_date: new Date().toISOString().split('T')[0], avatar_color: '#0891b2' },
  { id: 4, tech_card_name: 'Ароматизатор Ваниль', assigned_name: 'Николай Сергеев', quantity_planned: 400, quantity_produced: 400, status: 'completed', priority: 'high', due_date: new Date().toISOString().split('T')[0], avatar_color: '#16a34a' },
  { id: 5, tech_card_name: 'Ароматизатор Новый автомобиль', assigned_name: 'Николай Сергеев', quantity_planned: 150, quantity_produced: 50, status: 'quality_check', priority: 'high', due_date: new Date().toISOString().split('T')[0], avatar_color: '#16a34a' },
]

const DEMO_CARDS = [{ id: 1, name: 'Ароматизатор Лимон' }, { id: 2, name: 'Ароматизатор Новый авто' }, { id: 3, name: 'Ароматизатор Лаванда' }, { id: 4, name: 'Ароматизатор Ваниль' }]
const DEMO_USERS = [{ id: 3, name: 'Иван Иванов' }, { id: 5, name: 'Николай Сергеев' }]

export default function TasksPage() {
  const [tasks, setTasks] = useState([])
  const [techCards, setTechCards] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [form, setForm] = useState({ tech_card_id: '', assigned_to: '', quantity_planned: '', priority: 'medium', due_date: '' })
  const [success, setSuccess] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      const [tasksRes, cardsRes, usersRes] = await Promise.all([api.get('/tasks'), api.get('/techcards'), api.get('/users')])
      setTasks(tasksRes.data || DEMO_TASKS)
      setTechCards(cardsRes.data || DEMO_CARDS)
      setUsers(usersRes.data || DEMO_USERS)
    } catch {
      setTasks(DEMO_TASKS); setTechCards(DEMO_CARDS); setUsers(DEMO_USERS)
    } finally { setLoading(false) }
  }

  function showMsg(msg) { setSuccess(msg); setTimeout(() => setSuccess(''), 3000) }

  async function handleAction(id, action, extra = {}) {
    try {
      await api.post(`/tasks/${id}/${action}`, extra)
      showMsg(action === 'start' ? 'Задача запущена' : action === 'complete' ? 'Задача завершена' : 'Брак зафиксирован')
    } catch {
      const statusMap = { start: 'in_progress', complete: 'completed', defect: 'quality_check' }
      setTasks(tasks.map(t => t.id === id ? { ...t, status: statusMap[action] } : t))
      showMsg(action === 'start' ? 'Задача запущена' : action === 'complete' ? 'Задача завершена' : 'Брак зафиксирован')
    }
    fetchAll()
  }

  async function handleCreate(e) {
    e.preventDefault()
    try {
      await api.post('/tasks', { ...form, tech_card_id: +form.tech_card_id, assigned_to: +form.assigned_to, quantity_planned: +form.quantity_planned })
      showMsg('Задача создана')
    } catch {
      const card = techCards.find(c => c.id === +form.tech_card_id)
      const user = users.find(u => u.id === +form.assigned_to)
      setTasks([{ id: Date.now(), ...form, tech_card_name: card?.name || '', assigned_name: user?.name || '', quantity_produced: 0, status: 'planned' }, ...tasks])
      showMsg('Задача создана')
    }
    setShowForm(false); setForm({ tech_card_id: '', assigned_to: '', quantity_planned: '', priority: 'medium', due_date: '' }); fetchAll()
  }

  const filtered = filterStatus ? tasks.filter(t => t.status === filterStatus) : tasks

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Производственные задачи</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}><Plus size={16} /> Создать задачу</button>
      </div>

      {success && <div className="alert alert-success mb-3">{success}</div>}

      <div className="flex-gap mb-4">
        {['', 'planned', 'in_progress', 'quality_check', 'completed'].map(s => (
          <button key={s} className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilterStatus(s)}>
            {s ? STATUS_LABELS[s] : 'Все'}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="card mb-4">
          <div className="card-header">
            <h3>Новая задача</h3>
            <button className="btn-icon" onClick={() => setShowForm(false)}><X size={16} /></button>
          </div>
          <div className="card-body">
            <form onSubmit={handleCreate}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Тех. карта *</label>
                  <select className="form-input" value={form.tech_card_id} onChange={e => setForm({...form, tech_card_id: e.target.value})} required>
                    <option value="">Выберите...</option>
                    {techCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Исполнитель</label>
                  <select className="form-input" value={form.assigned_to} onChange={e => setForm({...form, assigned_to: e.target.value})}>
                    <option value="">Не назначен</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Количество *</label>
                  <input className="form-input" type="number" min="1" value={form.quantity_planned} onChange={e => setForm({...form, quantity_planned: e.target.value})} required placeholder="шт." />
                </div>
                <div className="form-group">
                  <label>Приоритет</label>
                  <select className="form-input" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                    {Object.entries(PRIORITY_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Дата выполнения</label>
                  <input className="form-input" type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
                </div>
              </div>
              <div className="flex-gap mt-3">
                <button type="submit" className="btn btn-primary">Создать</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-2">
        {filtered.map(task => {
          const progress = task.quantity_planned > 0 ? Math.round((task.quantity_produced / task.quantity_planned) * 100) : 0
          return (
            <div key={task.id} className="card task-card">
              <div className="card-header">
                <div className="flex-1">
                  <h3 className="task-title">{task.tech_card_name}</h3>
                  <div className="flex-gap mt-1">
                    <span className={`badge badge-${PRIORITY_CLS[task.priority]}`}>{PRIORITY_LABELS[task.priority]}</span>
                    <span className={`badge badge-${STATUS_CLS[task.status]}`}>{STATUS_LABELS[task.status]}</span>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="flex-between mb-2 text-sm">
                  <span className="text-muted">Исполнитель:</span>
                  <span>{task.assigned_name || 'Не назначен'}</span>
                </div>
                <div className="flex-between mb-2 text-sm">
                  <span className="text-muted">Количество:</span>
                  <span><strong>{task.quantity_produced}</strong> / {task.quantity_planned} шт.</span>
                </div>
                {task.due_date && (
                  <div className="flex-between mb-2 text-sm">
                    <span className="text-muted">Срок:</span>
                    <span>{new Date(task.due_date).toLocaleDateString('ru-RU')}</span>
                  </div>
                )}
                {task.status === 'in_progress' && (
                  <div className="mt-2">
                    <div className="flex-between text-sm mb-1"><span>Прогресс</span><span>{progress}%</span></div>
                    <div className="progress">
                      <div className="progress-bar warning" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                )}
              </div>
              <div className="card-footer">
                <div className="flex-gap">
                  {task.status === 'planned' && (
                    <button className="btn btn-success btn-sm" onClick={() => handleAction(task.id, 'start')}>
                      <Play size={14} /> Начать
                    </button>
                  )}
                  {task.status === 'in_progress' && (
                    <>
                      <button className="btn btn-primary btn-sm" onClick={() => handleAction(task.id, 'complete')}>
                        <CheckCircle size={14} /> Завершить
                      </button>
                      <button className="btn btn-warning btn-sm" onClick={() => handleAction(task.id, 'defect', { quantity_defect: 1, defect_reason: 'Брак' })}>
                        <AlertTriangle size={14} /> Брак
                      </button>
                    </>
                  )}
                  {task.status === 'quality_check' && (
                    <button className="btn btn-primary btn-sm" onClick={() => handleAction(task.id, 'complete')}>
                      <CheckCircle size={14} /> Принять
                    </button>
                  )}
                  {task.status === 'completed' && <span className="text-success text-sm">OK Выполнено</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
