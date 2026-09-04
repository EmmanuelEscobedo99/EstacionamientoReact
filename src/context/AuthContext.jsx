import { createContext, useContext, useState } from 'react'
import axios from '../api/axios'

const AuthContext = createContext(null)

const USER_KEY = 'user'

function parseUser() {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(parseUser)

  const setSession = (token, userData) => {
    localStorage.setItem('token', token)
    localStorage.setItem(USER_KEY, JSON.stringify(userData))
    setUser(userData)
  }

  const login = async (email, password) => {
    const { data } = await axios.post('/auth/login', { email, password })
    const userData = {
      email: data.email,
      rol: data.rol,
      codeUsuario: data.codeUsuario,
    }
    setSession(data.token, userData)
    return userData
  }

  const register = async (payload) => {
    const { data } = await axios.post('/auth/register', payload)
    const userData = {
      email: data.email,
      rol: data.rol,
      codeUsuario: data.codeUsuario,
    }
    setSession(data.token, userData)
    return userData
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }

  const hasRole = (...roles) => {
    if (!user) return false
    return roles.includes(user.rol)
  }

  const value = {
    user,
    login,
    register,
    logout,
    hasRole,
    isAuthenticated: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return context
}
