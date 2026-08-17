'use client'

import { Toaster } from 'sonner'

import { AuthProvider } from '@/contexts/auth-context'
import { TooltipProvider } from '@/components/ui/tooltip'

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <TooltipProvider>
        {children}
        <Toaster richColors position='top-right' closeButton />
      </TooltipProvider>
    </AuthProvider>
  )
}
