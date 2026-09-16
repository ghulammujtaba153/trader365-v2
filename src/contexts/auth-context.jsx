'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import api from '@/lib/api'

const AuthContext = createContext(null)

const canUseDashboard = user => user?.role === 'admin' || user?.role === 'editor'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout')
    } catch {
      /* still clear local session */
    }
    setUser(null)
    try {
      localStorage.removeItem('token')
    } catch {
      /* ignore */
    }
  }, [])

  const fetchMe = useCallback(async () => {
    const response = await api.get('/api/auth/me')
    const fetchedUser = response?.data?.user
    if (!fetchedUser) throw new Error('User not found')

    if (!canUseDashboard(fetchedUser)) {
      await logout()
      const error = new Error('Access denied. Admin or instructor accounts only.')
      error.code = 'UNAUTHORIZED'
      throw error
    }

    setUser(fetchedUser)
    return fetchedUser
  }, [logout])

  useEffect(() => {
    const init = async () => {
      try {
        // Migrate away from legacy localStorage JWT
        try {
          localStorage.removeItem('token')
        } catch {
          /* ignore */
        }
        await fetchMe()
      } catch {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [fetchMe])

  const login = useCallback(async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password })
    const loggedInUser = response.data?.user

    if (!loggedInUser) {
      throw new Error(response.data?.message || 'Login failed')
    }

    if (!canUseDashboard(loggedInUser)) {
      await api.post('/api/auth/logout').catch(() => {})
      const error = new Error('Access denied. Admin or instructor accounts only.')
      error.code = 'UNAUTHORIZED'
      throw error
    }

    try {
      localStorage.removeItem('token')
    } catch {
      /* ignore */
    }

    setUser(loggedInUser)
    return loggedInUser
  }, [])

  const value = useMemo(
    () => ({
      user,
      setUser,
      loading,
      login,
      logout,
      isAuthenticated: !!user
    }),
    [user, loading, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
