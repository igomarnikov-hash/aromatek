import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, CheckCircle, AlertCircle, Package, Download } from 'lucide-react';
import api from '../api';

const API_BASE = '';

const PERIOD_OPTIONS = [
  { label: '7 дней', value: 7 },
  { label: '14 дней', value: 14 },
  { label: '30 дней', value: 30 }
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.98)',
      border: '1px solid rgba(15,23,42,0.1)',
      borderRadius: '8px',
      padding: '10px 14px',
      fontSize: '0.8125rem',
      boxShadow: '0 4px 12px rgba(15,23,42,0.1)'
    }}>
      <p style={{ margin: '0 0 6px', color: '#64748b', fontWeight: 600 }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ margin: '2px 0', color: entry.color }}>
          {entry.name}: <strong>{entry.value}</strong>
        </p>
      ))}
    </div>
  );
};

const AnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(7);
  const [error, setError] = useState('');

  useEffect(() => { loadAnalytics(); }, [period]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/analytics?days=${period}`);
      setData(res.data || res);
    } catch (err) {
      setError('Не удалось загрузить данные аналитики');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '300px' }}>
        <div style={{
          width: '32px', height: '32px', border: '2px solid rgba(59,130,246,0.2)',
          borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite'
        }} />
      </div>
    );
  }

  const kpi = data?.kpi || {};
  const productionByDay = data?.productionByDay || [];
  const taskStatusData = data?.taskStatusData || [];
  const topWorkers = data?.topWorkers || [];
  const topTechCards = data?.topTechCards || [];
  const defectByDay = data?.defectByDay || [];

  const kpiCards = [
    {
      label: 'Всего задач',
      value: kpi.totalTasks,
      sub: `${kpi.completedTasks} завершено`,
      icon: CheckCircle,
      color: '#22c55e',
      bg: 'rgba(34,197,94,0.08)'
    },
    {
      label: 'Выполнение плана',
      value: `${kpi.fulfillmentRate}%`,
      sub: `${kpi.totalProduced} из ${kpi.totalPlanned} ед.`,
      icon: TrendingUp,
      color: '#3b82f6',
      bg: 'rgba(59,130,246,0.08)'
    },
    {
      label: '% брака',
      value: `${kpi.defectRate}%`,
      sub: `${kpi.totalDefect} ед. брака`,
      icon: AlertCircle,
      color: kpi.defectRate > 5 ? '#ef4444' : '#f59e0b',
      bg: kpi.defectRate > 5 ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)'
    },
    {
      label: 'Закрытие задач',
      value: `${kpi.completionRate}%`,
      sub: 'от всех задач',
      icon: Package,
      color: '#8b5cf6',
      bg: 'rgba(139,92,246,0.08)'
    }
  ];

  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div className="flex-between mb-4" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ margin: 0 }}>Аналитика</h1>
        <div className="page-header-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Period selector */}
          <div className="period-selector" style={{ display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '8px', padding: '3px' }}>
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  background: period === opt.value ? '#3b82f6' : 'transparent',
                  color: period === opt.value ? '#fff' : '#64748b',
                  fontWeight: period === opt.value ? 600 : 400
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <a
            href={`${API_BASE}/api/export/report`}
            download
            className="btn btn-secondary"
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem' }}
          >
            <Download size={15} />
            Excel
          </a>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mb-4">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {kpiCards.map((k, i) => {
          const Icon = k.icon;
          return (
            <div key={i} className="card" style={{ padding: '1.25rem' }}>
              <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {k.label}
                </span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={16} color={k.color} />
                </div>
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.value}</div>
              <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#64748b' }}>{k.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Chart row 1: Production bar + Status pie */}
      <div className="grid grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>

        {/* Производство по дням */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h4 style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: '#0f172a' }}>
            Производство за {period} дней
          </h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={productionByDay} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" />
              <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '0.75rem', color: '#64748b', paddingTop: '8px' }} />
              <Bar dataKey="planned" name="План" fill="rgba(59,130,246,0.25)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="produced" name="Факт" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="defect" name="Брак" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Статусы задач */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h4 style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: '#0f172a' }}>
            Статусы задач
          </h4>
          {taskStatusData.length === 0 ? (
            <div className="flex-center" style={{ height: '220px', color: '#64748b', fontSize: '0.875rem' }}>
              Нет данных
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <ResponsiveContainer width="55%" height={200}>
                <PieChart>
                  <Pie
                    data={taskStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {taskStatusData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div style={{ background: 'rgba(255,255,255,0.98)', border: '1px solid rgba(15,23,42,0.1)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.8125rem', boxShadow: '0 4px 12px rgba(15,23,42,0.1)' }}>
                          <p style={{ margin: 0, color: payload[0].payload.color, fontWeight: 600 }}>{payload[0].name}</p>
                          <p style={{ margin: '2px 0 0', color: '#0f172a' }}>Задач: {payload[0].value}</p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {taskStatusData.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: s.color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', color: '#0f172a', fontWeight: 500 }}>{s.name}</div>
                      <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>{s.value} задач</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart row 2: Defect line + Top workers */}
      <div className="grid grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>

        {/* Брак по дням */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h4 style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: '#0f172a' }}>
            % брака по дням
          </h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={defectByDay} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" />
              <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="defect_pct"
                name="Брак %"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ fill: '#ef4444', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Топ исполнителей */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h4 style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: '#0f172a' }}>
            Топ исполнителей
          </h4>
          {topWorkers.length === 0 ? (
            <div className="flex-center" style={{ height: '200px', color: '#64748b', fontSize: '0.875rem' }}>
              Нет завершённых задач
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={topWorkers}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total_produced" name="Произведено" fill="#22c55e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Chart row 3: Top tech cards */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <h4 style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: '#0f172a' }}>
          Топ продуктов по объёму производства
        </h4>
        {topTechCards.length === 0 ? (
          <div className="flex-center" style={{ height: '160px', color: '#64748b', fontSize: '0.875rem' }}>
            Нет данных о производстве
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={topTechCards} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total_produced" name="Произведено (ед.)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;
