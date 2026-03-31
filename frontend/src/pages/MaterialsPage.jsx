import React, { useEffect, useState } from 'react';
import { Plus, AlertTriangle, TrendingDown, TrendingUp, X, Download } from 'lucide-react';
import api from '../api';

const API_BASE = '';

const CATEGORIES = {
  oil: 'Масла',
  paper: 'Бумага/Картон',
  plastic: 'Пластик',
  packaging: 'Упаковка',
  label: 'Этикетки'
};

const MaterialsPage = () => {
  const [materials, setMaterials] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '', category: 'oil', unit: 'шт', quantity: '', minQuantity: '10'
  });

  useEffect(() => {
    loadMaterials();
    loadAlerts();
  }, []);

  const loadMaterials = async () => {
    try {
      const data = await api.get('/materials');
      setMaterials(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error('Ошибка при загрузке материалов:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const data = await api.get('/materials/alerts');
      setAlerts(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error('Ошибка при загрузке предупреждений:', err);
    }
  };

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/materials', {
        name: formData.name,
        category: formData.category,
        unit: formData.unit,
        quantity: Number(formData.quantity) || 0,
        minQuantity: Number(formData.minQuantity) || 10
      });
      setFormData({ name: '', category: 'oil', unit: 'шт', quantity: '', minQuantity: '10' });
      setShowForm(false);
      setSuccess('Материал добавлен');
      setTimeout(() => setSuccess(''), 3000);
      loadMaterials();
      loadAlerts();
    } catch (err) {
      setError('Ошибка при добавлении материала');
    }
  };

  const handleReceive = async (id) => {
    const qty = prompt('Введите количество для поступления:');
    if (!qty || isNaN(qty) || Number(qty) <= 0) return;
    try {
      await api.post(`/materials/${id}/receive`, { quantity: Number(qty) });
      setSuccess('Поступление зафиксировано');
      setTimeout(() => setSuccess(''), 3000);
      loadMaterials();
      loadAlerts();
    } catch (err) {
      setError('Ошибка при оформлении поступления');
    }
  };

  const handleConsume = async (id) => {
    const qty = prompt('Введите количество для списания:');
    if (!qty || isNaN(qty) || Number(qty) <= 0) return;
    try {
      await api.post(`/materials/${id}/consume`, { quantity: Number(qty) });
      setSuccess('Списание зафиксировано');
      setTimeout(() => setSuccess(''), 3000);
      loadMaterials();
      loadAlerts();
    } catch (err) {
      setError('Ошибка при списании (возможно, недостаточно материала)');
    }
  };

  const getStatus = (mat) => {
    if (mat.quantity <= 0) return 'critical';
    if (mat.quantity < mat.min_quantity) return 'critical';
    if (mat.quantity < mat.min_quantity * 1.5) return 'warning';
    return 'normal';
  };

  const getStatusColor = (status) => ({
    normal: '#16a34a', warning: '#f59e0b', critical: '#dc2626'
  }[status] || '#64748b');

  const getStatusText = (status) => ({
    normal: 'Норма', warning: 'Внимание', critical: 'Критично'
  }[status] || '—');

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '100%' }}>
        <p>Загрузка материалов...</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <div className="flex-between mb-4" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ margin: 0 }}>Склад материалов</h1>
        <div className="page-header-actions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <a href={`${API_BASE}/api/export/materials`} download className="btn btn-secondary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={16} />
            Excel
          </a>
          <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setError(''); }}>
            <Plus size={18} />
            Добавить материал
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertTriangle size={20} />
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><X size={16} /></button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <span>{success}</span>
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="card mb-4">
          <div className="card-header"><h4>Критические остатки</h4></div>
          <div className="card-body">
            {alerts.map((a) => (
              <div key={a.id} className="alert alert-warning" style={{ marginBottom: '0.5rem' }}>
                <AlertTriangle size={20} />
                <span><strong>{a.name}</strong>: осталось {a.quantity} {a.unit} (мин. {a.min_quantity})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Form */}
      {showForm && (
        <div className="card mb-4">
          <div className="card-header"><h4>Добавить новый материал</h4></div>
          <form onSubmit={handleAddMaterial}>
            <div className="card-body">
              <div className="grid grid-2 gap-3">
                <div className="form-group">
                  <label>Название материала</label>
                  <input type="text" required value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Например: Масло Мята" />
                </div>
                <div className="form-group">
                  <label>Категория</label>
                  <select value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                    {Object.entries(CATEGORIES).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Количество</label>
                  <input type="number" required min="0" step="any" value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Единица измерения</label>
                  <select value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}>
                    <option value="шт">шт</option>
                    <option value="л">л</option>
                    <option value="кг">кг</option>
                    <option value="м">м</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Минимальный уровень</label>
                  <input type="number" required min="0" step="any" value={formData.minQuantity}
                    onChange={(e) => setFormData({ ...formData, minQuantity: e.target.value })}
                    placeholder="10" />
                </div>
              </div>
            </div>
            <div className="card-footer">
              <button type="submit" className="btn btn-success">Добавить</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Отмена</button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="card-body">
          <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Материал</th>
                <th>Категория</th>
                <th>Количество</th>
                <th>Мин. уровень</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((mat) => {
                const status = getStatus(mat);
                return (
                  <tr key={mat.id}>
                    <td><strong>{mat.name}</strong></td>
                    <td className="text-muted">{CATEGORIES[mat.category] || mat.category}</td>
                    <td>{mat.quantity} {mat.unit}</td>
                    <td className="text-muted">{mat.min_quantity} {mat.unit}</td>
                    <td>
                      <span className="badge" style={{
                        backgroundColor: getStatusColor(status) + '30',
                        color: getStatusColor(status)
                      }}>
                        {getStatusText(status)}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn btn-sm btn-success" onClick={() => handleReceive(mat.id)} title="Поступление">
                          <TrendingUp size={16} /> +
                        </button>
                        <button className="btn btn-sm btn-warning" onClick={() => handleConsume(mat.id)} title="Расход">
                          <TrendingDown size={16} /> −
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {materials.length === 0 && (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '2rem' }}>
            <p className="text-muted">Нет материалов в базе</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialsPage;
