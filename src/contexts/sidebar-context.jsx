'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const SidebarContext = createContext(null)
const STORAGE_KEY = 'trader365.sidebar.open'

export function SidebarProvider({ children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored !== null) setOpen(stored === 'true')
    } catch {
      // ignore
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, String(open))
    } catch {
      // ignore
    }
  }, [open, hydrated])

  const toggle = useCallback(() => setOpen(prev => !prev), [])

  const value = useMemo(
    () => ({
      open,
      setOpen,
      toggle
    }),
    [open, toggle]
  )

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider')
  return ctx
}
