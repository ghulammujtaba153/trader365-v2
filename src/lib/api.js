'use client'

import axios from 'axios'

const api = axios.create({
  baseURL: '',
  withCredentials: true
})

api.interceptors.response.use(
  response => response,
  error => {
    if (typeof window === 'undefined') return Promise.reject(error)

    const status = error.response?.status
    const url = String(error.config?.url || '')
    const method = String(error.config?.method || 'get').toLowerCase()
    const path = window.location.pathname
    const isAuthAttempt =
      url.includes('/api/auth/login') ||
      url.includes('/api/auth/register') ||
      url.includes('/api/auth/forget-password') ||
      url.includes('/api/auth/logout')
    const isPublicApi =
      url.includes('/api/problem/public') ||
      url.includes('/api/delete/requests/public') ||
      (url.includes('/api/faq') && method === 'get')
    const isPublicPage =
      path.startsWith('/login') ||
      path.startsWith('/support') ||
      path.startsWith('/delete-account') ||
      path.startsWith('/unauthorized')

    if ((status === 401 || status === 403) && !isAuthAttempt && !isPublicApi) {
      // Clear any leftover localStorage token from older builds
      try {
        localStorage.removeItem('token')
      } catch {
        /* ignore */
      }
      if (!isPublicPage) {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default api
