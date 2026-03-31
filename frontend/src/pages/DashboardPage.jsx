import React, { useEffect, useState } from 'react';
import { AlertCircle, TrendingUp, Boxes, Zap, Activity, ArrowUpRight } from 'lucide-react';
import api from '../api';

const DashboardPage = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await api.get('/dashboard');
      setDashboard(response.data || response);
    } catch (err) {
      setError('Не удалось загрузить данные');
      setDashboard({
        todayPlanProgress: { quantityPlanned: 500, quantityProduced: 375, completionPercentage: 75, completedTasks: 3, totalTasks: 6 },
        activeTasksCount: 3, defectRate: '3%', criticalMaterials: [], recentEvents: []
      });
    } finally { setLoading(false); }
  };

  if (loading && !dashboard) {
    return (
      <div className="flex-center" style={{ height: '100%' }}>
        <div style={{
          width: '32px', height: '32px', border: '2px solid rgba(59,130,246,0.2)',
          borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite'
        }} />
      </div>
    );
  }

  const progress = dashboard?.todayPlanProgress || {};
  const defectNum = parseInt(dashboard?.defectRate) || 0;

  const stats = [
    { label: 'Произведено', value: progress.quantityProduced || 0, unit: `из ${progress.quantityPlanned || 0} ед.`, icon: TrendingUp, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
    { label: 'План выполнен', value: `${progress.completionPercentage || 0}%`, unit: `${progress.completedTasks || 0}/${progress.totalTasks || 0} задач`, icon: Zap, color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
    { label: 'Активных задач', value: dashboard?.activeTasksCount || 0, unit: 'в работе', icon: Boxes, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
    { label: 'Брак', value: dashboard?.defectRate || '0%', unit: 'от произведённого', icon: AlertCircle, color: defectNum > 5 ? '#ef4444' : '#22c55e', bg: defectNum > 5 ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)' }
  ];

  const criticalMaterials = dashboard?.criticalMaterials || [];
  const recentEvents = dashboard?.recentEvents || [];

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const diffMin = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diffMin < 1) return 'сейчас';
    if (diffMin < 60) return `${diffMin} мин`;
    const h = Math.floor(diffMin / 60);
    if (h < 24) return `${h} ч`;
    return `${Math.floor(h / 24)} дн`;
  };

  const pct = progress.completionPercentage || 0;

  return (
    <div style={{ width: '100%' }}>
      <div className="flex-between mb-4">
        <h1 style={{ margin: 0 }}>Дашборд</h1>
        <span className="text-muted" style={{ fontSize: '0.8125rem' }}>
          {new Date().toLocaleDateString('ru', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </div>

      {error && (
        <div className="alert alert-warning">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="card" style={{ padding: '1.25rem' }}>
              <div className="flex-between" style={{ marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {stat.label}
                </span>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Icon size={16} color={stat.color} />
                </div>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: stat.color, lineHeight: 1 }}>
                {stat.value}
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#64748b' }}>{stat.unit}</p>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
          <h4 style={{ margin: 0, fontSize: '0.875rem' }}>Прогресс дневного плана</h4>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: pct >= 75 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444' }}>
            {pct}%
          </span>
        </div>
        <div className="progress" style={{ height: '8px', marginBottom: '0.5rem' }}>
          <div
            className={`progress-bar ${pct >= 75 ? 'success' : pct >= 50 ? 'warning' : 'danger'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex-between" style={{ fontSize: '0.75rem', color: '#64748b' }}>
          <span>Произведено: {progress.quantityProduced || 0} ед.</span>
          <span>План: {progress.quantityPlanned || 0} ед.</span>
        </div>
      </div>

      <div className="grid grid-2">
        {/* Critical materials */}
        <div className="card">
          <div className="card-header">
            <h4 style={{ margin: 0, fontSize: '0.875rem' }}>Критические остатки</h4>
            {criticalMaterials.length > 0 && (
              <span className="badge badge-danger">{criticalMaterials.length}</span>
            )}
          </div>
          <div className="card-body">
            {criticalMaterials.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                <Activity size={28} color="#22c55e" style={{ marginBottom: '8px', opacity: 0.7 }} />
                <p style={{ margin: 0, color: '#22c55e', fontSize: '0.8125rem' }}>Все материалы в норме</p>
              </div>
            ) : (
              <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Материал</th>
                    <th>Остаток</th>
                    <th>Мин.</th>
                  </tr>
                </thead>
                <tbody>
                  {criticalMaterials.map(m => (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 500 }}>{m.name}</td>
                      <td style={{ color: '#ef4444', fontWeight: 600 }}>{m.quantity} {m.unit}</td>
                      <td style={{ color: '#64748b' }}>{m.min_quantity} {m.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </div>

        {/* Events */}
        <div className="card">
          <div className="card-header">
            <h4 style={{ margin: 0, fontSize: '0.875rem' }}>Последние события</h4>
          </div>
          <div className="card-body" style={{ maxHeight: '280px', overflowY: 'auto' }}>
            {recentEvents.length === 0 ? (
              <p className="text-muted" style={{ textAlign: 'center', padding: '1.5rem', fontSize: '0.8125rem' }}>Нет событий</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {recentEvents.slice(0, 8).map(event => (
                  <div key={event.id} style={{
                    padding: '0.5rem 0.625rem',
                    borderRadius: '6px',
                    transition: 'background 0.15s',
                    cursor: 'default'
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div className="flex-between">
                      <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#0f172a' }}>{event.action}</span>
                      <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>{formatTime(event.created_at)}</span>
                    </div>
                    <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                      {event.user_name} — {event.details}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
