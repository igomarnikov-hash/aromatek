import React, { useEffect, useState, useContext } from 'react';
import { Plus, PlayCircle, CheckCircle, AlertCircle, Scissors } from 'lucide-react';
import api from '../api';
import { AuthContext } from '../context/AuthContext';

const DieCutPage = () => {
  const { user } = useContext(AuthContext);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [activeSession, setActiveSession] = useState(null);

  // Create modal state
  const [availableBatches, setAvailableBatches] = useState([]);
  const [availablePrintingSessions, setAvailablePrintingSessions] = useState([]);
  const [createForm, setCreateForm] = useState({
    batch_id: '',
    printing_session_id: '',
    press_model: '',
    press_serial: '',
    sheets_planned: 42,
    quantity_planned: 1890
  });

  // Complete modal state
  const [completeForm, setCompleteForm] = useState({
    sheets_actual: '',
    quantity_actual: '',
    defect_underpress: 0,
    defect_burrs: 0,
    defect_deformation: 0,
    container: '',
    cell: ''
  });

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await api.get('/diecut');
      setSessions(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error('Ошибка при загрузке партий вырубки:', err);
      setError('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  const loadCreateFormOptions = async () => {
    try {
      const [batches, printing] = await Promise.all([
        api.get('/batches'),
        api.get('/printing')
      ]);
      setAvailableBatches(Array.isArray(batches) ? batches : batches.data || []);
      setAvailablePrintingSessions(Array.isArray(printing) ? printing : printing.data || []);
    } catch (err) {
      console.error('Ошибка при загрузке опций:', err);
    }
  };

  const handleCreateClick = async () => {
    await loadCreateFormOptions();
    setCreateForm({
      batch_id: '',
      printing_session_id: '',
      press_model: '',
      press_serial: '',
      sheets_planned: 42,
      quantity_planned: 1890
    });
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.printing_session_id) {
      setError('Выберите партию печати');
      return;
    }

    try {
      setError('');
      await api.post('/diecut', {
        batch_id: createForm.batch_id,
        printing_session_id: createForm.printing_session_id,
        press_model: createForm.press_model,
        press_serial: createForm.press_serial,
        sheets_planned: Number(createForm.sheets_planned),
        quantity_planned: Number(createForm.quantity_planned),
        operator_id: user?.id
      });
      setShowCreateModal(false);
      loadSessions();
    } catch (err) {
      setError(err.message || 'Ошибка при создании сеанса вырубки');
    }
  };

  const handleStartClick = async (id) => {
    try {
      setError('');
      await api.post(`/diecut/${id}/start`, { operator_id: user?.id });
      loadSessions();
    } catch (err) {
      setError(err.message || 'Ошибка при запуске вырубки');
    }
  };

  const handleCompleteClick = (session) => {
    setActiveSession(session);
    setCompleteForm({
      sheets_actual: '',
      quantity_actual: '',
      defect_underpress: 0,
      defect_burrs: 0,
      defect_deformation: 0,
      container: '',
      cell: ''
    });
    setShowCompleteModal(true);
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    if (!activeSession) return;

    try {
      setError('');
      const totalDefects = Number(completeForm.defect_underpress) +
                          Number(completeForm.defect_burrs) +
                          Number(completeForm.defect_deformation);

      await api.post(`/diecut/${activeSession.id}/complete`, {
        sheets_actual: Number(completeForm.sheets_actual),
        quantity_actual: Number(completeForm.quantity_actual),
        defect_underpress: Number(completeForm.defect_underpress),
        defect_burrs: Number(completeForm.defect_burrs),
        defect_deformation: Number(completeForm.defect_deformation),
        defect_total: totalDefects,
        container: completeForm.container,
        cell: completeForm.cell,
        operator_id: user?.id
      });
      setShowCompleteModal(false);
      loadSessions();
    } catch (err) {
      setError(err.message || 'Ошибка при завершении вырубки');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'planned': return '#9ca3af';
      case 'in_progress': return '#f59e0b';
      case 'completed': return '#10b981';
      case 'cancelled': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'planned': return 'Плановый';
      case 'in_progress': return 'В работе';
      case 'completed': return 'Завершен';
      case 'cancelled': return 'Отменен';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '100%' }}>
        <p>Загрузка...</p>
      </div>
    );
  }

  const activeSessions = sessions.filter(s => s.status === 'in_progress');
  const stats = {
    total: sessions.length,
    planned: sessions.filter(s => s.status === 'planned').length,
    active: activeSessions.length,
    completed: sessions.filter(s => s.status === 'completed').length
  };

  return (
    <div style={{ width: '100%' }}>
      <div className="flex-between mb-4">
        <h1 style={{ marginTop: 0 }}>Партии вырубки</h1>
        <button className="btn btn-primary" onClick={handleCreateClick}>
          <Plus size={20} /> Создать партию вырубки
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
      <div className="grid grid-4 gap-3 mb-4">
        <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '0.5rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#2563eb' }}>
            {stats.total}
          </div>
          <div className="text-muted" style={{ fontSize: '0.875rem' }}>Всего</div>
        </div>
        <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '0.5rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#9ca3af' }}>
            {stats.planned}
          </div>
          <div className="text-muted" style={{ fontSize: '0.875rem' }}>Плановые</div>
        </div>
        <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '0.5rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>
            {stats.active}
          </div>
          <div className="text-muted" style={{ fontSize: '0.875rem' }}>В работе</div>
        </div>
        <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '0.5rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>
            {stats.completed}
          </div>
          <div className="text-muted" style={{ fontSize: '0.875rem' }}>Завершены</div>
        </div>
      </div>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <div className="card mb-4" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="card-header">
            <h4>Активные партии</h4>
          </div>
          <div className="card-body">
            <div className="grid grid-2 gap-3">
              {activeSessions.map((session) => (
                <div key={session.id} style={{
                  padding: '1rem',
                  backgroundColor: '#fefce8',
                  border: '1px solid #fcd34d',
                  borderRadius: '0.5rem'
                }}>
                  <div className="flex-between mb-1">
                    <h5 style={{ margin: 0, color: '#b45309' }}>
                      {session.session_number}
                    </h5>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: getStatusColor(session.status),
                        color: 'white',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}
                    >
                      {getStatusLabel(session.status)}
                    </span>
                  </div>
                  <p className="text-muted" style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
                    Партия: {session.batch_number} | Оборудование: {session.press_model}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* All Sessions */}
      {sessions.length > 0 ? (
        <div className="grid grid-2 gap-4">
          {sessions.map((session) => (
            <div key={session.id} className="card">
              <div style={{ padding: '1.5rem' }}>
                <div className="flex-between mb-2">
                  <h3 style={{ margin: 0, color: '#2563eb' }}>
                    {session.session_number}
                  </h3>
                  <span
                    className="badge"
                    style={{
                      backgroundColor: getStatusColor(session.status),
                      color: 'white',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}
                  >
                    {getStatusLabel(session.status)}
                  </span>
                </div>

                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#64748b' }}>
                  <strong>Партия:</strong> {session.batch_number}
                </p>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#64748b' }}>
                  <strong>Оборудование:</strong> {session.press_model} (SN: {session.press_serial})
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                  <div>
                    <span className="text-muted">Листов план:</span>
                    <div style={{ fontWeight: 600, color: '#2563eb' }}>{session.sheets_planned}</div>
                  </div>
                  <div>
                    <span className="text-muted">Листов факт:</span>
                    <div style={{ fontWeight: 600, color: '#2563eb' }}>{session.sheets_actual || '—'}</div>
                  </div>
                  <div>
                    <span className="text-muted">Кол-во план:</span>
                    <div style={{ fontWeight: 600, color: '#2563eb' }}>{session.quantity_planned}</div>
                  </div>
                  <div>
                    <span className="text-muted">Кол-во факт:</span>
                    <div style={{ fontWeight: 600, color: '#2563eb' }}>{session.quantity_actual || '—'}</div>
                  </div>
                </div>

                {/* Defects */}
                {(session.defect_underpress > 0 || session.defect_burrs > 0 || session.defect_deformation > 0) && (
                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: '#fee2e2',
                    borderRadius: '0.375rem',
                    marginBottom: '1rem',
                    fontSize: '0.75rem',
                    color: '#dc2626'
                  }}>
                    <div><strong>Недопресс:</strong> {session.defect_underpress}</div>
                    <div><strong>Заусенцы:</strong> {session.defect_burrs}</div>
                    <div><strong>Деформация:</strong> {session.defect_deformation}</div>
                  </div>
                )}

                {/* Storage Location */}
                {session.container && (
                  <div style={{ padding: '0.75rem', backgroundColor: '#e0f2fe', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                    <strong>Место хранения:</strong> Тара {session.container}
                    {session.cell && `, Ячейка ${session.cell}`}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {session.status === 'planned' && (
                    <button
                      className="btn btn-primary flex-1"
                      onClick={() => handleStartClick(session.id)}
                    >
                      <PlayCircle size={16} /> Начать вырубку
                    </button>
                  )}

                  {session.status === 'in_progress' && (
                    <button
                      className="btn btn-success flex-1"
                      onClick={() => handleCompleteClick(session)}
                    >
                      <CheckCircle size={16} /> Завершить
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '2rem' }}>
            <Scissors size={48} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
            <p className="text-muted">Нет партий вырубки. Нажмите «Создать партию вырубки»</p>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Создать партию вырубки</h2>
            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label>Партия печати <span style={{ color: '#9ca3af', fontWeight: 400 }}>(обязательно)</span></label>
                <select
                  value={createForm.printing_session_id}
                  onChange={(e) => {
                    const session = availablePrintingSessions.find(s => s.id === Number(e.target.value));
                    setCreateForm({
                      ...createForm,
                      printing_session_id: e.target.value,
                      batch_id: session?.batch_id || createForm.batch_id
                    });
                  }}
                  required
                >
                  <option value="">-- Выберите партию печати --</option>
                  {availablePrintingSessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.session_number}{session.batch_number ? ` (Партия ${session.batch_number})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Производственная партия <span style={{ color: '#9ca3af', fontWeight: 400 }}>(необязательно)</span></label>
                <select
                  value={createForm.batch_id}
                  onChange={(e) => setCreateForm({ ...createForm, batch_id: e.target.value })}
                >
                  <option value="">-- Не привязывать --</option>
                  {availableBatches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.batch_number} — {batch.product_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Модель тигельного пресса</label>
                <input
                  type="text"
                  value={createForm.press_model}
                  onChange={(e) => setCreateForm({ ...createForm, press_model: e.target.value })}
                  placeholder="Модель пресса"
                />
              </div>

              <div className="form-group">
                <label>Серийный номер пресса</label>
                <input
                  type="text"
                  value={createForm.press_serial}
                  onChange={(e) => setCreateForm({ ...createForm, press_serial: e.target.value })}
                  placeholder="Серийный номер"
                />
              </div>

              <div className="form-group">
                <label>Листов запланировано</label>
                <input
                  type="number"
                  value={createForm.sheets_planned}
                  onChange={(e) => setCreateForm({ ...createForm, sheets_planned: e.target.value })}
                  min="1"
                />
              </div>

              <div className="form-group">
                <label>Плановое количество заготовок (шт.)</label>
                <input
                  type="number"
                  value={createForm.quantity_planned}
                  onChange={(e) => setCreateForm({ ...createForm, quantity_planned: e.target.value })}
                  min="1"
                />
              </div>

              <div className="flex gap-2">
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

      {/* Complete Modal */}
      {showCompleteModal && (
        <div className="modal-overlay" onClick={() => setShowCompleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Завершить партию вырубки</h2>
            {activeSession && (
              <p style={{ color: '#2563eb', fontWeight: 600, marginBottom: '1.5rem' }}>
                Партия: {activeSession.session_number}
              </p>
            )}
            <form onSubmit={handleCompleteSubmit}>
              <div className="form-group">
                <label>Листов фактически</label>
                <input
                  type="number"
                  value={completeForm.sheets_actual}
                  onChange={(e) => setCompleteForm({ ...completeForm, sheets_actual: e.target.value })}
                  min="0"
                  required
                />
              </div>

              <div className="form-group">
                <label>Изделий фактически</label>
                <input
                  type="number"
                  value={completeForm.quantity_actual}
                  onChange={(e) => setCompleteForm({ ...completeForm, quantity_actual: e.target.value })}
                  min="0"
                  required
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '1rem', fontWeight: 600 }}>Брак по видам</label>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.875rem' }}>Недопресс</label>
                    <input
                      type="number"
                      value={completeForm.defect_underpress}
                      onChange={(e) => setCompleteForm({ ...completeForm, defect_underpress: e.target.value })}
                      min="0"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.875rem' }}>Заусенцы</label>
                    <input
                      type="number"
                      value={completeForm.defect_burrs}
                      onChange={(e) => setCompleteForm({ ...completeForm, defect_burrs: e.target.value })}
                      min="0"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.875rem' }}>Деформация</label>
                    <input
                      type="number"
                      value={completeForm.defect_deformation}
                      onChange={(e) => setCompleteForm({ ...completeForm, defect_deformation: e.target.value })}
                      min="0"
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Тара для хранения</label>
                <input
                  type="text"
                  value={completeForm.container}
                  onChange={(e) => setCompleteForm({ ...completeForm, container: e.target.value })}
                  placeholder="Номер тары или описание"
                />
              </div>

              <div className="form-group">
                <label>Ячейка стеллажа</label>
                <input
                  type="text"
                  value={completeForm.cell}
                  onChange={(e) => setCompleteForm({ ...completeForm, cell: e.target.value })}
                  placeholder="Номер ячейки"
                />
              </div>

              <div className="flex gap-2" style={{ marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-success flex-1">
                  Завершить
                </button>
                <button
                  type="button"
                  className="btn btn-secondary flex-1"
                  onClick={() => setShowCompleteModal(false)}
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

export default DieCutPage;
