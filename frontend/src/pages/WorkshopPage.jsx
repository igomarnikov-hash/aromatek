import { useState, useEffect, useRef } from 'react'
import { Play, CheckCircle, AlertTriangle, Clock, Package } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api'

const DEMO_ACTIVE = {
  id: 1, tech_card_name: 'Ароматизатор подвесной Лимон', quantity_planned: 500, quantity_produced: 340, status: 'in_progress', priority: 'high',
  steps: ['Подготовить картонную основу', 'Нанести масло лимон (2мл)', 'Просушить 10 мин', 'Упаковать в корпус', 'Наклеить этикетку'],
  items: [{ material_name: 'Картонная основа', quantity_per_unit: 1, unit: 'шт' }, { material_name: 'Масло лимон', quantity_per_unit: 0.002, unit: 'л' }]
}
const DEMO_PENDING = [
  { id: 2, tech_card_name: 'Ароматизатор Новый автомобиль', quantity_planned: 300, quantity_produced: 0, status: 'planned', priority: 'medium' },
  { id: 3, tech_card_name: 'Ароматизатор Лаванда', quantity_planned: 200, quantity_produced: 0, status: 'planned', priority: 'low' },
]
const DEMO_COMPLETED = [
  { id: 4, tech_card_name: 'Ароматизатор Ваниль', quantity_planned: 400, quantity_produced: 400, status: 'completed' },
]

