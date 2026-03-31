import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Eye, ChevronDown, ChevronUp, Download } from 'lucide-react';
import api from '../api';

const API_BASE = '';

const TechCardsPage = () => {
  const [techcards, setTechcards] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    version: '1.0',
    items: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tcData, matData] = await Promise.all([
        api.get('/techcards'),
        api.get('/materials')
      ]);
      setTechcards(Array.isArray(tcData) ? tcData : tcData.data || []);
      setMaterials(Array.isArray(matData) ? matData : matData.data || []);
    } catch (err) {
      console.error('Ошибка при загрузке данных:', err);
      setError('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        version: formData.version,
        items: formData.items.map(item => ({
          materialId: Number(item.materialId),
          quantityPerUnit: Number(item.quantityPerUnit)
        }))
      };

      if (selectedCard) {
        await api.put(`/techcards/${selectedCard.id}`, payload);
      } else {
        await api.post('/techcards', payload);
      }
      resetForm();
      loadData();
    } catch (err) {
      setError('Ошибка при сохранении техкарты');
    }
  };

  const handleEdit = (card) => {
    setSelectedCard(card);
    setFormData({
      name: card.name,
      description: card.description || '',
      version: card.version,
      items: (card.items || []).map(item => ({
        materialId: item.material_id,
        quantityPerUnit: item.quantity_per_unit
      }))
    });
    setShowForm(true);
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { materialId: '', quantityPerUnit: '' }]
    });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const resetForm = () => {
    setShowForm(false);
    setSelectedCard(null);
    setFormData({ name: '', description: '', version: '1.0', items: [] });
  };

  const toggleExpand = (id) => {
    setExpandedCard(expandedCard === id ? null : id);
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '100%' }}>
        <p>Загрузка техкарт...</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <div className="flex-between mb-4" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ margin: 0 }}>Технологические карты</h1>
        <div className="page-header-actions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <a href={`${API_BASE}/api/export/techcards`} download className="btn btn-secondary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={16} />
            Excel
          </a>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={18} />
            Новая техкарта
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <span>{error}</span>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card mb-4">
          <div className="card-header">
            <h4>{selectedCard ? 'Редактировать техкарту' : 'Создать новую техкарту'}</h4>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="card-body">
              <div className="grid grid-2 gap-3">
                <div className="form-group">
                  <label>Название</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Введите название техкарты"
                  />
                </div>

                <div className="form-group">
                  <label>Версия</label>
                  <input
                    type="text"
                    required
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="1.0"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Описание</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Описание техкарты"
                  style={{ minHeight: '60px' }}
                ></textarea>
              </div>

              {/* Materials list */}
              <div className="form-group">
                <label>Материалы (рецептура на 1 единицу продукции)</label>
                {formData.items.map((item, index) => (
                  <div key={index} className="flex gap-2 mb-2" style={{ alignItems: 'center' }}>
                    <select
                      value={item.materialId}
                      onChange={(e) => updateItem(index, 'materialId', e.target.value)}
                      style={{ flex: 2 }}
                      required
                    >
                      <option value="">Выберите материал</option>
                      {materials.map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={item.quantityPerUnit}
                      onChange={(e) => updateItem(index, 'quantityPerUnit', e.target.value)}
                      placeholder="Кол-во"
                      style={{ flex: 1 }}
                      required
                    />
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => removeItem(index)}
                      style={{ padding: '6px 10px' }}
                    >
                      &times;
                    </button>
                  </div>
                ))}
                <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>
                  <Plus size={16} /> Добавить материал
                </button>
              </div>
            </div>

            <div className="card-footer">
              <button type="submit" className="btn btn-success">
                {selectedCard ? 'Сохранить' : 'Создать'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Techcards List */}
      <div className="grid gap-3">
        {techcards.map((card) => (
          <div key={card.id} className="card">
            <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => toggleExpand(card.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h4 style={{ margin: 0 }}>{card.name}</h4>
                <span className="badge badge-info">v{card.version}</span>
                <span className={`badge ${card.is_active ? 'badge-success' : 'badge-warning'}`}>
                  {card.is_active ? 'Активна' : 'Неактивна'}
                </span>
              </div>
              <div className="flex gap-1" style={{ alignItems: 'center' }}>
                <button
                  className="icon-btn"
                  onClick={(e) => { e.stopPropagation(); handleEdit(card); }}
                  title="Редактировать"
                >
                  <Edit2 size={18} />
                </button>
                {expandedCard === card.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </div>

            {expandedCard === card.id && (
              <div className="card-body">
                {card.description && (
                  <p className="text-muted mb-3">{card.description}</p>
                )}

                {card.items && card.items.length > 0 ? (
                  <div>
                    <h5 style={{ marginBottom: '8px' }}>Рецептура (на 1 единицу):</h5>
                    <table style={{ fontSize: '0.875rem' }}>
                      <thead>
                        <tr>
                          <th>Материал</th>
                          <th>Категория</th>
                          <th>Количество</th>
                          <th>Ед. изм.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {card.items.map((item) => (
                          <tr key={item.id}>
                            <td>{item.material_name}</td>
                            <td>{item.category}</td>
                            <td>{item.quantity_per_unit}</td>
                            <td>{item.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted">Нет материалов в рецептуре</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {techcards.length === 0 && (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '2rem' }}>
            <p className="text-muted">Нет технологических карт</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechCardsPage;
