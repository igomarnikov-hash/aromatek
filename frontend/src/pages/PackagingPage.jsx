import { useEffect, useState, useContext } from 'react'
import { Plus, Package, CheckCircle, Clock, AlertTriangle, PlayCircle } from 'lucide-react'
import api from '../api'
import { AuthContext } from '../context/AuthContext'

const STATUS_CONFIG = {
  predrying:    { label: 'Предсушка',    color: '#f59e0b' },
  in_progress:  { label: 'Упаковка',    color: '#3b82f6' },
  completed:    { label: 'Завершено',   color: '#16a34a' },
  rejected:     { label: 'Брак',        color: '#dc2626' },
}

const DEMO_SESSIONS = [
  { id: 1, session_number: 'UP-20260411-001', batch_id: 1, status: 'in_progress', quantity_planned: 500, quantity_packed: 320, defect_count: 5, start_time: new Date(Date.now() - 2*3600000).toISOString(), operator_name: 'Николай С.' },
  { id: 2, session_number: 'UP-20260411-002', batch_id: 2, status: 'predrying', quantity_planned: 300, quantity_packed: 0, defect_count: 0, start_time: new Date(Date.now() - 0.5*3600000).toISOString(), operator_name: 'Мария С.' },
  { id: 3, session_number: 'UP-20260410-003', batch_id: 3, status: 'completed', quantity_planned: 400, quantity_packed: 396, defect_count: 4, start_time: new Date(Date.now() - 26*3600000).toISOString(), operator_name: 'Николай С.' },
]

function timeAgo(dateStr) {
  if (!dateStr) return '—'
  const m = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (m < 60) return `${m} мин. назад`
  return `${Math.floor(m / 60)} ч. назад`
}

