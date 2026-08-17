'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { useAuth } from '@/contexts/auth-context'
import { canAccessPath, firstAllowedPath } from '@/lib/dashboard-access'
import { Skeleton } from '@/components/ui/skeleton'

export function RequireAuth({ children }) {
  const { isAuthenticated, loading, user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname || '/home')}`)
    }
  }, [loading, isAuthenticated, router, pathname])

  useEffect(() => {
    if (loading || !isAuthenticated || !user) return
    if (canAccessPath(user, pathname)) return
    const next = firstAllowedPath(user)
    if (next !== pathname && canAccessPath(user, next)) {
      router.replace(next)
    }
  }, [loading, isAuthenticated, user, pathname, router])

  if (loading) {
    return (
      <div className='flex min-h-screen items-center justify-center p-6'>
        <div className='w-full max-w-sm space-y-3'>
          <Skeleton className='h-8 w-40' />
          <Skeleton className='h-24 w-full' />
          <Skeleton className='h-24 w-full' />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  if (user && !canAccessPath(user, pathname)) {
    const next = firstAllowedPath(user)
    if (next === pathname || !canAccessPath(user, next)) {
      return (
        <div className='grid min-h-screen place-items-center p-6'>
          <div className='max-w-md rounded-xl border p-6 text-center'>
            <p className='text-lg font-semibold'>No dashboard access</p>
            <p className='mt-2 text-sm text-muted-foreground'>
              This account has no pages assigned. Ask a super-admin to grant access.
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  return children
}

export function RedirectIfAuthenticated({ children }) {
  const { isAuthenticated, loading, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace(firstAllowedPath(user))
    }
  }, [loading, isAuthenticated, router, user])

  if (loading) {
    return (
      <div className='flex min-h-screen items-center justify-center p-6'>
        <Skeleton className='h-10 w-48' />
      </div>
    )
  }

  if (isAuthenticated) return null

  return children
}
