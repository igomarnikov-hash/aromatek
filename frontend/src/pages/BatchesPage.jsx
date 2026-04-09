import React, { useEffect, useState, useContext } from 'react';
import {
  Plus, AlertCircle, ChevronRight,
  Printer, Scissors, Pin, Droplets, Package,
  Play, CheckCircle, Clock, Lock, Edit2, X, Check
} from 'lucide-react';
import api from '../api';
import { AuthContext } from '../context/AuthContext';

const BATCH_STATUS_MAP = {
  open:       { label: 'Открыта',       color: '#94a3b8' },
  printing:   { label: 'Печать',        color: '#3b82f6' },
  diecut:     { label: 'Вырубка',       color: '#f97316' },
  threading:  { label: 'Пробивка / нитка', color: '#a855f7' },
  perfuming:  { label: 'Парфюмирование', color: '#10b981' },
  packaging:  { label: 'Упаковка',      color: '#14b8a6' },
  completed:  { label: 'Завершено',     color: '#10b981' },
  cancelled:  { label: 'Отменено',      color: '#dc2626' }
};

// Порядок статусов — соответствует бэкенду
const STATUS_ORDER = ['open', 'printing', 'diecut', 'threading', 'perfuming', 'packaging', 'completed'];

const PRODUCTION_STEPS = [
  { id: 'printing',  name: 'Печать',            color: '#3b82f6', Icon: Printer  },
  { id: 'diecut',    name: 'Вырубка',           color: '#f97316', Icon: Scissors },
  { id: 'threading', name: 'Пробивка / нитка',  color: '#a855f7', Icon: Pin      },
  { id: 'perfuming', name: 'Парфюмирование',    color: '#10b981', Icon: Droplets },
  { id: 'packaging', name: 'Упаковка',          color: '#14b8a6', Icon: Package  },
];

