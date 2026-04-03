import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

const ROLE_LABELS = {
  admin: 'Владелец',
  technologist: 'Технолог',
  production_manager: 'Нач. производства',
  warehouse: 'Кладовщик',
  operator: 'Оператор'
};

const ROLE_COLORS = {
  admin: '#3b82f6',
  technologist: '#8b5cf6',
  production_manager: '#06b6d4',
  warehouse: '#f59e0b',
  operator: '#10b981'
};

const LoginPage = () => {
  const navigate = useNavigate();
  const { fetchUsers, login, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hoveredId, setHoveredId] = useState(null);

  useEffect(() => {
    if (user) { navigate('/'); return; }
    loadUsers();
  }, [user, navigate]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const userList = await fetchUsers();
      setUsers(userList);
      if (userList.length === 0) setError('Нет доступных пользователей');
    } catch (err) {
      setError('Не удалось загрузить список пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = async (userData) => {
    try {
      setError('');
      await login(userData.id);
      navigate('/');
    } catch (err) {
      setError('Ошибка при входе в систему');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 50%, rgba(59, 130, 246, 0.07) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(139, 92, 246, 0.05) 0%, transparent 50%), linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{ maxWidth: '720px', width: '100%' }}>
        {/* Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <Logo size={52} />
          </div>
          <p style={{ fontSize: '1rem', color: '#64748b', margin: '0 0 24px 0' }}>
            Система управления производством
          </p>
          <div style={{
            width: '40px', height: '2px', margin: '0 auto 24px',
            background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.4), transparent)'
          }} />
          <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
            Выберите профиль для входа
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.06)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#dc2626',
            padding: '10px 16px',
            borderRadius: '10px',
            marginBottom: '24px',
            textAlign: 'center',
            fontSize: '0.8125rem'
          }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>
            <div style={{
              width: '32px', height: '32px', border: '2px solid rgba(59, 130, 246, 0.2)',
              borderTopColor: '#3b82f6', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 12px'
            }} />
            <p style={{ margin: 0 }}>Загрузка...</p>
          </div>
        )}

        {!loading && users.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '14px'
          }}>
            {users.map((userData) => {
              const role = userData.role || 'operator';
              const label = ROLE_LABELS[role] || role;
              const color = ROLE_COLORS[role] || userData.avatar_color || '#64748b';
              const initials = userData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
              const isHovered = hoveredId === userData.id;

              return (
                <button
                  key={userData.id}
                  onClick={() => handleUserClick(userData)}
                  onMouseEnter={() => setHoveredId(userData.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    background: isHovered
                      ? `linear-gradient(135deg, rgba(${hexToRgb(color)}, 0.08), rgba(${hexToRgb(color)}, 0.02))`
                      : 'rgba(255, 255, 255, 0.9)',
                    border: `1px solid ${isHovered ? color + '55' : 'rgba(203, 213, 225, 0.8)'}`,
                    borderRadius: '14px',
                    padding: '24px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                    textAlign: 'center',
                    backdropFilter: 'blur(8px)',
                    boxShadow: isHovered ? `0 8px 30px ${color}20, 0 0 20px ${color}10` : '0 2px 8px rgba(15,23,42,0.07)',
                    transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                  }}
                >
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '50%',
                    background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px', fontWeight: 700, color: 'white',
                    boxShadow: isHovered ? `0 4px 16px ${color}40` : `0 2px 8px ${color}30`,
                    transition: 'box-shadow 0.3s ease'
                  }}>
                    {initials}
                  </div>
                  <h3 style={{
                    margin: '4px 0 0', fontSize: '0.8125rem', fontWeight: 600,
                    color: '#0f172a', lineHeight: 1.3
                  }}>
                    {userData.name}
                  </h3>
                  <div style={{
                    fontSize: '0.6875rem', color: '#64748b',
                    background: 'rgba(203, 213, 225, 0.45)',
                    padding: '3px 10px', borderRadius: '9999px'
                  }}>
                    {label}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div style={{
          marginTop: '48px', textAlign: 'center',
          color: '#94a3b8', fontSize: '0.75rem'
        }}>
          <p style={{ margin: 0 }}>2024 АромаТек v1.0</p>
        </div>
      </div>
    </div>
  );
};

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

export default LoginPage;
