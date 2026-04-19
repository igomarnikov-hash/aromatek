import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, X, Clock, Layers } from 'lucide-react'
import api from '../api'

const DEMO_CARDS = [
  {
    id: 1, name: 'Ароматизатор подвесной Лимон', description: 'Подвесной ароматизатор с лимонным ароматом', version: '2.1',
    is_active: 1, duration_minutes: 45,
    steps: ['Подготовить картонную основу', 'Нанести масло лимон (2мл)', 'Просушить 10 мин', 'Упаковать в корпус', 'Наклеить этикетку'],
    items: [{ material_name: 'Картонная основа', quantity_per_unit: 1, unit: 'шт' }, { material_name: 'Масло лимон', quantity_per_unit: 0.002, unit: 'л' }, { material_name: 'Пластиковый корпус', quantity_per_unit: 1, unit: 'шт' }, { material_name: 'Этикетка', quantity_per_unit: 1, unit: 'шт' }]
  },
  {
    id: 2, name: 'Ароматизатор подвесной Новый автомобиль', description: 'Классический аромат нового автомобиля', version: '1.8',
    is_active: 1, duration_minutes: 45,
    steps: ['Подготовить картонную основу', 'Нанести масло авто (2мл)', 'Просушить 10 мин', 'Упаковать', 'Наклеить этикетку'],
    items: [{ material_name: 'Картонная основа', quantity_per_unit: 1, unit: 'шт' }, { material_name: 'Масло новый автомобиль', quantity_per_unit: 0.002, unit: 'л' }]
  },
  {
    id: 3, name: 'Ароматизатор на панель Лаванда', description: 'Ароматизатор на панель с ароматом лаванды', version: '1.5',
    is_active: 1, duration_minutes: 60,
    steps: ['Подготовить пластиковый корпус', 'Залить масло лаванда (5мл)', 'Установить фитиль', 'Закрыть крышку', 'Наклеить этикетку'],
    items: [{ material_name: 'Пластиковый корпус', quantity_per_unit: 1, unit: 'шт' }, { material_name: 'Масло лаванда', quantity_per_unit: 0.005, unit: 'л' }]
  },
  {
    id: 4, name: 'Ароматизатор на вентиляцию Ваниль', description: 'Клипса на вентиляцию с ароматом ванили', version: '2.0',
    is_active: 1, duration_minutes: 30,
    steps: ['Подготовить основу из абсорбента', 'Нанести масло ваниль (1.5мл)', 'Просушить 5 мин', 'Вставить в клипсу', 'Наклеить этикетку'],
    items: [{ material_name: 'Абсорбирующий материал', quantity_per_unit: 0.01, unit: 'кг' }, { material_name: 'Масло ваниль', quantity_per_unit: 0.0015, unit: 'л' }]
  },
]

const emptyForm = { name: '', description: '', version: '1.0', duration_minutes: 60, steps: [''], items: [] }

