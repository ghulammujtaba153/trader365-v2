'use client'

import { RequireAuth } from '@/components/auth/auth-guards'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { SidebarProvider } from '@/contexts/sidebar-context'

export default function DashboardLayout({ children }) {
  return (
    <RequireAuth>
      <SidebarProvider>
        <div className='flex min-h-screen bg-background'>
          <AppSidebar />
          <div className='flex min-w-0 flex-1 flex-col'>{children}</div>
        </div>
      </SidebarProvider>
    </RequireAuth>
  )
}
