import React, { useEffect, useState, useContext } from 'react';
import { Plus, Play, CheckCircle, AlertCircle, Download } from 'lucide-react';
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
    </div>
  );
};

export default TasksPage;