function formatTime(secs) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`
}

export default function WorkshopPage() {
  const { user } = useAuth()
  const [activeTask, setActiveTask] = useState(null)
  const [pendingTasks, setPendingTasks] = useState([])
  const [completedTasks, setCompletedTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [timer, setTimer] = useState(0)
  const [techCard, setTechCard] = useState(null)
  const [success, setSuccess] = useState('')
  const timerRef = useRef(null)

  useEffect(() => { fetchTasks() }, [])

  useEffect(() => {
    if (activeTask?.status === 'in_progress') {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [activeTask])

  async function fetchTasks() {
    try {
      const params = user ? `?assigned_to=${user.id}` : ''
      const res = await api.get(`/tasks${params}`)
      const all = res.data || []
      const active = all.find(t => t.status === 'in_progress') || all.find(t => t.status === 'quality_check')
      const pending = all.filter(t => t.status === 'planned')
      const completed = all.filter(t => t.status === 'completed').slice(0, 5)

      if (active) {
        setActiveTask(active)
        fetchTechCard(active.tech_card_id)
      } else {
        setActiveTask(DEMO_ACTIVE)
        setTechCard({ steps: DEMO_ACTIVE.steps, items: DEMO_ACTIVE.items })
      }
      setPendingTasks(pending.length ? pending : DEMO_PENDING)
      setCompletedTasks(completed.length ? completed : DEMO_COMPLETED)
    } catch {
      setActiveTask(DEMO_ACTIVE)
      setTechCard({ steps: DEMO_ACTIVE.steps, items: DEMO_ACTIVE.items })
      setPendingTasks(DEMO_PENDING)
      setCompletedTasks(DEMO_COMPLETED)
    } finally { setLoading(false) }
  }

  async function fetchTechCard(id) {
    if (!id) return
    try {
      const res = await api.get(`/techcards/${id}`)
      setTechCard(res.data)
    } catch {}
  }

  async function handleStart(task) {
    try { await api.post(`/tasks/${task.id}/start`, {}) } catch {}
    setActiveTask({ ...task, status: 'in_progress' })
    setPendingTasks(pendingTasks.filter(t => t.id !== task.id))
    setTimer(0)
    showMsg('Задача запущена!')
  }

  async function handleComplete() {
    if (!activeTask) return
    try { await api.post(`/tasks/${activeTask.id}/complete`, { quantity_produced: activeTask.quantity_planned }) } catch {}
    clearInterval(timerRef.current)
    showMsg('Задача завершена!')
    setActiveTask(null); setTimer(0)
    fetchTasks()
  }

  async function handleDefect() {
    if (!activeTask) return
    try { await api.post(`/tasks/${activeTask.id}/defect`, { quantity_defect: 1, defect_reason: 'Дефект оператора' }) } catch {}
    showMsg('Брак зафиксирован')
    fetchTasks()
  }

  function showMsg(msg) { setSuccess(msg); setTimeout(() => setSuccess(''), 3000) }

  const progress = activeTask ? Math.round((activeTask.quantity_produced / activeTask.quantity_planned) * 100) : 0

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Рабочий цех</h1>
        <div className="timer-display"><Clock size={16} /> {formatTime(timer)}</div>
      </div>

      {success && <div className="alert alert-success mb-3">{success}</div>}

      <div className="grid grid-2 mb-4">
        <div className="workshop-main">
          {activeTask ? (
            <div className="card active-task-card">
              <div className="card-header">
                <div>
                  <div className="text-muted text-sm mb-1">Текущая задача</div>
                  <h2>{activeTask.tech_card_name}</h2>
                </div>
                <span className="badge badge-warning">В работе</span>
              </div>
              <div className="card-body">
                <div className="flex-between mb-3">
                  <span className="text-muted">Прогресс:</span>
                  <span><strong>{activeTask.quantity_produced}</strong> / {activeTask.quantity_planned} шт. ({progress}%)</span>
                </div>
                <div className="progress mb-4">
                  <div className="progress-bar warning" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="timer-big">{formatTime(timer)}</div>
              </div>
              <div className="card-footer">
                <button className="btn btn-primary btn-lg" onClick={handleComplete}>
                  <CheckCircle size={18} /> Завершить задачу
                </button>
                <button className="btn btn-warning" onClick={handleDefect}>
                  <AlertTriangle size={16} /> Зафиксировать брак
                </button>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-body text-center p-5">
                <div className="text-muted mb-2">Нет активных задач</div>
                <div className="text-sm text-muted">Выберите задачу из очереди ниже</div>
              </div>
            </div>
          )}

          {pendingTasks.length > 0 && (
            <div className="card mt-4">
              <div className="card-header"><h3>Очередь задач</h3><span className="badge badge-info">{pendingTasks.length}</span></div>
              <div className="card-body p-0">
                {pendingTasks.map(task => (
                  <div key={task.id} className="queue-item">
                    <div className="queue-info">
                      <div className="queue-name">{task.tech_card_name}</div>
                      <div className="text-sm text-muted">{task.quantity_planned} шт.</div>
                    </div>
                    <button className="btn btn-success btn-sm" onClick={() => handleStart(task)} disabled={!!activeTask}>
                      <Play size={14} /> Начать
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="workshop-side">
          {techCard && (
            <div className="card mb-4">
              <div className="card-header"><h3>Технологическая карта</h3></div>
              <div className="card-body">
                {techCard.items && techCard.items.length > 0 && (
                  <div className="mb-3">
                    <div className="text-sm text-muted mb-2"><Package size={14} /> Материалы на 1 шт.:</div>
                    {techCard.items.map((item, i) => (
                      <div key={i} className="item-row text-sm">
                        <span>{item.material_name}</span>
                        <span className="text-muted">{item.quantity_per_unit} {item.unit}</span>
                      </div>
                    ))}
                  </div>
                )}
                {techCard.steps && techCard.steps.length > 0 && (
                  <div>
                    <div className="text-sm text-muted mb-2">Этапы производства:</div>
                    {techCard.steps.map((step, i) => (
                      <div key={i} className="step-row">
                        <span className="step-num-sm">{i+1}</span>
                        <span className="text-sm">{step}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {completedTasks.length > 0 && (
            <div className="card">
              <div className="card-header"><h3>Завершённые</h3></div>
              <div className="card-body p-0">
                <table className="table table-sm">
                  <thead><tr><th>Задача</th><th>Кол-во</th></tr></thead>
                  <tbody>
                    {completedTasks.map(t => (
                      <tr key={t.id}>
                        <td className="text-sm">{t.tech_card_name}</td>
                        <td><span className="badge badge-success">{t.quantity_produced} шт.</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