export default function PackagingPage() {
  const { user } = useContext(AuthContext)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [completeModal, setCompleteModal] = useState(null)
  const [form, setForm] = useState({ batch_id: '', quantity_planned: '', notes: '' })
  const [completeForm, setCompleteForm] = useState({ quantity_packed: '', defect_count: 0, notes: '' })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const data = await api.get('/packaging')
      setSessions(data?.data || DEMO_SESSIONS)
    } catch {
      setSessions(DEMO_SESSIONS)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    try {
      await api.post('/packaging', { ...form, quantity_planned: parseInt(form.quantity_planned), created_by: user?.id })
      setShowCreate(false)
      setForm({ batch_id: '', quantity_planned: '', notes: '' })
      loadData()
    } catch {
      setShowCreate(false)
    }
  }

  async function handleStart(id) {
    try {
      await api.put(`/packaging/${id}`, { status: 'in_progress' })
      loadData()
    } catch {
      setSessions(prev => prev.map(s => s.id === id ? { ...s, status: 'in_progress' } : s))
    }
  }

  async function handleComplete(e) {
    e.preventDefault()
    try {
      await api.put(`/packaging/${completeModal.id}`, { status: 'completed', ...completeForm, quantity_packed: parseInt(completeForm.quantity_packed), defect_count: parseInt(completeForm.defect_count) })
      setCompleteModal(null)
      loadData()
    } catch {
      setSessions(prev => prev.map(s => s.id === completeModal.id ? { ...s, status: 'completed', quantity_packed: parseInt(completeForm.quantity_packed) } : s))
      setCompleteModal(null)
    }
  }

  const activeSessions = sessions.filter(s => s.status !== 'completed' && s.status !== 'rejected')
  const doneSessions   = sessions.filter(s => s.status === 'completed' || s.status === 'rejected')

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Упаковка</h1>
          <p className="text-muted">Управление сеансами финальной упаковки продукции</p>
        </div>
        {['admin','production_manager','operator'].includes(user?.role) && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Новый сеанс
          </button>
        )}
      </div>

      {/* Статистика */}
      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Активных сеансов', value: activeSessions.length, color: '#3b82f6', icon: Package },
          { label: 'Предсушка', value: sessions.filter(s => s.status === 'predrying').length, color: '#f59e0b', icon: Clock },
          { label: 'Упаковка', value: sessions.filter(s => s.status === 'in_progress').length, color: '#0ea5e9', icon: PlayCircle },
          { label: 'Завершено', value: doneSessions.length, color: '#16a34a', icon: CheckCircle },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
              </div>
              <s.icon size={28} style={{ color: s.color, opacity: 0.3 }} />
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Загрузка...</div>
      ) : (
        <>
          {/* Активные сеансы */}
          {activeSessions.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginBottom: '0.75rem' }}>В работе</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {activeSessions.map(s => {
                  const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.in_progress
                  const progress = s.quantity_planned > 0
                    ? Math.round((s.quantity_packed / s.quantity_planned) * 100)
                    : 0

                  return (
                    <div key={s.id} className="card" style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{s.session_number}</span>
                            <span className="badge" style={{ background: `${cfg.color}22`, color: cfg.color, padding: '2px 8px', borderRadius: 4, fontSize: '0.72rem' }}>
                              {cfg.label}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Партия #{s.batch_id} · План: {s.quantity_planned} шт.
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {timeAgo(s.start_time)}{s.operator_name && ` · ${s.operator_name}`}
                            {s.defect_count > 0 && (
                              <span style={{ color: '#f87171', marginLeft: 8 }}>
                                <AlertTriangle size={11} style={{ display: 'inline', marginRight: 3 }} />
                                Брак: {s.defect_count} шт.
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {s.status === 'predrying' && (
                            <button className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '6px 12px' }} onClick={() => handleStart(s.id)}>
                              <PlayCircle size={14} /> Начать упаковку
                            </button>
                          )}
                          {s.status === 'in_progress' && (
                            <button className="btn btn-success" style={{ fontSize: '0.75rem', padding: '6px 12px' }} onClick={() => { setCompleteModal(s); setCompleteForm({ quantity_packed: s.quantity_planned, defect_count: 0, notes: '' }) }}>
                              <CheckCircle size={14} /> Завершить
                            </button>
                          )}
                        </div>
                      </div>

                      {s.status === 'in_progress' && s.quantity_planned > 0 && (
                        <div style={{ marginTop: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                            <span>Выполнено: {s.quantity_packed} / {s.quantity_planned} шт.</span>
                            <span>{progress}%</span>
                          </div>
                          <div style={{ height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${progress}%`, background: '#3b82f6', borderRadius: 3 }} />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Завершённые */}
          {doneSessions.length > 0 && (
            <div>
              <h3 style={{ marginBottom: '0.75rem', opacity: 0.7 }}>Завершённые</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {doneSessions.map(s => {
                  const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.completed
                  const efficiency = s.quantity_planned > 0
                    ? Math.round(((s.quantity_packed - (s.defect_count || 0)) / s.quantity_planned) * 100)
                    : 100
                  return (
                    <div key={s.id} className="card" style={{ padding: '0.875rem 1rem', opacity: 0.75, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{s.session_number}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: 8 }}>
                          {s.quantity_packed} шт. упаковано
                          {s.defect_count > 0 && `, брак: ${s.defect_count}`}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '0.75rem', color: efficiency >= 95 ? '#16a34a' : '#f59e0b' }}>
                          {efficiency}% эффективность
                        </span>
                        <span className="badge" style={{ background: `${cfg.color}22`, color: cfg.color, padding: '2px 8px', borderRadius: 4, fontSize: '0.72rem' }}>{cfg.label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {sessions.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <Package size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
              <div>Нет сеансов упаковки</div>
            </div>
          )}
        </>
      )}

      {/* Модал создания */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3>Новый сеанс упаковки</h3>
              <button className="btn-icon" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">ID партии *</label>
                <input className="form-input" type="number" value={form.batch_id} onChange={e => setForm(p => ({ ...p, batch_id: e.target.value }))} required placeholder="Например: 1" />
              </div>
              <div className="form-group">
                <label className="form-label">Плановое количество (шт.) *</label>
                <input className="form-input" type="number" value={form.quantity_planned} onChange={e => setForm(p => ({ ...p, quantity_planned: e.target.value }))} required placeholder="Например: 500" />
              </div>
              <div className="form-group">
                <label className="form-label">Примечание</label>
                <textarea className="form-textarea" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Необязательно" />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Отмена</button>
                <button type="submit" className="btn btn-primary">Создать</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модал завершения */}
      {completeModal && (
        <div className="modal-overlay" onClick={() => setCompleteModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3>Завершить упаковку</h3>
              <button className="btn-icon" onClick={() => setCompleteModal(null)}>✕</button>
            </div>
            <form onSubmit={handleComplete} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Упаковано (шт.) *</label>
                <input className="form-input" type="number" value={completeForm.quantity_packed} onChange={e => setCompleteForm(p => ({ ...p, quantity_packed: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Бракованных (шт.)</label>
                <input className="form-input" type="number" min="0" value={completeForm.defect_count} onChange={e => setCompleteForm(p => ({ ...p, defect_count: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Примечание</label>
                <textarea className="form-textarea" rows={2} value={completeForm.notes} onChange={e => setCompleteForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setCompleteModal(null)}>Отмена</button>
                <button type="submit" className="btn btn-success">Завершить</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
