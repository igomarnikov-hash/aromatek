import React, { useEffect, useState, useContext } from 'react';
import { Play, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import api from '../api';
import { AuthContext } from '../context/AuthContext';

const WorkshopPage = () => {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [currentTask, setCurrentTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    if (!currentTask || currentTask.status !== 'in_progress') return;

    const interval = setInterval(() => {
      setTimer(t => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentTask]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await api.get('/tasks');
      const taskList = Array.isArray(data) ? data : data.data || [];
      setTasks(taskList);

      // Find active task
      const active = taskList.find(t => t.status === 'in_progress');
      if (active) {
        setCurrentTask(active);
        // Calculate elapsed time from start
        if (active.start_time) {
          const elapsed = Math.floor((Date.now() - new Date(active.start_time).getTime()) / 1000);
          setTimer(Math.max(0, elapsed));
        }
      }
    } catch (err) {
      console.error('Ошибка при загрузке задач:', err);
      setError('Ошибка при загрузке задач');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (id) => {
    try {
      setError('');
      await api.post(`/tasks/${id}/start`, { userId: user?.id });
      const task = tasks.find(t => t.id === id);
      if (task) {
        setCurrentTask({ ...task, status: 'in_progress' });
        setTimer(0);
      }
      loadTasks();
    } catch (err) {
      setError(err.message || 'Ошибка при запуске задачи');
    }
  };

  const handleComplete = async () => {
    if (!currentTask) return;
    const qty = prompt(`Сколько единиц произведено? (план: ${currentTask.quantity_planned})`);
    if (!qty) return;
    try {
      setError('');
      await api.post(`/tasks/${currentTask.id}/complete`, {
        quantityProduced: Number(qty),
        userId: user?.id
      });
      setCurrentTask(null);
      setTimer(0);
      loadTasks();
    } catch (err) {
      setError(err.message || 'Ошибка при завершении задачи');
    }
  };

  const handleDefect = async () => {
    if (!currentTask) return;
    const qty = prompt('Количество бракованных единиц:');
    if (!qty) return;
    const reason = prompt('Причина дефекта:') || '';
    try {
      setError('');
      await api.post(`/tasks/${currentTask.id}/defect`, {
        quantityDefect: Number(qty),
        reason: reason,
        userId: user?.id
      });
      loadTasks();
    } catch (err) {
      setError(err.message || 'Ошибка при регистрации дефекта');
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return [
      hours > 0 ? `${hours}ч` : '',
      `${minutes}м`,
      `${secs}с`
    ].filter(Boolean).join(' ');
  };

  const getProgress = (task) => {
    if (!task.quantity_planned || task.quantity_planned === 0) return 0;
    return Math.round((task.quantity_produced / task.quantity_planned) * 100);
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '100%' }}>
        <p>Загрузка...</p>
      </div>
    );
  }

  const plannedTasks = tasks.filter(t => t.status === 'planned');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div style={{ width: '100%' }}>
      <h1 style={{ marginTop: 0 }}>Оперативный зал цеха</h1>

      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>&times;</button>
        </div>
      )}

      <div className="grid grid-2 gap-3 mb-4">
        {/* Current Task Panel */}
        <div className="card">
          <div className="card-header">
            <h4>Текущая задача</h4>
          </div>

          {currentTask ? (
            <div className="card-body">
              <h3 style={{ margin: '0 0 8px 0', color: '#2563eb' }}>
                {currentTask.tech_card_name}
              </h3>

              <p className="text-muted" style={{ marginBottom: '0.5rem' }}>
                Исполнитель: {currentTask.assigned_to_name}
              </p>

              {/* Progress */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div className="flex-between mb-2">
                  <span>Произведено: {currentTask.quantity_produced} / {currentTask.quantity_planned} шт.</span>
                  <strong>{getProgress(currentTask)}%</strong>
                </div>
                <div className="progress">
                  <div className="progress-bar" style={{ width: `${getProgress(currentTask)}%` }}></div>
                </div>
              </div>

              {currentTask.quantity_defect > 0 && (
                <div className="mb-3" style={{ color: '#dc2626', fontSize: '0.875rem' }}>
                  Брак: {currentTask.quantity_defect} шт.
                  {currentTask.defect_reason && ` — ${currentTask.defect_reason}`}
                </div>
              )}

              {/* Timer */}
              <div style={{
                backgroundColor: '#e2e8f0',
                padding: '1rem',
                borderRadius: '0.5rem',
                marginBottom: '1.5rem',
                textAlign: 'center'
              }}>
                <div className="flex-center gap-2" style={{ marginBottom: '8px' }}>
                  <Clock size={24} style={{ color: '#f59e0b' }} />
                  <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#f59e0b' }}>
                    {formatTime(timer)}
                  </div>
                </div>
                <p className="text-muted" style={{ margin: 0 }}>Время выполнения</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button className="btn btn-success flex-1" onClick={handleComplete} title="Завершить задачу">
                  <CheckCircle size={18} /> Завершить
                </button>
                <button className="btn btn-danger flex-1" onClick={handleDefect} title="Отметить дефект">
                  <AlertCircle size={18} /> Дефект
                </button>
              </div>
            </div>
          ) : (
            <div className="card-body" style={{ textAlign: 'center', padding: '2rem' }}>
              <p className="text-muted">Нет активных задач</p>
              <p className="text-muted" style={{ fontSize: '0.875rem' }}>Выберите задачу из списка ожидающих</p>
            </div>
          )}
        </div>

        {/* Stats Panel */}
        <div className="card">
          <div className="card-header">
            <h4>Сводка за сегодня</h4>
          </div>
          <div className="card-body">
            <div className="grid grid-2 gap-3">
              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#2563eb' }}>
                  {tasks.filter(t => t.status === 'completed').length}
                </div>
                <div className="text-muted" style={{ fontSize: '0.875rem' }}>Завершено</div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>
                  {tasks.filter(t => t.status === 'in_progress').length}
                </div>
                <div className="text-muted" style={{ fontSize: '0.875rem' }}>В работе</div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#64748b' }}>
                  {plannedTasks.length}
                </div>
                <div className="text-muted" style={{ fontSize: '0.875rem' }}>Ожидают</div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#dc2626' }}>
                  {tasks.reduce((sum, t) => sum + (t.quantity_defect || 0), 0)}
                </div>
                <div className="text-muted" style={{ fontSize: '0.875rem' }}>Брак (шт.)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Tasks */}
      <div className="card mb-4">
        <div className="card-header">
          <h4>Ожидающие задачи ({plannedTasks.length})</h4>
        </div>

        {plannedTasks.length > 0 ? (
          <div className="card-body">
            <div className="grid grid-2 gap-3">
              {plannedTasks.map((task) => (
                <div key={task.id} style={{
                  padding: '1rem',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <h5 style={{ margin: '0 0 4px 0' }}>{task.tech_card_name}</h5>
                    <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
                      {task.quantity_planned} шт. | {task.assigned_to_name}
                    </p>
                  </div>
                  <button className="btn btn-primary" onClick={() => handleStart(task.id)}>
                    <Play size={18} /> Начать
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card-body" style={{ textAlign: 'center', padding: '2rem' }}>
            <p className="text-muted">Нет ожидающих задач</p>
          </div>
        )}
      </div>

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h4>Выполненные задачи ({completedTasks.length})</h4>
          </div>
          <div className="card-body">
            <table style={{ fontSize: '0.875rem' }}>
              <thead>
                <tr>
                  <th>Задача</th>
                  <th>Произведено</th>
                  <th>Брак</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {completedTasks.map((task) => (
                  <tr key={task.id}>
                    <td>{task.tech_card_name}</td>
                    <td>{task.quantity_produced} / {task.quantity_planned}</td>
                    <td>{task.quantity_defect > 0 ? task.quantity_defect : '—'}</td>
                    <td><span className="badge badge-success">Завершено</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkshopPage;