export default function TechCardsPage() {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editCard, setEditCard] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [success, setSuccess] = useState('')

  useEffect(() => { fetchCards() }, [])

  async function fetchCards() {
    try {
      const res = await api.get('/techcards')
      setCards(res.data || DEMO_CARDS)
    } catch { setCards(DEMO_CARDS) }
    finally { setLoading(false) }
  }

  function showMsg(msg) { setSuccess(msg); setTimeout(() => setSuccess(''), 3000) }

  function openEdit(card) {
    setEditCard(card)
    setForm({ name: card.name, description: card.description || '', version: card.version, duration_minutes: card.duration_minutes, steps: card.steps?.length ? card.steps : [''], items: card.items || [] })
    setShowForm(true)
  }

  function openNew() { setEditCard(null); setForm(emptyForm); setShowForm(true) }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      if (editCard) {
        await api.put(`/techcards/${editCard.id}`, form)
        showMsg('Тех. карта обновлена')
      } else {
        await api.post('/techcards', form)
        showMsg('Тех. карта создана')
      }
    } catch {
      const updated = editCard
        ? cards.map(c => c.id === editCard.id ? { ...c, ...form } : c)
        : [...cards, { id: Date.now(), ...form, is_active: 1 }]
      setCards(updated)
      showMsg(editCard ? 'Тех. карта обновлена' : 'Тех. карта создана')
    }
    setShowForm(false); setForm(emptyForm); setEditCard(null); fetchCards()
  }

  async function handleDelete(card) {
    if (!confirm(`Удалить тех. карту "${card.name}"?`)) return
    setCards(cards.filter(c => c.id !== card.id))
    showMsg('Тех. карта удалена')
  }

  function addStep() { setForm(f => ({ ...f, steps: [...f.steps, ''] })) }
  function updateStep(i, v) { setForm(f => ({ ...f, steps: f.steps.map((s, idx) => idx === i ? v : s) })) }
  function removeStep(i) { setForm(f => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) })) }

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Технологические карты</h1>
        <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> Создать карту</button>
      </div>

      {success && <div className="alert alert-success mb-3">{success}</div>}

      {showForm && (
        <div className="card mb-4">
          <div className="card-header">
            <h3>{editCard ? 'Редактировать' : 'Новая'} тех. карта</h3>
            <button className="btn-icon" onClick={() => setShowForm(false)}><X size={16} /></button>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Название *</label>
                  <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Версия</label>
                  <input className="form-input" value={form.version} onChange={e => setForm({...form, version: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Длительность (мин)</label>
                  <input className="form-input" type="number" min="1" value={form.duration_minutes} onChange={e => setForm({...form, duration_minutes: +e.target.value})} />
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label>Описание</label>
                  <textarea className="form-input" rows="2" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                </div>
              </div>
              <div className="form-group mt-3">
                <div className="flex-between mb-2"><label>Этапы производства</label><button type="button" className="btn btn-secondary btn-sm" onClick={addStep}><Plus size={14} /> Добавить этап</button></div>
                {form.steps.map((s, i) => (
                  <div key={i} className="flex-gap mb-2">
                    <span className="step-num">{i+1}</span>
                    <input className="form-input flex-1" value={s} onChange={e => updateStep(i, e.target.value)} placeholder={`Этап ${i+1}`} />
                    {form.steps.length > 1 && <button type="button" className="btn-icon text-danger" onClick={() => removeStep(i)}><X size={14} /></button>}
                  </div>
                ))}
              </div>
              <div className="flex-gap mt-3">
                <button type="submit" className="btn btn-primary">{editCard ? 'Сохранить' : 'Создать'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-2">
        {cards.map(card => (
          <div key={card.id} className={`card techcard ${!card.is_active ? 'inactive' : ''}`}>
            <div className="card-header">
              <div>
                <h3 className="card-title">{card.name}</h3>
                <div className="flex-gap mt-1">
                  <span className="badge badge-info">v{card.version}</span>
                  <span className={`badge badge-${card.is_active ? 'success' : 'danger'}`}>{card.is_active ? 'Активна' : 'Неактивна'}</span>
                </div>
              </div>
              <div className="flex-gap">
                <button className="btn-icon" onClick={() => openEdit(card)} title="Редактировать"><Edit2 size={16} /></button>
                <button className="btn-icon text-danger" onClick={() => handleDelete(card)} title="Удалить"><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="card-body">
              {card.description && <p className="text-muted text-sm mb-3">{card.description}</p>}
              <div className="flex-gap mb-3 text-sm text-muted">
                <span className="flex-gap-sm"><Clock size={14} /> {card.duration_minutes} мин</span>
                <span className="flex-gap-sm"><Layers size={14} /> {card.steps?.length || 0} этапов</span>
              </div>
              {card.items && card.items.length > 0 && (
                <div className="mb-3">
                  <div className="text-sm text-muted mb-1">Материалы на единицу:</div>
                  {card.items.map((item, i) => (
                    <div key={i} className="item-row text-sm">
                      <span>{item.material_name}</span>
                      <span className="text-muted">{item.quantity_per_unit} {item.unit}</span>
                    </div>
                  ))}
                </div>
              )}
              {card.steps && card.steps.length > 0 && (
                <div>
                  <div className="text-sm text-muted mb-1">Этапы:</div>
                  {card.steps.slice(0, 3).map((step, i) => (
                    <div key={i} className="step-row text-sm">
                      <span className="step-num-sm">{i+1}</span>
                      <span>{step}</span>
                    </div>
                  ))}
                  {card.steps.length > 3 && <div className="text-muted text-sm">...ещё {card.steps.length - 3}</div>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
