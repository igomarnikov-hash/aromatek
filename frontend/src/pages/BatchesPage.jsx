import React, { useEffect, useState, useContext } from 'react';
import { Plus, AlertCircle, ChevronRight } from 'lucide-react';
import api from '../api';
import { AuthContext } from '../context/AuthContext';

const BATCH_STATUS_MAP = {
  open: { label: 'Открыта', color: '#94a3b8' },
  printing: { label: 'Печать', color: '#3b82f6' },
  diecut: { label: 'Вырубка', color: '#f97316' },
  threading: { label: 'Пробивка', color: '#a855f7' },
  perfuming: { label: 'Парфюм', color: '#10b981' },
  packaging: { label: 'Упаковка', color: '#14b8a6' },
  completed: { label: 'Завершено', color: '#10b981' },
  cancelled: { label: 'Отменено', color: '#dc2626' }
};

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
    productName: '',
    techCardId: '',
    plannedQuantity: 1890,
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

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
      console.error('Ошибка при загрузке партий:', err);
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
      const msg = err.message || 'Ошибка при создании партии';
      setError(msg);
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
    return (
      <div className="flex-center" style={{ height: '100%' }}>
        <p>Загрузка партий...</p>
      </div>
    );
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
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={18} />
          Создать партию
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>&times;</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-4 gap-3 mb-4">
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>{stats.total}</div>
          <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.5rem' }}>Всего партий</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>{stats.inProgress}</div>
          <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.5rem' }}>В работе</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>{stats.completed}</div>
          <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.5rem' }}>Завершено</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#dc2626' }}>{stats.cancelled}</div>
          <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.5rem' }}>Отменено</div>
        </div>
      </div>

      {/* Create Batch Form */}
      {showForm && (
        <div className="card mb-4">
          <div className="card-header">
            <h4>Создать новую партию</h4>
          </div>
          <form onSubmit={handleAddBatch}>
            <div className="card-body">
              <div className="grid grid-2 gap-3">
                <div className="form-group">
                  <label>Название продукта *</label>
                  <input
                    type="text"
                    required
                    value={formData.productName}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    placeholder="Введите название продукта"
                  />
                </div>

                <div className="form-group">
                  <label>Техкарта</label>
                  <select
                    value={formData.techCardId}
                    onChange={(e) => setFormData({ ...formData, techCardId: e.target.value })}
                  >
                    <option value="">Не выбрана</option>
                    {techCards.map(tc => (
                      <option key={tc.id} value={tc.id}>{tc.name} (v{tc.version})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Плановое количество (шт.)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.plannedQuantity}
                    onChange={(e) => setFormData({ ...formData, plannedQuantity: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Примечания</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Дополнительная информация"
                    rows="2"
                  ></textarea>
                </div>
              </div>
            </div>

            <div className="card-footer">
              <button type="submit" className="btn btn-success">Создать</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: '1', minWidth: '200px', margin: 0 }}>
            <label>Поиск по названию или номеру</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Введите название или номер..."
              style={{ marginTop: '0.5rem' }}
            />
          </div>
          <div className="form-group" style={{ flex: '1', minWidth: '200px', margin: 0 }}>
            <label>Статус</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ marginTop: '0.5rem' }}
            >
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
                <span
                  className="badge"
                  style={{ backgroundColor: statusInfo.color + '30', color: statusInfo.color }}
                >
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
                      <div className="progress-bar" style={{ width: `${Math.min(100, (batch.quantity_produced || 0) / batch.quantity_planned * 100)}%` }}></div>
                    </div>
                  )}
                </div>

                <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                  <p style={{ margin: '4px 0' }}>
                    <strong>Создано:</strong> {new Date(batch.created_at).toLocaleDateString('ru')}
                  </p>
                  {batch.notes && (
                    <p style={{ margin: '4px 0' }}>
                      <strong>Примечания:</strong> {batch.notes}
                    </p>
                  )}
                </div>
              </div>

              <div className="card-footer">
                <button
                  className="btn btn-primary"
                  onClick={() => setSelectedBatchId(batch.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  Открыть
                  <ChevronRight size={16} />
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

const PRODUCTION_STEPS = [
  { id: 'printing', name: 'Печать', color: '#3b82f6' },
  { id: 'diecut', name: 'Вырубка', color: '#f97316' },
  { id: 'threading', name: 'Пробивка', color: '#a855f7' },
  { id: 'perfuming', name: 'Парфюм', color: '#10b981' },
  { id: 'packaging', name: 'Упаковка', color: '#14b8a6' }
];

const BatchDetailView = ({ batch: initialBatch, onBack, onBatchUpdated }) => {
  const { user } = useContext(AuthContext);
  const [batch, setBatch] = useState(initialBatch);
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showStageForm, setShowStageForm] = useState(null);
  const [stageFormData, setStageFormData] = useState({ quantityProcessed: '', notes: '' });
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState(initialBatch.status);
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    loadAll();
  }, [batch.id]);

  const loadAll = async () => {
    setLoading(true);
    // Load batch info
    try {
      const batchData = await api.get(`/batches/${batch.id}`);
      const updatedBatch = batchData?.data || batchData;
      if (updatedBatch?.id) {
        setBatch(updatedBatch);
        setNewStatus(updatedBatch.status);
      }
    } catch (err) {
      console.error('Ошибка при загрузке партии:', err);
    }
    // Load operations separately — не блокируем отображение если endpoint ещё не задеплоен
    try {
      const opsData = await api.get(`/batches/${batch.id}/operations`);
      setOperations(Array.isArray(opsData) ? opsData : opsData.data || []);
    } catch (err) {
      console.error('Ошибка при загрузке операций (endpoint может ещё не задеплоен):', err);
      // Не показываем ошибку пользователю — просто пустой список
    }
    setLoading(false);
  };

  const handleSaveStatus = async () => {
    if (newStatus === batch.status) { setShowStatusModal(false); return; }
    setSavingStatus(true);
    try {
      const result = await api.put(`/batches/${batch.id}`, { status: newStatus });
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

  const handleCreateStage = async (e, stageId) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/batches/${batch.id}/operations`, {
        stage: stageId,
        quantityProcessed: Number(stageFormData.quantityProcessed),
        notes: stageFormData.notes,
        userId: user?.id
      });
      setStageFormData({ quantityProcessed: '', notes: '' });
      setShowStageForm(null);
      loadAll();
    } catch (err) {
      setError(err.message || 'Ошибка при добавлении операции');
    }
  };

  const getStageCount = (stageId) => operations.filter(op => op.stage === stageId).length;
  const getStageQuantity = (stageId) =>
    operations.filter(op => op.stage === stageId).reduce((s, op) => s + (op.quantity_processed || 0), 0);

  const statusInfo = BATCH_STATUS_MAP[batch.status] || { label: batch.status, color: '#64748b' };

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
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>&times;</button>
        </div>
      )}

      {/* Batch Info Card */}
      <div className="card mb-4">
        <div className="card-header">
          <div>
            <h3 style={{ margin: '0 0 4px 0' }}>Партия № {batch.batch_number}</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>{batch.product_name}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="badge" style={{
              backgroundColor: statusInfo.color + '30',
              color: statusInfo.color,
              fontSize: '0.875rem',
              padding: '0.5rem 1rem'
            }}>
              {statusInfo.label}
            </span>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setShowStatusModal(true)}
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            >
              Сменить статус
            </button>
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
              <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Статус исполнения</div>
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
            {PRODUCTION_STEPS.map((step) => (
              <div key={step.id} style={{
                padding: '1rem',
                border: `2px solid ${step.color}30`,
                borderRadius: '0.5rem',
                backgroundColor: step.color + '05'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      backgroundColor: step.color, color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 'bold', fontSize: '0.875rem'
                    }}>
                      {PRODUCTION_STEPS.indexOf(step) + 1}
                    </div>
                    <h5 style={{ margin: 0 }}>{step.name}</h5>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                    {getStageCount(step.id)} записей • {getStageQuantity(step.id)} шт.
                  </div>
                </div>

                {getStageCount(step.id) > 0 && (
                  <div style={{ marginBottom: '0.75rem', fontSize: '0.875rem', color: '#64748b' }}>
                    {operations.filter(op => op.stage === step.id).map((op, idx) => (
                      <div key={op.id || idx} style={{ paddingLeft: '2rem', marginBottom: '0.25rem' }}>
                        • {op.quantity_processed} шт.
                        {op.notes && ` — ${op.notes}`}
                        {op.created_at && ` (${new Date(op.created_at).toLocaleDateString('ru')})`}
                      </div>
                    ))}
                  </div>
                )}

                {showStageForm === step.id ? (
                  <form onSubmit={(e) => handleCreateStage(e, step.id)} style={{ marginTop: '0.75rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <input
                        type="number" required min="1"
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
                      <button type="submit" className="btn btn-sm btn-success">Сохранить</button>
                      <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowStageForm(null)}>Отмена</button>
                    </div>
                  </form>
                ) : (
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => setShowStageForm(step.id)}
                    style={{ borderColor: step.color, color: step.color, backgroundColor: 'transparent' }}
                  >
                    + Добавить запись
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h2 style={{ marginTop: 0 }}>Сменить статус партии</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
              Партия № {batch.batch_number}
            </p>
            <div className="form-group">
              <label>Новый статус</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                style={{ marginTop: '0.5rem' }}
              >
                {Object.entries(BATCH_STATUS_MAP).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                className="btn btn-primary"
                onClick={handleSaveStatus}
                disabled={savingStatus || newStatus === batch.status}
              >
                {savingStatus ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowStatusModal(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchesPage;
