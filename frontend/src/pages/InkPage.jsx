import React, { useEffect, useState, useContext } from 'react';
import { Plus, Eye, CheckCircle, AlertCircle, Droplets } from 'lucide-react';
import api from '../api';
import { AuthContext } from '../context/AuthContext';

const InkPage = () => {
  const { user } = useContext(AuthContext);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);
  const [calibrationBatch, setCalibrationBatch] = useState(null);

  // Create modal state
  const [availableBatches, setAvailableBatches] = useState([]);
  const [createForm, setCreateForm] = useState({
    batch_id: '',
    product_name: '',
    components: [{ name: '', planned_grams: '', actual_grams: '' }],
    notes: ''
  });

  // Calibration modal state
  const [calibrationForm, setCalibrationForm] = useState({
    result: '',
    notes: ''
  });

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    try {
      setLoading(true);
      const data = await api.get('/ink');
      setBatches(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error('Ошибка при загрузке партий краски:', err);
      setError('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableBatches = async () => {
    try {
      const data = await api.get('/batches?status=open,printing');
      setAvailableBatches(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error('Ошибка при загрузке партий:', err);
    }
  };

  const handleCreateClick = async () => {
    await loadAvailableBatches();
    setCreateForm({
      batch_id: '',
      product_name: '',
      components: [{ name: '', planned_grams: '', actual_grams: '' }],
      notes: ''
    });
    setShowCreateModal(true);
  };

  const handleAddComponent = () => {
    setCreateForm({
      ...createForm,
      components: [...createForm.components, { name: '', planned_grams: '', actual_grams: '' }]
    });
  };

  const handleRemoveComponent = (index) => {
    setCreateForm({
      ...createForm,
      components: createForm.components.filter((_, i) => i !== index)
    });
  };

  const handleComponentChange = (index, field, value) => {
    const updated = [...createForm.components];
    updated[index] = { ...updated[index], [field]: value };
    setCreateForm({ ...createForm, components: updated });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.product_name.trim()) {
      setError('Введите наименование краски');
      return;
    }
    if (createForm.components.length === 0 || !createForm.components[0].name.trim()) {
      setError('Добавьте хотя бы один компонент');
      return;
    }

    try {
      setError('');
      await api.post('/ink', {
        batch_id: createForm.batch_id,
        product_name: createForm.product_name,
        components: createForm.components,
        notes: createForm.notes,
        operator_id: user?.id
      });
      setShowCreateModal(false);
      loadBatches();
    } catch (err) {
      setError(err.message || 'Ошибка при создании партии краски');
    }
  };

  const handleCalibrateClick = (batch) => {
    setCalibrationBatch(batch);
    setCalibrationForm({ result: '', notes: '' });
    setShowCalibrationModal(true);
  };

  const handleCalibrationSubmit = async (e) => {
    e.preventDefault();
    if (!calibrationForm.result) {
      setError('Выберите результат калибровки');
      return;
    }

    try {
      setError('');
      await api.post(`/ink/${calibrationBatch.id}/calibrate`, {
        calibration_result: calibrationForm.result,
        notes: calibrationForm.notes,
        operator_id: user?.id
      });
      setShowCalibrationModal(false);
      loadBatches();
    } catch (err) {
      setError(err.message || 'Ошибка при записи калибровки');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#9ca3af';
      case 'ok': return '#10b981';
      case 'needs_correction': return '#f59e0b';
      case 'defect': return '#dc2626';
      default: return '#64748b';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Ожидает калибровки';
      case 'ok': return 'Соответствует эталону';
      case 'needs_correction': return 'Требует корректировки';
      case 'defect': return 'Брак';
      default: return status;
    }
  };

  const filteredBatches = filterStatus
    ? batches.filter(b => b.calibration_result === filterStatus)
    : batches;

  const stats = {
    total: batches.length,
    pending: batches.filter(b => b.calibration_result === 'pending').length,
    ok: batches.filter(b => b.calibration_result === 'ok').length,
    needs_correction: batches.filter(b => b.calibration_result === 'needs_correction').length,
    defect: batches.filter(b => b.calibration_result === 'defect').length
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '100%' }}>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <div className="flex-between mb-4">
        <h1 style={{ marginTop: 0 }}>Приготовление краски</h1>
        <button className="btn btn-primary" onClick={handleCreateClick}>
          <Plus size={20} /> Создать партию краски
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>&times;</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-5 gap-3 mb-4">
        <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '0.5rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#2563eb' }}>
            {stats.total}
          </div>
          <div className="text-muted" style={{ fontSize: '0.875rem' }}>Всего партий</div>
        </div>
        <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '0.5rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#9ca3af' }}>
            {stats.pending}
          </div>
          <div className="text-muted" style={{ fontSize: '0.875rem' }}>Ожидает калибровки</div>
        </div>
        <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '0.5rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>
            {stats.ok}
          </div>
          <div className="text-muted" style={{ fontSize: '0.875rem' }}>Соответствует эталону</div>
        </div>
        <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '0.5rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>
            {stats.needs_correction}
          </div>
          <div className="text-muted" style={{ fontSize: '0.875rem' }}>Требует корректировки</div>
        </div>
        <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '0.5rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#dc2626' }}>
            {stats.defect}
          </div>
          <div className="text-muted" style={{ fontSize: '0.875rem' }}>Брак</div>
        </div>
      </div>

      {/* Filter */}
      <div style={{ marginBottom: '1.5rem' }}>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '0.5rem',
            borderRadius: '0.375rem',
            border: '1px solid #e5e7eb',
            fontSize: '0.875rem',
            minWidth: '200px'
          }}
        >
          <option value="">Все партии</option>
          <option value="pending">Ожидает калибровки</option>
          <option value="ok">Соответствует эталону</option>
          <option value="needs_correction">Требует корректировки</option>
          <option value="defect">Брак</option>
        </select>
      </div>

      {/* Batches Grid */}
      {filteredBatches.length > 0 ? (
        <div className="grid grid-2 gap-4">
          {filteredBatches.map((batch) => (
            <div key={batch.id} className="card">
              <div style={{ padding: '1.5rem' }}>
                <div className="flex-between mb-2">
                  <h3 style={{ margin: 0, color: '#2563eb' }}>
                    {batch.ink_batch_number}
                  </h3>
                  <span
                    className="badge"
                    style={{
                      backgroundColor: getStatusColor(batch.calibration_result),
                      color: 'white',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}
                  >
                    {getStatusLabel(batch.calibration_result)}
                  </span>
                </div>

                <p className="text-muted" style={{ margin: '0 0 1rem 0', fontSize: '0.875rem' }}>
                  <strong>Продукт:</strong> {batch.product_name}
                </p>

                <p className="text-muted" style={{ margin: '0 0 1rem 0', fontSize: '0.875rem' }}>
                  <strong>Дата создания:</strong> {new Date(batch.created_at).toLocaleString('ru-RU')}
                </p>

                {/* Components */}
                {batch.components && (
                  <div style={{ marginBottom: '1rem' }}>
                    <strong style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
                      Компоненты:
                    </strong>
                    <div style={{ fontSize: '0.75rem' }}>
                      {typeof batch.components === 'string'
                        ? JSON.parse(batch.components).map((comp, idx) => (
                          <div key={idx} style={{ marginBottom: '0.25rem', color: '#64748b' }}>
                            {comp.name}: {comp.planned_grams}г (план) / {comp.actual_grams}г (факт)
                          </div>
                        ))
                        : Array.isArray(batch.components)
                        ? batch.components.map((comp, idx) => (
                          <div key={idx} style={{ marginBottom: '0.25rem', color: '#64748b' }}>
                            {comp.name}: {comp.planned_grams}г (план) / {comp.actual_grams}г (факт)
                          </div>
                        ))
                        : null
                      }
                    </div>
                  </div>
                )}

                {/* Notes */}
                {batch.notes && (
                  <p className="text-muted" style={{ margin: '0 0 1rem 0', fontSize: '0.75rem', fontStyle: 'italic' }}>
                    {batch.notes}
                  </p>
                )}

                {/* Buttons */}
                <div className="flex gap-2" style={{ marginTop: '1.5rem' }}>
                  {batch.calibration_result === 'pending' && (
                    <button
                      className="btn btn-warning flex-1"
                      onClick={() => handleCalibrateClick(batch)}
                      style={{ fontSize: '0.875rem' }}
                    >
                      <CheckCircle size={16} /> Записать калибровку
                    </button>
                  )}
                  <button
                    className="btn btn-info flex-1"
                    style={{ fontSize: '0.875rem' }}
                  >
                    <Eye size={16} /> Просмотр
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '2rem' }}>
            <Droplets size={48} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
            <p className="text-muted">Нет партий краски</p>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Создать партию краски</h2>
            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label>Наименование краски</label>
                <input
                  type="text"
                  value={createForm.product_name}
                  onChange={(e) => setCreateForm({ ...createForm, product_name: e.target.value })}
                  required
                  placeholder="Например: Чёрная CMYK, Пантон 485..."
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Производственная партия <span style={{ color: '#9ca3af', fontWeight: 400 }}>(необязательно)</span></label>
                <select
                  value={createForm.batch_id}
                  onChange={(e) => setCreateForm({ ...createForm, batch_id: e.target.value })}
                >
                  <option value="">-- Не привязывать к партии --</option>
                  {availableBatches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.batch_number}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Компоненты</label>
                {createForm.components.map((comp, index) => (
                  <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Название"
                      value={comp.name}
                      onChange={(e) => handleComponentChange(index, 'name', e.target.value)}
                      style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #e5e7eb' }}
                    />
                    <input
                      type="number"
                      placeholder="План (г)"
                      value={comp.planned_grams}
                      onChange={(e) => handleComponentChange(index, 'planned_grams', e.target.value)}
                      style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #e5e7eb' }}
                    />
                    <input
                      type="number"
                      placeholder="Факт (г)"
                      value={comp.actual_grams}
                      onChange={(e) => handleComponentChange(index, 'actual_grams', e.target.value)}
                      style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #e5e7eb' }}
                    />
                    {createForm.components.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveComponent(index)}
                        className="btn btn-danger"
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddComponent}
                  className="btn btn-secondary"
                  style={{ marginTop: '0.5rem' }}
                >
                  + Добавить компонент
                </button>
              </div>

              <div className="form-group">
                <label>Примечания</label>
                <textarea
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  placeholder="Дополнительные примечания"
                  rows={3}
                />
              </div>

              <div className="flex gap-2" style={{ marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-success flex-1">
                  Создать
                </button>
                <button
                  type="button"
                  className="btn btn-secondary flex-1"
                  onClick={() => setShowCreateModal(false)}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Calibration Modal */}
      {showCalibrationModal && (
        <div className="modal-overlay" onClick={() => setShowCalibrationModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Записать калибровку</h2>
            {calibrationBatch && (
              <p style={{ color: '#2563eb', fontWeight: 600, marginBottom: '1.5rem' }}>
                Партия: {calibrationBatch.ink_batch_number}
              </p>
            )}
            <form onSubmit={handleCalibrationSubmit}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '1rem', fontWeight: 600 }}>Результат</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      value="ok"
                      checked={calibrationForm.result === 'ok'}
                      onChange={(e) => setCalibrationForm({ ...calibrationForm, result: e.target.value })}
                    />
                    <span>Соответствует эталону</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      value="needs_correction"
                      checked={calibrationForm.result === 'needs_correction'}
                      onChange={(e) => setCalibrationForm({ ...calibrationForm, result: e.target.value })}
                    />
                    <span>Требует корректировки</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      value="defect"
                      checked={calibrationForm.result === 'defect'}
                      onChange={(e) => setCalibrationForm({ ...calibrationForm, result: e.target.value })}
                    />
                    <span>Брак</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Примечания</label>
                <textarea
                  value={calibrationForm.notes}
                  onChange={(e) => setCalibrationForm({ ...calibrationForm, notes: e.target.value })}
                  placeholder="Описание результата калибровки"
                  rows={3}
                />
              </div>

              <div className="flex gap-2" style={{ marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-success flex-1">
                  Записать
                </button>
                <button
                  type="button"
                  className="btn btn-secondary flex-1"
                  onClick={() => setShowCalibrationModal(false)}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InkPage;
