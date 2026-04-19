import { useEffect, useState, useContext } from 'react'
import { Plus, Droplets, Clock, CheckCircle, AlertCircle, FlaskConical, RotateCcw } from 'lucide-react'
import api from '../api'
import { AuthContext } from '../context/AuthContext'

const STATUS_CONFIG = {
  mixing:          { label: 'Смешивание',      color: '#3b82f6' },
  homogenizing:    { label: 'Гомогенизация',   color: '#a855f7' },
  quality_check:   { label: 'Контроль кач.',   color: '#f59e0b' },
  completed:       { label: 'Завершено',        color: '#16a34a' },
  rejected:        { label: 'Брак',            color: '#dc2626' },
}

const DEMO_BATCHES = [
  { id: 1, batch_number: 'PF-20260411-001', formula_name: 'Лимон классик', status: 'homogenizing', volume_l: 5.0, start_time: new Date(Date.now() - 14*3600000).toISOString(), flip_count: 3, operator_name: 'Николай С.' },
  { id: 2, batch_number: 'PF-20260411-002', formula_name: 'Новый автомобиль', status: 'mixing', volume_l: 3.5, start_time: new Date(Date.now() - 1*3600000).toISOString(), flip_count: 0, operator_name: 'Мария С.' },
  { id: 3, batch_number: 'PF-20260410-003', formula_name: 'Лаванда', status: 'completed', volume_l: 4.0, start_time: new Date(Date.now() - 30*3600000).toISOString(), flip_count: 6, operator_name: 'Николай С.' },
]

const DEMO_FORMULAS = [
  { id: 1, name: 'Лимон классик', components: [{ name: 'Масло лимон', ratio: 85 }, { name: 'Фиксатор', ratio: 10 }, { name: 'Растворитель', ratio: 5 }], deviation_threshold_pct: 5 },
  { id: 2, name: 'Новый автомобиль', components: [{ name: 'Масло авто', ratio: 80 }, { name: 'Фиксатор', ratio: 15 }, { name: 'Растворитель', ratio: 5 }], deviation_threshold_pct: 3 },
  { id: 3, name: 'Лаванда', components: [{ name: 'Масло лаванда', ratio: 90 }, { name: 'Фиксатор', ratio: 10 }], deviation_threshold_pct: 5 },
]

function hoursAgo(dateStr) {
  if (!dateStr) return '—'
  const h = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000)
  if (h < 1) return 'менее часа'
  return `${h} ч. назад`
}

function homogProgress(startTime) {
  if (!startTime) return 0
  const elapsed = (Date.now() - new Date(startTime).getTime()) / 3600000
  return Math.min(100, Math.round((elapsed / 24) * 100))
}

