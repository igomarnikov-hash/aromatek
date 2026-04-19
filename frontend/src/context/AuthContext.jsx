import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api'

const AuthContext = createContext(null)

const DEMO_USERS = [
  { id: 1, name: 'Александр Петров', role: 'admin', avatar_color: '#2563eb' },
  { id: 2, name: 'Мария Сидорова', role: 'technologist', avatar_color: '#7c3aed' },
  { id: 3, name: 'Иван Иванов', role: 'production_manager', avatar_color: '#0891b2' },
  { id: 4, name: 'Елена Федорова', role: 'warehouse', avatar_color: '#d97706' },
  { id: 5, name: 'Николай Сергеев', role: 'operator', avatar_color: '#16a34a' },
]

const ROLE_LABELS = {
  admin: 'Администратор',
  technologist: 'Технолог',
  production_manager: 'Нач. производства',
  warehouse: 'Кладовщик',
  operator: 'Оператор',
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = sessionStorage.getItem('currentUser')
    if (saved) {
      try { setUser(JSON.parse(saved)) } catch {}
    }
    fetchUsers()
    setLoading(false)
  }, [])

  async function fetchUsers() {
    try {
      const data = await api.get('/users')
      setUsers(data.data || DEMO_USERS)
    } catch {
      setUsers(DEMO_USERS)
    }
  }

  async function login(userId) {
    try {
      const data = await api.post('/auth/login', { user_id: userId })
      const loggedUser = { ...data.data, roleLabel: ROLE_LABELS[data.data.role] }
      setUser(loggedUser)
      sessionStorage.setItem('currentUser', JSON.stringify(loggedUser))
      return loggedUser
    } catch {
      const demoUser = DEMO_USERS.find(u => u.id === userId)
      if (demoUser) {
        const loggedUser = { ...demoUser, roleLabel: ROLE_LABELS[demoUser.role] }
        setUser(loggedUser)
        sessionStorage.setItem('currentUser', JSON.stringify(loggedUser))
        return loggedUser
      }
      throw new Error('Пользователь не найден')
    }
  }

  function logout() {
    setUser(null)
    sessionStorage.removeItem('currentUser')
  }

  return (
    <AuthContext.Provider value={{ user, users, loading, login, logout, ROLE_LABELS }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
