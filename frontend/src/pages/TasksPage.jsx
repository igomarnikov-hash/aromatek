import React, { useEffect, useState, useContext } from 'react';
import { Plus, Play, CheckCircle, AlertCircle, Download, Layers } from 'lucide-react';
import api from '../api';
import { AuthContext } from '../context/AuthContext';

const API_BASE = '';

const STATUS_MAP = {
  planned: { label: 'Запланировано', color: '#94a3b8' },
  in_progress: { label: 'В процессе', color: '#f59e0b' },
  completed: { label: 'Завершено', color: '#16a34a' },
  quality_check: { label: 'Проверка качества', color: '#8b5cf6' }
};

const PRIORITY_MAP = {
  high: { label: 'Высокий', color: '#dc2626' },
  medium: { label: 'Средний', color: '#f59e0b' },
  low: { label: 'Низкий', color: '#16a34a' }
};

const TasksPage = () => {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [techCards, setTechCards] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    techCardId: '',
    assignedTo: '',
    quantityPlanned: '',
    priority: 'medium'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksData, tcData, usersData] = await Promise.all([
        api.get('/tasks'),
        api.get('/techcards'),
        api.get('/users')
      ]);
      setTasks(Array.isArray(tasksData) ? tasksData : tasksData.data || []);
      setTechCards(Array.isArray(tcData) ? tcData : tcData.data || []);
      setUsers(Array.isArray(usersData) ? usersData : usersData.data || []);
    } catch (err) {
      console.error('Ошибка при загрузке задач:', err);
      setError('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/tasks', {
        techCardId: Number(formData.techCardId),
        assignedTo: Number(formData.assignedTo),
        quantityPlanned: Number(formData.quantityPlanned),
        priority: formData.priority,
        userId: user?.id
      });
      setFormData({ techCardId: '', assignedTo: '', quantityPlanned: '', priority: 'medium' });
      setShowForm(false);
      loadData();
    } catch (err) {
      const msg = err.message || 'Ошибка при создании задачи';
      setError(msg);
    }
  };

  const handleStart = async (id) => {
    try {
      await api.post(`/tasks/${id}/start`, { userId: user?.id });
      loadData();
    } catch (err) {
      setError(err.message || 'Ошибка при запуске задачи');
    }
  };

  const handleComplete = async (id) => {
    const qty = prompt('Сколько единиц произведено?');
    if (!qty) return;
    try {
      await api.post(`/tasks/${id}/complete`, {
        quantityProduced: Number(qty),
        userId: user?.id
      });
      loadData();
    } catch (err) {
      setError(err.message || 'Ошибка при завершении задачи');
    }
  };

  const handleDefect = async (id) => {
    const qty = prompt('Количество бракованных единиц:');
    if (!qty) return;
    const reason = prompt('Причина дефекта:') || '';
    try {
      await api.post(`/tasks/${id}/defect`, {
        quantityDefect: Number(qty),
        reason: reason,
        userId: user?.id
      });
      loadData();
    } catch (err) {
      setError(err.message || 'Ошибка при регистрации дефекта');
    }
  };

  // ── Create batch from task ──
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchFromTask, setBatchFromTask] = useState(null);
  const [batchForm, setBatchForm] = useState({ productName: '', plannedQuantity: '', notes: '' });
  const [creatingBatch, setCreatingBatch] = useState(false);

  const openBatchModal = (task) => {
    setBatchFromTask(task);
    setBatchForm({
      productName: task.tech_card_name || '',
      plannedQuantity: task.quantity_planned || 1890,
      notes: ''
    });
    setShowBatchModal(true);
  };

  const handleCreateBatchFromTask = async (e) => {
    e.preventDefault();
    setCreatingBatch(true);
    try {
      await api.post('/batches', {
        productName: batchForm.productName,
        plannedQuantity: Number(batchForm.plannedQuantity),
        notes: batchForm.notes,
        userId: user?.id
      });
      setShowBatchModal(false);
      setBatchFromTask(null);
      setError('');
      // Show success notice
      alert(`Партия создана: ${batchForm.productName}`);
    } catch (err) {
      setError(err.message || 'Ошибка при создании партии');
    } finally {
      setCreatingBatch(false);
    }
  };

  const getProgress = (task) => {
    if (!task.quantity_planned || task.quantity_planned === 0) return 0;
    return Math.round((task.quantity_produced / task.quantity_planned) * 100);
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '100%' }}>
        <p>Загрузка задач...</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <div className="flex-between mb-4" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ margin: 0 }}>Производственные задачи</h1>
        <div className="page-header-actions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <a href={`${API_BASE}/api/export/tasks`} download className="btn btn-secondary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={16} />
            Excel
          </a>
          <a href={`${API_BASE}/api/export/report`} download className="btn btn-secondary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={16} />
            Отчёт
          </a>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={18} />
            Новая задача
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>&times;</button>
        </div>
      )}

      {/* Add Task Form */}
      {showForm && (
        <div className="card mb-4">
          <div className="card-header">
            <h4>Создать новую задачу</h4>
          </div>
          <form onSubmit={handleAddTask}>
            <div className="card-body">
              <div className="grid grid-2 gap-3">
                <div className="form-group">
                  <label>Технологическая карта</label>
                  <select
                    required
                    value={formData.techCardId}
                    onChange={(e) => setFormData({ ...formData, techCardId: e.target.value })}
                  >
                    <option value="">Выберите техкарту</option>
                    {techCards.map(tc => (
                      <option key={tc.id} value={tc.id}>{tc.name} (v{tc.version})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Назначить на</label>
                  <select
                    required
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                  >
                    <option value="">Выберите исполнителя</option>
                    {users.filter(u => u.role === 'operator' || u.role === 'production_manager').map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Количество (шт.)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.quantityPlanned}
                    onChange={(e) => setFormData({ ...formData, quantityPlanned: e.target.value })}
                    placeholder="Введите количество"
                  />
                </div>

                <div className="form-group">
                  <label>Приоритет</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="low">Низкий</option>
                    <option value="medium">Средний</option>
                    <option value="high">Высокий</option>
                  </select>
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

      {/* Tasks List */}
      <div className="grid grid-2 gap-3">
        {tasks.map((task) => {
          const statusInfo = STATUS_MAP[task.status] || { label: task.status, color: '#64748b' };
          const priorityInfo = PRIORITY_MAP[task.priority] || { label: task.priority, color: '#64748b' };
          const progress = getProgress(task);

          return (
            <div key={task.id} className="card">
              <div className="card-header">
                <div>
                  <h5 style={{ margin: '0 0 4px 0' }}>{task.tech_card_name}</h5>
                  <span
                    className="badge"
                    style={{ backgroundColor: priorityInfo.color + '30', color: priorityInfo.color }}
                  >
                    {priorityInfo.label}
                  </span>
                </div>
                <span
                  className="badge"
                  style={{ backgroundColor: statusInfo.color + '30', color: statusInfo.color }}
                >
                  {statusInfo.label}
                </span>
              </div>

              <div className="card-body">
                {/* Progress */}
                <div className="mb-3">
                  <div className="flex-between mb-2" style={{ fontSize: '0.875rem' }}>
                    <span>Произведено: {task.quantity_produced} / {task.quantity_planned} шт.</span>
                    <strong>{progress}%</strong>
                  </div>
                  <div className="progress">
                    <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>

                {task.quantity_defect > 0 && (
                  <div className="mb-3" style={{ fontSize: '0.875rem', color: '#dc2626' }}>
                    Брак: {task.quantity_defect} шт.
                    {task.defect_reason && ` (${task.defect_reason})`}
                  </div>
                )}

                <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '12px' }}>
                  <p style={{ margin: '4px 0' }}>
                    <strong>Исполнитель:</strong> {task.assigned_to_name}
                  </p>
                  {task.start_time && (
                    <p style={{ margin: '4px 0' }}>
                      <strong>Начато:</strong> {new Date(task.start_time).toLocaleString('ru')}
                    </p>
                  )}
                  {task.end_time && (
                    <p style={{ margin: '4px 0' }}>
                      <strong>Завершено:</strong> {new Date(task.end_time).toLocaleString('ru')}
                    </p>
                  )}
                </div>
              </div>

              <div className="card-footer">
                {task.status === 'planned' && (
                  <button className="btn btn-sm btn-primary" onClick={() => handleStart(task.id)}>
                    <Play size={16} /> Начать
                  </button>
                )}

                {(task.status === 'in_progress' || task.status === 'quality_check') && (
                  <>
                    <button className="btn btn-sm btn-success" onClick={() => handleComplete(task.id)}>
                      <CheckCircle size={16} /> Завершить
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDefect(task.id)}>
                      <AlertCircle size={16} /> Дефект
                    </button>
                  </>
                )}

                {task.status === 'completed' && (
                  <span className="badge badge-success">Завершено</span>
                )}

                {/* Create batch from task — available for all statuses */}
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => openBatchModal(task)}
                  style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Создать партию производства из этой задачи"
                >
                  <Layers size={14} /> Партию
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {tasks.length === 0 && (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '2rem' }}>
            <p className="text-muted">Нет задач</p>
          </div>
        </div>
      )}

      {/* Create batch from task modal */}
      {showBatchModal && batchFromTask && (
        <div className="modal-overlay" onClick={() => setShowBatchModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <h2 style={{ marginTop: 0 }}>Создать партию из задачи</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              На основе: <strong>{batchFromTask.tech_card_name}</strong>
            </p>
            <form onSubmit={handleCreateBatchFromTask}>
              <div className="form-group">
                <label>Название продукта *</label>
                <input
                  type="text"
                  required
                  value={batchForm.productName}
                  onChange={(e) => setBatchForm({ ...batchForm, productName: e.target.value })}
                  placeholder="Введите название"
                  style={{ marginTop: '0.5rem' }}
                />
              </div>
              <div className="form-group">
                <label>Плановое количество (шт.) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={batchForm.plannedQuantity}
                  onChange={(e) => setBatchForm({ ...batchForm, plannedQuantity: e.target.value })}
                  style={{ marginTop: '0.5rem' }}
                />
              </div>
              <div className="form-group">
                <label>Примечания</label>
                <textarea
                  value={batchForm.notes}
                  onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })}
                  placeholder="Дополнительная информация"
                  rows="2"
                  style={{ marginTop: '0.5rem' }}
                ></textarea>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" disabled={creatingBatch}>
                  <Layers size={16} />
                  {creatingBatch ? 'Создание...' : 'Создать партию'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowBatchModal(false)}>
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

export default TasksPage;