function formatDateTime(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('ru', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatDuration(startedAt, completedAt) {
  if (!startedAt || !completedAt) return null;
  const diffMs = new Date(completedAt) - new Date(startedAt);
  if (diffMs < 0) return null;
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor((diffMs % 3600000) / 60000);
  if (h > 0) return `${h} ч ${m} мин`;
  return `${m} мин`;
}

// ─── Страница списка партий ───────────────────────────────────────────────────
const BatchesPage = () => {
  const { user } = useContext(AuthContext);
  const [batches, setBatches] = useState([]);
  const [techCards, setTechCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formData, setFormData] = useState({
    productName: '', techCardId: '', plannedQuantity: 1890, notes: ''
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [batchesData, tcData] = await Promise.all([
        api.get('/batches'),
        api.get('/techcards')
      ]);
      setBatches(Array.isArray(batchesData) ? batchesData : batchesData.data || []);
      setTechCards(Array.isArray(tcData) ? tcData : tcData.data || []);
    } catch (err) {
      setError('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBatch = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/batches', {
        productName: formData.productName,
        techCardId: formData.techCardId ? Number(formData.techCardId) : null,
        plannedQuantity: Number(formData.plannedQuantity),
        notes: formData.notes,
        userId: user?.id
      });
      setFormData({ productName: '', techCardId: '', plannedQuantity: 1890, notes: '' });
      setShowForm(false);
      loadData();
    } catch (err) {
      setError(err.message || 'Ошибка при создании партии');
    }
  };

  const getStats = () => {
    const total = batches.length;
    const inProgress = batches.filter(b => b.status !== 'completed' && b.status !== 'cancelled').length;
    const completed = batches.filter(b => b.status === 'completed').length;
    const cancelled = batches.filter(b => b.status === 'cancelled').length;
    return { total, inProgress, completed, cancelled };
  };

  const filteredBatches = batches.filter(batch => {
    const matchesSearch =
      batch.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.batch_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || batch.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = getStats();

  if (loading) {
    return <div className="flex-center" style={{ height: '100%' }}><p>Загрузка партий...</p></div>;
  }

  if (selectedBatchId) {
    const batch = batches.find(b => b.id === selectedBatchId);
    return (
      <BatchDetailView
        batch={batch}
        onBack={() => setSelectedBatchId(null)}
        onBatchUpdated={(updated) => {
          setBatches(prev => prev.map(b => b.id === updated.id ? updated : b));
        }}
      />
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <div className="flex-between mb-4" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ margin: 0 }}>Партии производства</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={18} /> Создать партию
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError('')}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
            &times;
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-4 gap-3 mb-4">
        {[
          { val: stats.total,     label: 'Всего партий', color: '#3b82f6' },
          { val: stats.inProgress,label: 'В работе',     color: '#f59e0b' },
          { val: stats.completed, label: 'Завершено',    color: '#10b981' },
          { val: stats.cancelled, label: 'Отменено',     color: '#dc2626' },
        ].map(({ val, label, color }) => (
          <div key={label} className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color }}>{val}</div>
            <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.5rem' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card mb-4">
          <div className="card-header"><h4>Создать новую партию</h4></div>
          <form onSubmit={handleAddBatch}>
            <div className="card-body">
              <div className="grid grid-2 gap-3">
                <div className="form-group">
                  <label>Название продукта *</label>
                  <input type="text" required value={formData.productName}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    placeholder="Введите название продукта" />
                </div>
                <div className="form-group">
                  <label>Техкарта</label>
                  <select value={formData.techCardId}
                    onChange={(e) => setFormData({ ...formData, techCardId: e.target.value })}>
                    <option value="">Не выбрана</option>
                    {techCards.map(tc => (
                      <option key={tc.id} value={tc.id}>{tc.name} (v{tc.version})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Плановое количество (шт.)</label>
                  <input type="number" required min="1" value={formData.plannedQuantity}
                    onChange={(e) => setFormData({ ...formData, plannedQuantity: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Примечания</label>
                  <textarea value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Дополнительная информация" rows="2" />
                </div>
              </div>
            </div>
            <div className="card-footer">
              <button type="submit" className="btn btn-success">Создать</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Отмена</button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: '1', minWidth: '200px', margin: 0 }}>
            <label>Поиск по названию или номеру</label>
            <input type="text" value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Введите название или номер..."
              style={{ marginTop: '0.5rem' }} />
          </div>
          <div className="form-group" style={{ flex: '1', minWidth: '200px', margin: 0 }}>
            <label>Статус</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              style={{ marginTop: '0.5rem' }}>
              <option value="">Все статусы</option>
              {Object.entries(BATCH_STATUS_MAP).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Batches List */}
      <div className="grid grid-2 gap-3">
        {filteredBatches.map((batch) => {
          const statusInfo = BATCH_STATUS_MAP[batch.status] || { label: batch.status, color: '#64748b' };
          return (
            <div key={batch.id} className="card">
              <div className="card-header">
                <div>
                  <h5 style={{ margin: '0 0 4px 0' }}>№ {batch.batch_number}</h5>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>{batch.product_name}</p>
                </div>
                <span className="badge" style={{ backgroundColor: statusInfo.color + '30', color: statusInfo.color }}>
                  {statusInfo.label}
                </span>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    <strong>Плановое / Факт:</strong> {batch.quantity_planned} / {batch.quantity_produced || 0} шт.
                  </div>
                  {batch.quantity_planned > 0 && (
                    <div className="progress">
                      <div className="progress-bar" style={{
                        width: `${Math.min(100, (batch.quantity_produced || 0) / batch.quantity_planned * 100)}%`
                      }} />
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                  <p style={{ margin: '4px 0' }}>
                    <strong>Создано:</strong> {new Date(batch.created_at).toLocaleDateString('ru')}
                  </p>
                  {batch.notes && (
                    <p style={{ margin: '4px 0' }}><strong>Примечания:</strong> {batch.notes}</p>
                  )}
                </div>
              </div>
              <div className="card-footer">
                <button className="btn btn-primary" onClick={() => setSelectedBatchId(batch.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Открыть <ChevronRight size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredBatches.length === 0 && (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '2rem' }}>
            <p className="text-muted">Партии не найдены</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Детальный вид партии ─────────────────────────────────────────────────────
const BatchDetailView = ({ batch: initialBatch, onBack, onBatchUpdated }) => {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'admin';

  const [batch, setBatch] = useState(initialBatch);
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState(initialBatch.status);
  const [savingStatus, setSavingStatus] = useState(false);

  // Форма для новой операции
  const [activeStageForm, setActiveStageForm] = useState(null);
  const [stageFormData, setStageFormData] = useState({ quantityProcessed: '', notes: '' });

  // Редактирование времени (только админ)
  const [editTimeOpId, setEditTimeOpId] = useState(null);
  const [editTimeData, setEditTimeData] = useState({ startedAt: '', completedAt: '' });

  useEffect(() => { loadAll(); }, [batch.id]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const batchData = await api.get(`/batches/${batch.id}`);
      const updated = batchData?.data || batchData;
      if (updated?.id) { setBatch(updated); setNewStatus(updated.status); }
    } catch {}
    try {
      const opsData = await api.get(`/batches/${batch.id}/operations`);
      setOperations(Array.isArray(opsData) ? opsData : opsData.data || []);
    } catch {}
    setLoading(false);
  };

  // Получить доступные следующие статусы
  const getAvailableStatuses = () => {
    const currentIdx = STATUS_ORDER.indexOf(batch.status);
    const result = [];
    if (isAdmin) {
      // Администратор может выбрать любой статус
      return Object.keys(BATCH_STATUS_MAP);
    }
    // Обычный пользователь — только следующий статус или отмена
    if (currentIdx >= 0 && currentIdx < STATUS_ORDER.length - 1) {
      result.push(STATUS_ORDER[currentIdx + 1]);
    }
    if (batch.status !== 'cancelled' && batch.status !== 'completed') {
      result.push('cancelled');
    }
    return result;
  };

  const handleSaveStatus = async () => {
    if (newStatus === batch.status) { setShowStatusModal(false); return; }
    setSavingStatus(true);
    try {
      const result = await api.put(`/batches/${batch.id}`, {
        status: newStatus,
        userRole: user?.role
      });
      const updated = result?.data || result;
      setBatch(updated);
      setShowStatusModal(false);
      if (onBatchUpdated) onBatchUpdated(updated);
    } catch (err) {
      setError(err.message || 'Ошибка при смене статуса');
    } finally {
      setSavingStatus(false);
    }
  };

  // Создать новую операцию для этапа
  const handleCreateOperation = async (e, stageId) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/batches/${batch.id}/operations`, {
        stage: stageId,
        quantityProcessed: Number(stageFormData.quantityProcessed) || 0,
        notes: stageFormData.notes,
        userId: user?.id
      });
      setStageFormData({ quantityProcessed: '', notes: '' });
      setActiveStageForm(null);
      loadAll();
    } catch (err) {
      setError(err.message || 'Ошибка при добавлении операции');
    }
  };

  // Запустить операцию
  const handleStartOp = async (opId) => {
    setError('');
    try {
      await api.patch(`/batches/${batch.id}/operations/${opId}/start`, { userId: user?.id });
      loadAll();
    } catch (err) {
      setError(err.message || 'Ошибка при запуске');
    }
  };

  // Завершить операцию
  const handleCompleteOp = async (opId) => {
    setError('');
    try {
      await api.patch(`/batches/${batch.id}/operations/${opId}/complete`, { userId: user?.id });
      loadAll();
    } catch (err) {
      setError(err.message || 'Ошибка при завершении');
    }
  };

  // Открыть редактор времени (только админ)
  const openTimeEditor = (op) => {
    setEditTimeOpId(op.id);
    setEditTimeData({
      startedAt: op.started_at ? op.started_at.substring(0, 16) : '',
      completedAt: op.completed_at ? op.completed_at.substring(0, 16) : ''
    });
  };

  const handleSaveTime = async () => {
    setError('');
    try {
      await api.patch(`/batches/${batch.id}/operations/${editTimeOpId}/time`, {
        userId: user?.id,
        userRole: user?.role,
        startedAt: editTimeData.startedAt ? new Date(editTimeData.startedAt).toISOString() : undefined,
        completedAt: editTimeData.completedAt ? new Date(editTimeData.completedAt).toISOString() : undefined
      });
      setEditTimeOpId(null);
      loadAll();
    } catch (err) {
      setError(err.message || 'Ошибка при изменении времени');
    }
  };

  const getStageOps = (stageId) => operations.filter(op => op.stage === stageId);
  const getStageQuantity = (stageId) =>
    operations.filter(op => op.stage === stageId).reduce((s, op) => s + (op.quantity_processed || 0), 0);

  const statusInfo = BATCH_STATUS_MAP[batch.status] || { label: batch.status, color: '#64748b' };
  const availableStatuses = getAvailableStatuses();

  if (loading) {
    return (
      <div style={{ width: '100%' }}>
        <button className="btn btn-secondary mb-4" onClick={onBack}>← Назад</button>
        <p>Загрузка данных...</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <button className="btn btn-secondary mb-4" onClick={onBack}>← Назад</button>

      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError('')}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
            &times;
          </button>
        </div>
      )}

      {/* Batch Info */}
      <div className="card mb-4">
        <div className="card-header">
          <div>
            <h3 style={{ margin: '0 0 4px 0' }}>Партия № {batch.batch_number}</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>{batch.product_name}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="badge" style={{
              backgroundColor: statusInfo.color + '30', color: statusInfo.color,
              fontSize: '0.875rem', padding: '0.5rem 1rem'
            }}>
              {statusInfo.label}
            </span>
            {availableStatuses.length > 0 && (
              <button className="btn btn-sm btn-outline" onClick={() => setShowStatusModal(true)}
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                Сменить статус
              </button>
            )}
          </div>
        </div>
        <div className="card-body">
          <div className="grid grid-3 gap-3">
            <div>
              <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Плановое количество</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{batch.quantity_planned} шт.</div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Произведено</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{batch.quantity_produced || 0} шт.</div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Выполнение</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {Math.min(100, Math.round((batch.quantity_produced || 0) / batch.quantity_planned * 100))}%
              </div>
            </div>
          </div>
          {batch.notes && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', fontSize: '0.875rem' }}>
              <strong>Примечания:</strong> {batch.notes}
            </div>
          )}
        </div>
      </div>

      {/* Production Pipeline */}
      <div className="card">
        <div className="card-header">
          <h4>Производственный процесс</h4>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gap: '1rem' }}>
            {PRODUCTION_STEPS.map((step, stepIdx) => {
              const stageOps = getStageOps(step.id);
              const totalQty = getStageQuantity(step.id);
              const hasCompleted = stageOps.some(op => op.op_status === 'completed');
              const hasInProgress = stageOps.some(op => op.op_status === 'in_progress');
              const Icon = step.Icon;

              return (
                <div key={step.id} style={{
                  padding: '1rem',
                  border: `2px solid ${step.color}30`,
                  borderRadius: '0.5rem',
                  backgroundColor: step.color + '05'
                }}>
                  {/* Заголовок этапа */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        backgroundColor: step.color, color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <h5 style={{ margin: 0 }}>{step.name}</h5>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Шаг {stepIdx + 1}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.875rem', color: '#94a3b8' }}>
                      <div>{stageOps.length} записей</div>
                      {totalQty > 0 && <div style={{ fontWeight: 'bold', color: step.color }}>{totalQty} шт.</div>}
                    </div>
                  </div>

                  {/* Список операций */}
                  {stageOps.length > 0 && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      {stageOps.map((op) => (
                        <OperationCard
                          key={op.id}
                          op={op}
                          stepColor={step.color}
                          isAdmin={isAdmin}
                          batchId={batch.id}
                          onStart={() => handleStartOp(op.id)}
                          onComplete={() => handleCompleteOp(op.id)}
                          onEditTime={() => openTimeEditor(op)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Добавить операцию */}
                  {activeStageForm === step.id ? (
                    <form onSubmit={(e) => handleCreateOperation(e, step.id)}
                      style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.375rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <input
                          type="number" min="0"
                          value={stageFormData.quantityProcessed}
                          onChange={(e) => setStageFormData({ ...stageFormData, quantityProcessed: e.target.value })}
                          placeholder="Кол-во (шт.)"
                          style={{ padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem' }}
                        />
                        <input
                          type="text"
                          value={stageFormData.notes}
                          onChange={(e) => setStageFormData({ ...stageFormData, notes: e.target.value })}
                          placeholder="Примечания (необязательно)"
                          style={{ padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="submit" className="btn btn-sm btn-success">Добавить</button>
                        <button type="button" className="btn btn-sm btn-secondary"
                          onClick={() => { setActiveStageForm(null); setStageFormData({ quantityProcessed: '', notes: '' }); }}>
                          Отмена
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => setActiveStageForm(step.id)}
                      style={{ borderColor: step.color, color: step.color, backgroundColor: 'transparent' }}
                    >
                      + Добавить запись
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <h2 style={{ marginTop: 0 }}>Сменить статус партии</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Партия № {batch.batch_number}</p>

            {!isAdmin && (
              <div style={{
                padding: '0.75rem 1rem', marginBottom: '1rem',
                background: '#fef3c7', borderRadius: '0.375rem',
                fontSize: '0.875rem', color: '#92400e'
              }}>
                ⚠️ Статусы меняются строго по порядку. Пропуск шагов недоступен.
              </div>
            )}
            {isAdmin && (
              <div style={{
                padding: '0.75rem 1rem', marginBottom: '1rem',
                background: '#eff6ff', borderRadius: '0.375rem',
                fontSize: '0.875rem', color: '#1e40af'
              }}>
                👑 Администратор: доступны все статусы.
              </div>
            )}

            <div className="form-group">
              <label>Новый статус</label>
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
                style={{ marginTop: '0.5rem' }}>
                {availableStatuses.map(key => (
                  <option key={key} value={key}>{BATCH_STATUS_MAP[key]?.label || key}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="btn btn-primary" onClick={handleSaveStatus}
                disabled={savingStatus || newStatus === batch.status}>
                {savingStatus ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowStatusModal(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Time Modal (только админ) */}
      {editTimeOpId && isAdmin && (
        <div className="modal-overlay" onClick={() => setEditTimeOpId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <h2 style={{ marginTop: 0 }}>Изменить время операции</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Только администратор может редактировать зафиксированное время.
            </p>
            <div className="form-group">
              <label>Время начала</label>
              <input type="datetime-local" value={editTimeData.startedAt}
                onChange={(e) => setEditTimeData({ ...editTimeData, startedAt: e.target.value })}
                style={{ marginTop: '0.5rem' }} />
            </div>
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label>Время завершения</label>
              <input type="datetime-local" value={editTimeData.completedAt}
                onChange={(e) => setEditTimeData({ ...editTimeData, completedAt: e.target.value })}
                style={{ marginTop: '0.5rem' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="btn btn-primary" onClick={handleSaveTime}>Сохранить</button>
              <button className="btn btn-secondary" onClick={() => setEditTimeOpId(null)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Карточка операции ────────────────────────────────────────────────────────
const OperationCard = ({ op, stepColor, isAdmin, onStart, onComplete, onEditTime }) => {
  const isPending     = op.op_status === 'pending'     || (!op.op_status && !op.started_at);
  const isInProgress  = op.op_status === 'in_progress' || (op.started_at && !op.completed_at);
  const isCompleted   = op.op_status === 'completed'   || !!op.completed_at;
  const duration      = formatDuration(op.started_at, op.completed_at);

  return (
    <div style={{
      marginBottom: '0.5rem',
      padding: '0.75rem',
      background: isCompleted ? '#f0fdf4' : isInProgress ? '#eff6ff' : '#f8fafc',
      border: `1px solid ${isCompleted ? '#bbf7d0' : isInProgress ? '#bfdbfe' : '#e2e8f0'}`,
      borderRadius: '0.375rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          {/* Статус операции */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            {isCompleted
              ? <CheckCircle size={14} color="#10b981" />
              : isInProgress
                ? <Clock size={14} color="#3b82f6" />
                : <Clock size={14} color="#94a3b8" />
            }
            <span style={{
              fontSize: '0.75rem', fontWeight: 'bold',
              color: isCompleted ? '#10b981' : isInProgress ? '#3b82f6' : '#94a3b8'
            }}>
              {isCompleted ? 'Завершено' : isInProgress ? 'В работе' : 'Ожидает'}
            </span>
            {op.time_locked === 1 && (
              <Lock size={12} color="#94a3b8" title="Время зафиксировано" />
            )}
          </div>

          {/* Количество и примечания */}
          {(op.quantity_processed > 0 || op.notes) && (
            <div style={{ fontSize: '0.875rem', color: '#374151' }}>
              {op.quantity_processed > 0 && <span><strong>{op.quantity_processed} шт.</strong></span>}
              {op.notes && <span style={{ color: '#6b7280', marginLeft: '0.5rem' }}>— {op.notes}</span>}
            </div>
          )}

          {/* Время */}
          {op.started_at && (
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.35rem' }}>
              <span>▶ {formatDateTime(op.started_at)}</span>
              {op.completed_at && (
                <>
                  <span style={{ margin: '0 0.4rem' }}>→</span>
                  <span>■ {formatDateTime(op.completed_at)}</span>
                  {duration && (
                    <span style={{ marginLeft: '0.5rem', color: stepColor, fontWeight: 'bold' }}>({duration})</span>
                  )}
                </>
              )}
            </div>
          )}

          {op.operator_name && (
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              Оператор: {op.operator_name}
            </div>
          )}
        </div>

        {/* Кнопки действий */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginLeft: '0.75rem' }}>
          {isPending && (
            <button
              onClick={onStart}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '0.3rem 0.6rem', fontSize: '0.75rem',
                background: '#3b82f6', color: 'white', border: 'none',
                borderRadius: '0.25rem', cursor: 'pointer', whiteSpace: 'nowrap'
              }}
            >
              <Play size={12} /> Старт
            </button>
          )}
          {isInProgress && (
            <button
              onClick={onComplete}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '0.3rem 0.6rem', fontSize: '0.75rem',
                background: '#10b981', color: 'white', border: 'none',
                borderRadius: '0.25rem', cursor: 'pointer', whiteSpace: 'nowrap'
              }}
            >
              <Check size={12} /> Завершить
            </button>
          )}
          {isAdmin && op.started_at && (
            <button
              onClick={onEditTime}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '0.3rem 0.6rem', fontSize: '0.75rem',
                background: 'transparent', color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '0.25rem', cursor: 'pointer', whiteSpace: 'nowrap'
              }}
            >
              <Edit2 size={12} /> Время
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchesPage;
