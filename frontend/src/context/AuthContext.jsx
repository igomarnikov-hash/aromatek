import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Ошибка при загрузке пользователя:', e);
      }
    }
    setLoading(false);
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      const userList = Array.isArray(response) ? response : response.data || [];
      setUsers(userList);
      return userList;
    } catch (error) {
      console.error('Ошибка при загрузке списка пользователей:', error);
      return [];
    }
  };

  const login = async (userId) => {
    try {
      setLoading(true);
      const response = await api.post('/auth/login', { userId });
      const userData = response.data || response.user || response;

      setUser(userData);
      sessionStorage.setItem('currentUser', JSON.stringify(userData));
      return userData;
    } catch (error) {
      console.error('Ошибка при входе:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('currentUser');
  };

  return (
    <AuthContext.Provider value={{ user, loading, users, fetchUsers, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth должен быть использован внутри AuthProvider');
  }
  return context;
};
