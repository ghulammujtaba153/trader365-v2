'use client'

import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'

import { AuthProvider } from '@/contexts/auth-context'
import { TooltipProvider } from '@/components/ui/tooltip'

export default function Providers({ children }) {
  return (
    <ThemeProvider attribute='class' defaultTheme='light' enableSystem={false} storageKey='trader365-theme'>
      <AuthProvider>
        <TooltipProvider>
          {children}
          <Toaster richColors position='top-right' closeButton />
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