export default function PerfumePage() {
  const { user } = useContext(AuthContext)
  const [batches, setBatches] = useState([])
  const [formulas, setFormulas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showFormulas, setShowFormulas] = useState(false)
  const [form, setForm] = useState({ formula_id: '', volume_l: '', notes: '' })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [b, f] = await Promise.all([
        api.get('/perfume/batches').catch(() => null),
        api.get('/perfume/formulas').catch(() => null),
      ])
      setBatches(b?.data || DEMO_BATCHES)
      setFormulas(f?.data || DEMO_FORMULAS)
    } catch {
      setBatches(DEMO_BATCHES)
      setFormulas(DEMO_FORMULAS)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    try {
      await api.post('/perfume/batches', { ...form, volume_l: parseFloat(form.volume_l), createdBy: user?.id })
      setShowCreate(false)
      setForm({ formula_id: '', volume_l: '', notes: '' })
      loadData()
    } catch {
      // demo mode — just close
      setShowCreate(false)
    }
  }

  async function handleFlip(id) {
    try {
      await api.post(`/perfume/batches/${id}/flip`, { operator_id: user?.id })
      loadData()
    } catch {
      setBatches(prev => prev.map(b => b.id === id ? { ...b, flip_count: (b.flip_count || 0) + 1 } : b))
    }
  }

  async function handleComplete(id) {
    try {
      await api.put(`/perfume/batches/${id}`, { status: 'quality_check' })
      loadData()
    } catch {
      setBatches(prev => prev.map(b => b.id === id ? { ...b, status: 'quality_check' } : b))
    }
  }

  const activeBatches = batches.filter(b => b.status !== 'completed' && b.status !== 'rejected')
  const doneBatches   = batches.filter(b => b.status === 'completed' || b.status === 'rejected')

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Парфюмирование</h1>
          <p className="text-muted">Смешивание и гомогенизация парфюмерных партий</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowFormulas(true)}>
            <FlaskConical size={16} /> Формулы
          </button>
          {['admin','technologist','production_manager'].includes(user?.role) && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={16} /> Новая партия
            </button>
          )}
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Активных партий', value: activeBatches.length, color: '#3b82f6', icon: Droplets },
          { label: 'Гомогенизация', value: batches.filter(b => b.status === 'homogenizing').length, color: '#a855f7', icon: Clock },
          { label: 'На контроле', value: batches.filter(b => b.status === 'quality_check').length, color: '#f59e0b', icon: AlertCircle },
          { label: 'Завершено сегодня', value: doneBatches.length, color: '#16a34a', icon: CheckCircle },
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
          {/* Активные партии */}
          {activeBatches.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginBottom: '0.75rem' }}>В работе</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {activeBatches.map(b => {
                  const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.mixing
                  const progress = b.status === 'homogenizing' ? homogProgress(b.start_time) : null
                  return (
                    <div key={b.id} className="card" style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{b.batch_number}</span>
                            <span className="badge" style={{ background: `${cfg.color}22`, color: cfg.color, padding: '2px 8px', borderRadius: 4, fontSize: '0.72rem' }}>
                              {cfg.label}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {b.formula_name} · {b.volume_l} л
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            Начало: {hoursAgo(b.start_time)} · Перевёрнуто: {b.flip_count || 0} раз
                            {b.operator_name && ` · ${b.operator_name}`}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {b.status === 'homogenizing' && (
                            <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '6px 12px' }} onClick={() => handleFlip(b.id)}>
                              <RotateCcw size={14} /> Перевернуть
                            </button>
                          )}
                          {(b.status === 'mixing' || b.status === 'homogenizing') && (
                            <button className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '6px 12px' }} onClick={() => handleComplete(b.id)}>
                              <CheckCircle size={14} /> На контроль
                            </button>
                          )}
                        </div>
                      </div>
                      {progress !== null && (
                        <div style={{ marginTop: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                            <span>Гомогенизация 24ч</span>
                            <span>{progress}%</span>
                          </div>
                          <div style={{ height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${progress}%`, background: '#a855f7', borderRadius: 3, transition: 'width 0.3s ease' }} />
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
          {doneBatches.length > 0 && (
            <div>
              <h3 style={{ marginBottom: '0.75rem', opacity: 0.7 }}>Завершённые</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {doneBatches.map(b => {
                  const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.completed
                  return (
                    <div key={b.id} className="card" style={{ padding: '0.875rem 1rem', opacity: 0.75, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{b.batch_number}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: 8 }}>{b.formula_name} · {b.volume_l} л</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{hoursAgo(b.start_time)}</span>
                        <span className="badge" style={{ background: `${cfg.color}22`, color: cfg.color, padding: '2px 8px', borderRadius: 4, fontSize: '0.72rem' }}>{cfg.label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {batches.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <Droplets size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
              <div>Нет парфюмерных партий</div>
            </div>
          )}
        </>
      )}

      {/* Модал создания */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>Новая парфюмерная партия</h3>
              <button className="btn-icon" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Формула *</label>
                <select className="form-select" value={form.formula_id} onChange={e => setForm(p => ({ ...p, formula_id: e.target.value }))} required>
                  <option value="">Выберите формулу</option>
                  {formulas.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Объём (л) *</label>
                <input className="form-input" type="number" step="0.1" min="0.1" value={form.volume_l} onChange={e => setForm(p => ({ ...p, volume_l: e.target.value }))} required placeholder="Например: 5.0" />
              </div>
              <div className="form-group">
                <label className="form-label">Примечание</label>
                <textarea className="form-textarea" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Необязательно" />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Отмена</button>
                <button type="submit" className="btn btn-primary">Создать партию</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модал формул */}
      {showFormulas && (
        <div className="modal-overlay" onClick={() => setShowFormulas(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3>Формулы парфюма</h3>
              <button className="btn-icon" onClick={() => setShowFormulas(false)}>✕</button>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {formulas.map(f => (
                <div key={f.id} className="card" style={{ padding: '0.875rem' }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{f.name}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(f.components || []).map((c, i) => (
                      <span key={i} style={{ background: 'var(--bg-tertiary)', borderRadius: 4, padding: '3px 8px', fontSize: '0.75rem' }}>
                        {c.name}: {c.ratio}%
                      </span>
                    ))}
                  </div>
                  {f.deviation_threshold_pct && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>
                      Допуск отклонения: ±{f.deviation_threshold_pct}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
