import React, { useEffect, useState, useContext } from 'react';
import { Plus, PlayCircle, CheckCircle, AlertCircle, Flame } from 'lucide-react';
import api from '../api';
import { AuthContext } from '../context/AuthContext';

const PrintingPage = () => {
  const { user } = useContext(AuthContext);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSide2Modal, setShowSide2Modal] = useState(false);
  const [showDryingModal, setShowDryingModal] = useState(false);
  const [activeSession, setActiveSession] = useState(null);

  // Create modal state
  const [availableBatches, setAvailableBatches] = useState([]);
  const [availableScreens, setAvailableScreens] = useState([]);
  const [availableInks, setAvailableInks] = useState([]);
  const [createForm, setCreateForm] = useState({
    batch_id: '',
    screen_id: '',
    ink_id: '',
    sheets_planned: 42,
    items_per_sheet: 45
  });

  // Side 2 completion modal state
  const [side2Form, setSide2Form] = useState({
    sheets_actual: '',
    defect_smear: 0,
    defect_underflow: 0,
    defect_shift: 0,
    defect_screen: 0,
    defect_other: 0,
    notes: ''
  });

  // Drying completion modal state
  const [dryingForm, setDryingForm] = useState({
    load_time: '',
    unload_time: '',
    temperature: '',
    result: ''
  });

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await api.get('/printing');
      setSessions(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error('Ошибка при загрузке сеансов печати:', err);
      setError('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  const loadCreateFormOptions = async () => {
    try {
      const [batches, screens, inks] = await Promise.all([
        api.get('/batches'),
        api.get('/screens?status=ready'),
        api.get('/ink')
      ]);
      setAvailableBatches(Array.isArray(batches) ? batches : batches.data || []);
      setAvailableScreens(Array.isArray(screens) ? screens : screens.data || []);
      setAvailableInks(Array.isArray(inks) ? inks : inks.data || []);
    } catch (err) {
      console.error('Ошибка при загрузке опций:', err);
    }
  };

  const handleCreateClick = async () => {
    await loadCreateFormOptions();
    setCreateForm({
      batch_id: '',
      screen_id: '',
      ink_id: '',
      sheets_planned: 42,
      items_per_sheet: 45
    });
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.batch_id || !createForm.screen_id || !createForm.ink_id) {
      setError('Заполните все требуемые поля');
      return;
    }

    try {
      setError('');
      await api.post('/printing', {
        batch_id: createForm.batch_id,
        screen_id: createForm.screen_id,
        ink_id: createForm.ink_id,
        sheets_planned: Number(createForm.sheets_planned),
        items_per_sheet: Number(createForm.items_per_sheet),
        items_planned: Number(createForm.sheets_planned) * Number(createForm.items_per_sheet),
        operator_id: user?.id
      });
      setShowCreateModal(false);
      loadSessions();
    } catch (err) {
      setError(err.message || 'Ошибка при создании сеанса печати');
    }
  };

  const handleSide1Start = async (id) => {
    try {
      setError('');
      await api.post(`/printing/${id}/side1-start`, { operator_id: user?.id });
      loadSessions();
    } catch (err) {
      setError(err.message || 'Ошибка при запуске стороны 1');
    }
  };

  const handleSide1End = async (id) => {
    try {
      setError('');
      await api.post(`/printing/${id}/side1-end`, { operator_id: user?.id });
      loadSessions();
    } catch (err) {
      setError(err.message || 'Ошибка при завершении стороны 1');
    }
  };

  const handleSide2Start = async (id) => {
    try {
      setError('');
      await api.post(`/printing/${id}/side2-start`, { operator_id: user?.id });
      loadSessions();
    } catch (err) {
      setError(err.message || 'Ошибка при запуске стороны 2');
    }
  };

  const handleSide2EndClick = (session) => {
    setActiveSession(session);
    setSide2Form({
      sheets_actual: '',
      defect_smear: 0,
      defect_underflow: 0,
      defect_shift: 0,
      defect_screen: 0,
      defect_other: 0,
      notes: ''
    });
    setShowSide2Modal(true);
  };

  const handleSide2Submit = async (e) => {
    e.preventDefault();
    if (!activeSession) return;

    try {
      setError('');
      const totalDefects = Number(side2Form.defect_smear) +
                          Number(side2Form.defect_underflow) +
                          Number(side2Form.defect_shift) +
                          Number(side2Form.defect_screen) +
                          Number(side2Form.defect_other);

      await api.post(`/printing/${activeSession.id}/side2-end`, {
        sheets_actual: Number(side2Form.sheets_actual),
        defect_smear: Number(side2Form.defect_smear),
        defect_underflow: Number(side2Form.defect_underflow),
        defect_shift: Number(side2Form.defect_shift),
        defect_screen: Number(side2Form.defect_screen),
        defect_other: Number(side2Form.defect_other),
        defect_total: totalDefects,
        notes: side2Form.notes,
        operator_id: user?.id
      });
      setShowSide2Modal(false);
      loadSessions();
    } catch (err) {
      setError(err.message || 'Ошибка при завершении стороны 2');
    }
  };

  const handleDryingStartClick = (session) => {
    setActiveSession(session);
    setDryingForm({
      load_time: '',
      unload_time: '',
      temperature: '',
      result: ''
    });
    setShowDryingModal(true);
  };

  const handleDryingSubmit = async (e) => {
    e.preventDefault();
    if (!activeSession || !dryingForm.result) {
      setError('Заполните все поля');
      return;
    }

    try {
      setError('');
      await api.post(`/printing/${activeSession.id}/drying-complete`, {
        load_time: dryingForm.load_time,
        unload_time: dryingForm.unload_time,
        temperature: Number(dryingForm.temperature),
        drying_result: dryingForm.result,
        operator_id: user?.id
      });
      setShowDryingModal(false);
      loadSessions();
    } catch (err) {
      setError(err.message || 'Ошибка при завершении сушки');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'planned': return '#9ca3af';
      case 'side1': return '#3b82f6';
      case 'side2': return '#a855f7';
      case 'drying': return '#f97316';
      case 'completed': return '#10b981';
      case 'cancelled': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'planned': return 'Плановый';
      case 'side1': return 'Сторона 1';
      case 'side2': return 'Сторона 2';
      case 'drying': return 'Сушка';
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

  const activeSessions = sessions.filter(s =>
    s.status !== 'planned' && s.status !== 'completed' && s.status !== 'cancelled'
  );
  const stats = {
    total: sessions.length,
    planned: sessions.filter(s => s.status === 'planned').length,
    active: activeSessions.length,
    completed: sessions.filter(s => s.status === 'completed').length
  };

  return (
    <div style={{ width: '100%' }}>
      <div className="flex-between mb-4">
        <h1 style={{ marginTop: 0 }}>Печать</h1>
        <button className="btn btn-primary" onClick={handleCreateClick}>
          <Plus size={20} /> Создать сеанс печати
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
          <div className="text-muted" style={{ fontSize: '0.875rem' }}>Всего сеансов</div>
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
          <div className="text-muted" style={{ fontSize: '0.875rem' }}>В процессе</div>
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
            <h4>Активные сеансы</h4>
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
                  <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
                    Партия: {session.batch_number} | Сетка: {session.serial_number} | Краска: {session.ink_batch_number}
                  </p>
                  <p className="text-muted" style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
                    Листов: {session.sheets_planned} | Брак: {session.defect_total || 0}
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
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#64748b' }}>
                  <strong>Сетка:</strong> {session.serial_number}
                </p>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#64748b' }}>
                  <strong>Краска:</strong> {session.ink_batch_number}
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
                    <span className="text-muted">Изделий план:</span>
                    <div style={{ fontWeight: 600, color: '#2563eb' }}>{session.items_planned}</div>
                  </div>
                  <div>
                    <span className="text-muted">Изделий факт:</span>
                    <div style={{ fontWeight: 600, color: '#2563eb' }}>{session.items_actual || '—'}</div>
                  </div>
                </div>

                {session.defect_total > 0 && (
                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: '#fee2e2',
                    borderRadius: '0.375rem',
                    marginBottom: '1rem',
                    fontSize: '0.875rem',
                    color: '#dc2626',
                    fontWeight: 600
                  }}>
                    Брак: {session.defect_total} шт.
                  </div>
                )}

                {session.side1_duration && (
                  <p className="text-muted" style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem' }}>
                    Время стороны 1: {Math.floor(session.side1_duration / 60)} мин
                  </p>
                )}
                {session.side2_duration && (
                  <p className="text-muted" style={{ margin: '0 0 1rem 0', fontSize: '0.75rem' }}>
                    Время стороны 2: {Math.floor(session.side2_duration / 60)} мин
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {session.status === 'planned' && (
                    <button
                      className="btn btn-primary flex-1"
                      onClick={() => handleSide1Start(session.id)}
                    >
                      <PlayCircle size={16} /> Начать сторону 1
                    </button>
                  )}

                  {session.status === 'side1' && (
                    <>
                      <button
                        className="btn btn-success flex-1"
                        onClick={() => handleSide1End(session.id)}
                      >
                        <CheckCircle size={16} /> Завершить сторону 1
                      </button>
                    </>
                  )}

                  {(session.status === 'side1' || session.status === 'side2') && session.status === 'side2' && (
                    <>
                      <button
                        className="btn btn-danger flex-1"
                        onClick={() => handleSide2EndClick(session)}
                      >
                        <CheckCircle size={16} /> Завершить сторону 2
                      </button>
                    </>
                  )}

                  {session.status === 'side2' && (
                    <button
                      className="btn btn-danger flex-1"
                      onClick={() => handleSide2EndClick(session)}
                    >
                      <CheckCircle size={16} /> Завершить сторону 2
                    </button>
                  )}

                  {session.status === 'drying' && (
                    <button
                      className="btn btn-success flex-1"
                      onClick={() => handleDryingStartClick(session)}
                    >
                      <Flame size={16} /> Завершить сушку
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
            <PlayCircle size={48} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
            <p className="text-muted">Нет сеансов печати</p>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Создать сеанс печати</h2>
            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label>Партия</label>
                <select
                  value={createForm.batch_id}
                  onChange={(e) => setCreateForm({ ...createForm, batch_id: e.target.value })}
                  required
                >
                  <option value="">-- Выберите партию --</option>
                  {availableBatches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.batch_number}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Сетка</label>
                <select
                  value={createForm.screen_id}
                  onChange={(e) => setCreateForm({ ...createForm, screen_id: e.target.value })}
                  required
                >
                  <option value="">-- Выберите сетку --</option>
                  {availableScreens.map((screen) => (
                    <option key={screen.id} value={screen.id}>
                      {screen.serial_number}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Краска</label>
                <select
                  value={createForm.ink_id}
                  onChange={(e) => setCreateForm({ ...createForm, ink_id: e.target.value })}
                  required
                >
                  <option value="">-- Выберите краску --</option>
                  {availableInks.map((ink) => (
                    <option key={ink.id} value={ink.id}>
                      {ink.ink_batch_number} ({ink.product_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Листов запланировано</label>
                <input
                  type="number"
                  value={createForm.sheets_planned}
                  onChange={(e) => setCreateForm({ ...createForm, sheets_planned: e.target.value })}
                  min="1"
                  required
                />
              </div>

              <div className="form-group">
                <label>Изделий на листе</label>
                <input
                  type="number"
                  value={createForm.items_per_sheet}
                  onChange={(e) => setCreateForm({ ...createForm, items_per_sheet: e.target.value })}
                  min="1"
                  required
                />
              </div>

              <div style={{
                padding: '1rem',
                backgroundColor: '#e0f2fe',
                borderRadius: '0.375rem',
                marginBottom: '1.5rem',
                fontSize: '0.875rem'
              }}>
                <strong>Итого изделий:</strong> {(Number(createForm.sheets_planned) * Number(createForm.items_per_sheet)) || 0}
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

      {/* Side 2 Completion Modal */}
      {showSide2Modal && (
        <div className="modal-overlay" onClick={() => setShowSide2Modal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Завершить сторону 2</h2>
            {activeSession && (
              <p style={{ color: '#2563eb', fontWeight: 600, marginBottom: '1.5rem' }}>
                Сеанс: {activeSession.session_number}
              </p>
            )}
            <form onSubmit={handleSide2Submit}>
              <div className="form-group">
                <label>Листов фактически</label>
                <input
                  type="number"
                  value={side2Form.sheets_actual}
                  onChange={(e) => setSide2Form({ ...side2Form, sheets_actual: e.target.value })}
                  min="0"
                  required
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '1rem', fontWeight: 600 }}>Брак по видам</label>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.875rem' }}>Смаз</label>
                    <input
                      type="number"
                      value={side2Form.defect_smear}
                      onChange={(e) => setSide2Form({ ...side2Form, defect_smear: e.target.value })}
                      min="0"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.875rem' }}>Недолив</label>
                    <input
                      type="number"
                      value={side2Form.defect_underflow}
                      onChange={(e) => setSide2Form({ ...side2Form, defect_underflow: e.target.value })}
                      min="0"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.875rem' }}>Смещение</label>
                    <input
                      type="number"
                      value={side2Form.defect_shift}
                      onChange={(e) => setSide2Form({ ...side2Form, defect_shift: e.target.value })}
                      min="0"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.875rem' }}>Дефект сетки</label>
                    <input
                      type="number"
                      value={side2Form.defect_screen}
                      onChange={(e) => setSide2Form({ ...side2Form, defect_screen: e.target.value })}
                      min="0"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.875rem' }}>Прочее</label>
                    <input
                      type="number"
                      value={side2Form.defect_other}
                      onChange={(e) => setSide2Form({ ...side2Form, defect_other: e.target.value })}
                      min="0"
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Примечания по браку</label>
                <textarea
                  value={side2Form.notes}
                  onChange={(e) => setSide2Form({ ...side2Form, notes: e.target.value })}
                  rows={3}
                  placeholder="Описание дефектов"
                />
              </div>

              <div className="flex gap-2" style={{ marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-success flex-1">
                  Завершить
                </button>
                <button
                  type="button"
                  className="btn btn-secondary flex-1"
                  onClick={() => setShowSide2Modal(false)}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drying Completion Modal */}
      {showDryingModal && (
        <div className="modal-overlay" onClick={() => setShowDryingModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Завершить сушку</h2>
            {activeSession && (
              <p style={{ color: '#2563eb', fontWeight: 600, marginBottom: '1.5rem' }}>
                Сеанс: {activeSession.session_number}
              </p>
            )}
            <form onSubmit={handleDryingSubmit}>
              <div className="form-group">
                <label>Время загрузки</label>
                <input
                  type="datetime-local"
                  value={dryingForm.load_time}
                  onChange={(e) => setDryingForm({ ...dryingForm, load_time: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Время выгрузки</label>
                <input
                  type="datetime-local"
                  value={dryingForm.unload_time}
                  onChange={(e) => setDryingForm({ ...dryingForm, unload_time: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Температура (°C)</label>
                <input
                  type="number"
                  value={dryingForm.temperature}
                  onChange={(e) => setDryingForm({ ...dryingForm, temperature: e.target.value })}
                  min="0"
                  required
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '1rem', fontWeight: 600 }}>Результат сушки</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      value="ok"
                      checked={dryingForm.result === 'ok'}
                      onChange={(e) => setDryingForm({ ...dryingForm, result: e.target.value })}
                    />
                    <span>Успешно</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      value="defect"
                      checked={dryingForm.result === 'defect'}
                      onChange={(e) => setDryingForm({ ...dryingForm, result: e.target.value })}
                    />
                    <span>Дефект</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2">
                <button type="submit" className="btn btn-success flex-1">
                  Завершить
                </button>
                <button
                  type="button"
                  className="btn btn-secondary flex-1"
                  onClick={() => setShowDryingModal(false)}
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

export default PrintingPage;
