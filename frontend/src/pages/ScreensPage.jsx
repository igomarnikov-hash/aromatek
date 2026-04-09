import React, { useEffect, useState, useContext } from 'react';
import { Plus, AlertCircle, AlertTriangle } from 'lucide-react';
import api from '../api';
import { AuthContext } from '../context/AuthContext';

const SCREEN_STATUS_MAP = {
  ready: { label: 'Готова к работе', color: '#10b981' },
  in_use: { label: 'В работе', color: '#3b82f6' },
  washing: { label: 'На промывке', color: '#f97316' },
  written_off: { label: 'Списана', color: '#dc2626' }
};

const EXPOSURE_RESULT_MAP = {
  pending: { label: 'Ожидание', color: '#94a3b8' },
  success: { label: 'Успешно', color: '#10b981' },
  defect: { label: 'Брак', color: '#dc2626' }
};

const ScreensPage = () => {
  const { user } = useContext(AuthContext);
  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [showExposureModal, setShowExposureModal] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(null);
  const [exposureFormData, setExposureFormData] = useState({
    result: 'success',
    notes: ''
  });
  const [statusFormData, setStatusFormData] = useState({
    status: 'ready'
  });
  const [formData, setFormData] = useState({
    serialNumber: '',
    emulsionType: '',
    emulsionAppliedDate: '',
    exposureTime: '',
    printCyclesLimit: 500
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.get('/screens');
      setScreens(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error('Ошибка при загрузке сеток:', err);
      setError('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  const handleAddScreen = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/screens', {
        serialNumber: formData.serialNumber,
        emulsionType: formData.emulsionType,
        emulsionAppliedDate: formData.emulsionAppliedDate,
        exposureTime: Number(formData.exposureTime),
        printCyclesLimit: Number(formData.printCyclesLimit),
        userId: user?.id
      });
      setFormData({
        serialNumber: '',
        emulsionType: '',
        emulsionAppliedDate: '',
        exposureTime: '',
        printCyclesLimit: 500
      });
      setShowForm(false);
      loadData();
    } catch (err) {
      const msg = err.message || 'Ошибка при добавлении сетки';
      setError(msg);
    }
  };

  const handleRecordExposure = async (screenId) => {
    setError('');
    try {
      await api.post(`/screens/${screenId}/exposure`, {
        result: exposureFormData.result,
        notes: exposureFormData.notes,
        userId: user?.id
      });
      setExposureFormData({ result: 'success', notes: '' });
      setShowExposureModal(null);
      loadData();
    } catch (err) {
      const msg = err.message || 'Ошибка при записи результата засветки';
      setError(msg);
    }
  };

  const handleChangeStatus = async (screenId) => {
    setError('');
    try {
      await api.put(`/screens/${screenId}`, {
        status: statusFormData.status,
        userId: user?.id
      });
      setStatusFormData({ status: 'ready' });
      setShowStatusModal(null);
      loadData();
    } catch (err) {
      const msg = err.message || 'Ошибка при изменении статуса';
      setError(msg);
    }
  };

  const getStats = () => {
    const total = screens.length;
    const ready = screens.filter(s => s.status === 'ready').length;
    const inUse = screens.filter(s => s.status === 'in_use').length;
    const washing = screens.filter(s => s.status === 'washing').length;
    const writtenOff = screens.filter(s => s.status === 'written_off').length;
    return { total, ready, inUse, washing, writtenOff };
  };

  const filteredScreens = statusFilter
    ? screens.filter(s => s.status === statusFilter)
    : screens;

  const stats = getStats();

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '100%' }}>
        <p>Загрузка сеток...</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <div className="flex-between mb-4" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ margin: 0 }}>Трафаретные сетки</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={18} />
          Добавить сетку
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
      <div className="grid grid-5 gap-3 mb-4">
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#3b82f6' }}>{stats.total}</div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>Всего</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#10b981' }}>{stats.ready}</div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>Готовы</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#3b82f6' }}>{stats.inUse}</div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>В работе</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#f97316' }}>{stats.washing}</div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>На промывке</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#dc2626' }}>{stats.writtenOff}</div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>Списаны</div>
        </div>
      </div>

      {/* Add Screen Form */}
      {showForm && (
        <div className="card mb-4">
          <div className="card-header">
            <h4>Добавить новую сетку</h4>
          </div>
          <form onSubmit={handleAddScreen}>
            <div className="card-body">
              <div className="grid grid-2 gap-3">
                <div className="form-group">
                  <label>Серийный номер *</label>
                  <input
                    type="text"
                    required
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    placeholder="Введите серийный номер"
                  />
                </div>

                <div className="form-group">
                  <label>Тип эмульсии</label>
                  <input
                    type="text"
                    value={formData.emulsionType}
                    onChange={(e) => setFormData({ ...formData, emulsionType: e.target.value })}
                    placeholder="Например: Азолакрил"
                  />
                </div>

                <div className="form-group">
                  <label>Дата нанесения эмульсии</label>
                  <input
                    type="datetime-local"
                    value={formData.emulsionAppliedDate}
                    onChange={(e) => setFormData({ ...formData, emulsionAppliedDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Время экспонирования (сек)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.exposureTime}
                    onChange={(e) => setFormData({ ...formData, exposureTime: e.target.value })}
                    placeholder="Введите время в секундах"
                  />
                </div>

                <div className="form-group">
                  <label>Лимит циклов печати</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.printCyclesLimit}
                    onChange={(e) => setFormData({ ...formData, printCyclesLimit: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="card-footer">
              <button type="submit" className="btn btn-success">Добавить</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter */}
      <div className="card mb-4">
        <div className="card-body" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: '1', minWidth: '200px', margin: 0 }}>
            <label>Фильтр по статусу</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ marginTop: '0.5rem' }}
            >
              <option value="">Все статусы</option>
              {Object.entries(SCREEN_STATUS_MAP).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Screens Grid */}
      <div className="grid grid-3 gap-3">
        {filteredScreens.map((screen) => {
          const statusInfo = SCREEN_STATUS_MAP[screen.status] || { label: screen.status, color: '#64748b' };
          const exposureInfo = EXPOSURE_RESULT_MAP[screen.exposure_result] || { label: screen.exposure_result, color: '#64748b' };
          const cyclesUsed = screen.print_cycles_used || 0;
          const cyclesLimit = screen.print_cycles_limit || 500;
          const cyclesPercent = (cyclesUsed / cyclesLimit) * 100;
          const needsWarning = cyclesPercent >= 90;

          return (
            <div key={screen.id} className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h5 style={{ margin: '0 0 4px 0', fontWeight: 'bold', fontSize: '1.125rem' }}>
                    {screen.serial_number}
                  </h5>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>
                    {screen.emulsion_type || 'Тип не указан'}
                  </p>
                </div>
                {needsWarning && (
                  <AlertTriangle size={20} style={{ color: '#dc2626' }} />
                )}
              </div>

              <div className="card-body">
                {/* Status Badge */}
                <div style={{ marginBottom: '1rem' }}>
                  <span
                    className="badge"
                    style={{
                      backgroundColor: statusInfo.color + '30',
                      color: statusInfo.color,
                      fontSize: '0.875rem',
                      padding: '0.4rem 0.8rem'
                    }}
                  >
                    {statusInfo.label}
                  </span>
                </div>

                {/* Resource Progress */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                    <strong>Ресурс:</strong> {cyclesUsed} / {cyclesLimit} циклов
                  </div>
                  <div className="progress" style={{ height: '8px' }}>
                    <div
                      className="progress-bar"
                      style={{
                        width: `${Math.min(100, cyclesPercent)}%`,
                        backgroundColor: needsWarning ? '#dc2626' : '#3b82f6'
                      }}
                    ></div>
                  </div>
                  {needsWarning && (
                    <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.5rem', fontWeight: 'bold' }}>
                      ⚠️ Требуется промывка или замена
                    </div>
                  )}
                </div>

                {/* Emulsion Date */}
                {screen.emulsion_applied_date && (
                  <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
                    <strong>Эмульсия:</strong> {new Date(screen.emulsion_applied_date).toLocaleDateString('ru')}
                  </div>
                )}

                {/* Exposure Result */}
                <div style={{ marginBottom: '1rem' }}>
                  <span
                    className="badge"
                    style={{
                      backgroundColor: exposureInfo.color + '30',
                      color: exposureInfo.color,
                      fontSize: '0.8rem',
                      padding: '0.3rem 0.6rem'
                    }}
                  >
                    {exposureInfo.label}
                  </span>
                </div>
              </div>

              <div className="card-footer" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {screen.exposure_result === 'pending' && (
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => setShowExposureModal(screen.id)}
                  >
                    Записать засветку
                  </button>
                )}
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => {
                    setStatusFormData({ status: screen.status });
                    setShowStatusModal(screen.id);
                  }}
                >
                  Изменить статус
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredScreens.length === 0 && (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '2rem' }}>
            <p className="text-muted">Сетки не найдены</p>
          </div>
        </div>
      )}

      {/* Exposure Result Modal */}
      {showExposureModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ width: '90%', maxWidth: '500px' }}>
            <div className="card-header">
              <h4>Записать результат засветки</h4>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label style={{ marginBottom: '1rem', display: 'block' }}>
                  <strong>Сетка:</strong> {screens.find(s => s.id === showExposureModal)?.serial_number}
                </label>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.75rem' }}>Результат:</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      value="success"
                      checked={exposureFormData.result === 'success'}
                      onChange={(e) => setExposureFormData({ ...exposureFormData, result: e.target.value })}
                    />
                    <span>✓ Успешно</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      value="defect"
                      checked={exposureFormData.result === 'defect'}
                      onChange={(e) => setExposureFormData({ ...exposureFormData, result: e.target.value })}
                    />
                    <span>✗ Брак</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Примечания</label>
                <textarea
                  value={exposureFormData.notes}
                  onChange={(e) => setExposureFormData({ ...exposureFormData, notes: e.target.value })}
                  placeholder="Дополнительные заметки"
                  rows="3"
                ></textarea>
              </div>
            </div>

            <div className="card-footer">
              <button
                className="btn btn-success"
                onClick={() => handleRecordExposure(showExposureModal)}
              >
                Сохранить
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowExposureModal(null);
                  setExposureFormData({ result: 'success', notes: '' });
                }}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ width: '90%', maxWidth: '500px' }}>
            <div className="card-header">
              <h4>Изменить статус сетки</h4>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label style={{ marginBottom: '1rem', display: 'block' }}>
                  <strong>Сетка:</strong> {screens.find(s => s.id === showStatusModal)?.serial_number}
                </label>
              </div>

              <div className="form-group">
                <label>Новый статус</label>
                <select
                  value={statusFormData.status}
                  onChange={(e) => setStatusFormData({ status: e.target.value })}
                >
                  {Object.entries(SCREEN_STATUS_MAP).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="card-footer">
              <button
                className="btn btn-success"
                onClick={() => handleChangeStatus(showStatusModal)}
              >
                Изменить
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowStatusModal(null);
                  setStatusFormData({ status: 'ready' });
                }}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScreensPage;
