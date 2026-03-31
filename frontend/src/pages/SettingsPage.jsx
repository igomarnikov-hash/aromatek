import React, { useState } from 'react';
import { Users, Bell, Shield, Save } from 'lucide-react';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    companyName: 'АромаТек',
    companyAddress: 'г. Москва, ул. Примерная, д. 123',
    companyPhone: '+7 (999) 123-45-67',
    companyEmail: 'info@aromatek.ru',
    workingHours: '08:00-17:00',
    timezone: 'Europe/Moscow',
    enableNotifications: true,
    notificationEmail: true,
    notificationPush: true,
    alertCritical: true,
    alertWarning: true,
    alertInfo: true,
    dataBackup: 'weekly'
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Mock save
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ width: '100%' }}>
      <h1 style={{ marginTop: 0 }}>Настройки системы</h1>

      {saved && (
        <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
          <span>✓ Настройки сохранены успешно</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '2rem' }}>
        {/* Tabs */}
        <div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { id: 'general', label: 'Основные', icon: 'ℹ️' },
              { id: 'users', label: 'Пользователи', icon: '👥' },
              { id: 'notifications', label: 'Уведомления', icon: '🔔' },
              { id: 'security', label: 'Безопасность', icon: '🔒' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '10px 12px',
                  textAlign: 'left',
                  background: activeTab === tab.id ? '#2563eb' : 'transparent',
                  border: 'none',
                  borderRadius: '0.375rem',
                  color: activeTab === tab.id ? 'white' : '#334155',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontWeight: activeTab === tab.id ? 600 : 400
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div>
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="card">
              <div className="card-header">
                <h4>Основные параметры</h4>
              </div>

              <div className="card-body">
                <div className="grid grid-2 gap-3">
                  <div className="form-group">
                    <label>Название компании</label>
                    <input
                      type="text"
                      value={settings.companyName}
                      onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Телефон</label>
                    <input
                      type="tel"
                      value={settings.companyPhone}
                      onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Адрес</label>
                    <input
                      type="text"
                      value={settings.companyAddress}
                      onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={settings.companyEmail}
                      onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Рабочее время</label>
                    <input
                      type="text"
                      value={settings.workingHours}
                      onChange={(e) => setSettings({ ...settings, workingHours: e.target.value })}
                      placeholder="08:00-17:00"
                    />
                  </div>

                  <div className="form-group">
                    <label>Часовой пояс</label>
                    <select
                      value={settings.timezone}
                      onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                    >
                      <option value="Europe/Moscow">Europe/Moscow (МСК)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                      <option value="Europe/Berlin">Europe/Berlin (CET)</option>
                      <option value="Asia/Yekaterinburg">Asia/Yekaterinburg (YEKT)</option>
                      <option value="Asia/Novosibirsk">Asia/Novosibirsk (NOVT)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="card-footer">
                <button className="btn btn-success" onClick={handleSave}>
                  <Save size={18} />
                  Сохранить
                </button>
              </div>
            </div>
          )}

          {/* Users Management */}
          {activeTab === 'users' && (
            <div className="card">
              <div className="card-header">
                <h4>Управление пользователями</h4>
              </div>

              <div className="card-body">
                <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Имя</th>
                      <th>Роль</th>
                      <th>Email</th>
                      <th>Статус</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Александр Петров</td>
                      <td>Владелец</td>
                      <td>alex@aromatek.ru</td>
                      <td><span className="badge badge-success">Активный</span></td>
                      <td>
                        <button className="btn btn-sm btn-secondary">Редактировать</button>
                      </td>
                    </tr>
                    <tr>
                      <td>Мария Сидорова</td>
                      <td>Технолог</td>
                      <td>maria@aromatek.ru</td>
                      <td><span className="badge badge-success">Активный</span></td>
                      <td>
                        <button className="btn btn-sm btn-secondary">Редактировать</button>
                      </td>
                    </tr>
                    <tr>
                      <td>Иван Иванов</td>
                      <td>Нач. производства</td>
                      <td>ivan@aromatek.ru</td>
                      <td><span className="badge badge-success">Активный</span></td>
                      <td>
                        <button className="btn btn-sm btn-secondary">Редактировать</button>
                      </td>
                    </tr>
                    <tr>
                      <td>Елена Федорова</td>
                      <td>Кладовщик</td>
                      <td>elena@aromatek.ru</td>
                      <td><span className="badge badge-success">Активный</span></td>
                      <td>
                        <button className="btn btn-sm btn-secondary">Редактировать</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div className="card">
              <div className="card-header">
                <h4>Параметры уведомлений</h4>
              </div>

              <div className="card-body">
                <div style={{ marginBottom: '1.5rem' }}>
                  <h5 style={{ marginBottom: '1rem' }}>Способы уведомлений</h5>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={settings.enableNotifications}
                        onChange={(e) => setSettings({ ...settings, enableNotifications: e.target.checked })}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span>Включить уведомления в системе</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={settings.notificationEmail}
                        onChange={(e) => setSettings({ ...settings, notificationEmail: e.target.checked })}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span>Email уведомления</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={settings.notificationPush}
                        onChange={(e) => setSettings({ ...settings, notificationPush: e.target.checked })}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span>Push уведомления</span>
                    </label>
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <h5 style={{ marginBottom: '1rem' }}>Типы событий для уведомлений</h5>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={settings.alertCritical}
                        onChange={(e) => setSettings({ ...settings, alertCritical: e.target.checked })}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span>Критические события (красные)</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={settings.alertWarning}
                        onChange={(e) => setSettings({ ...settings, alertWarning: e.target.checked })}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span>Предупреждения (желтые)</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={settings.alertInfo}
                        onChange={(e) => setSettings({ ...settings, alertInfo: e.target.checked })}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span>Информационные события (синие)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="card-footer">
                <button className="btn btn-success" onClick={handleSave}>
                  <Save size={18} />
                  Сохранить
                </button>
              </div>
            </div>
          )}

          {/* Security */}
          {activeTab === 'security' && (
            <div className="card">
              <div className="card-header">
                <h4>Параметры безопасности</h4>
              </div>

              <div className="card-body">
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Резервное копирование
                  </label>
                  <select
                    value={settings.dataBackup}
                    onChange={(e) => setSettings({ ...settings, dataBackup: e.target.value })}
                    style={{
                      padding: '0.625rem 0.875rem',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem',
                      color: '#0f172a',
                      width: '100%'
                    }}
                  >
                    <option value="disabled">Отключено</option>
                    <option value="daily">Ежедневно</option>
                    <option value="weekly">Еженедельно</option>
                    <option value="monthly">Ежемесячно</option>
                  </select>
                  <p className="text-muted text-sm" style={{ marginTop: '0.5rem' }}>
                    Автоматическое резервное копирование базы данных
                  </p>
                </div>

                <div style={{
                  padding: '1rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  marginBottom: '1.5rem'
                }}>
                  <h5 style={{ marginTop: 0, marginBottom: '0.75rem' }}>Информация о системе</h5>
                  <p className="text-muted" style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}>
                    <strong>Версия:</strong> 1.0.0
                  </p>
                  <p className="text-muted" style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}>
                    <strong>Последнее обновление:</strong> 2024-03-20
                  </p>
                  <p className="text-muted" style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}>
                    <strong>Состояние:</strong> <span style={{ color: '#16a34a' }}>✓ Нормально</span>
                  </p>
                </div>

                <div>
                  <button className="btn btn-danger">Очистить кэш</button>
                  <button className="btn btn-secondary" style={{ marginLeft: '0.75rem' }}>
                    Экспортировать данные
                  </button>
                </div>
              </div>

              <div className="card-footer">
                <button className="btn btn-success" onClick={handleSave}>
                  <Save size={18} />
                  Сохранить
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
