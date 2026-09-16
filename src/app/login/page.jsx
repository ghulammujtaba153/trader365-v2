import { Suspense } from 'react'

import { RedirectIfAuthenticated } from '@/components/auth/auth-guards'
import LoginForm from '@/components/auth/login-form'
import LoginPatterns from '@/components/auth/login-patterns'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Login · Trader365',
  description: 'Sign in to the Trader365 admin dashboard'
}

export default function LoginPage() {
  return (
    <RedirectIfAuthenticated>
      <div className='relative min-h-screen overflow-hidden bg-zinc-950 lg:grid lg:grid-cols-[1.05fr_1fr]'>
        <aside className='relative hidden min-h-screen flex-col justify-between overflow-hidden px-10 py-10 text-white lg:flex xl:px-14'>
          <LoginPatterns variant='dark' />

          <div className='relative z-10 flex items-center gap-3'>
            <img
              src='/logo.png'
              alt='Trader 365'
              className='size-12 rounded-2xl object-contain ring-1 ring-white/15'
            />
            <div>
              <p className='text-sm font-semibold tracking-tight'>Trader 365</p>
              <p className='text-xs text-white/55'>Control center</p>
            </div>
          </div>

          <div className='relative z-10 max-w-md space-y-4'>
            <p className='text-xs font-semibold tracking-[0.22em] text-cyan-300/80 uppercase'>
              Staff access
            </p>
            <h1 className='text-4xl font-semibold tracking-tight xl:text-5xl'>
              Trade with
              <span className='block text-cyan-300'>clarity and control.</span>
            </h1>
            <p className='max-w-sm text-sm leading-relaxed text-white/60'>
              Sign in as an admin or instructor to manage users, content, subscriptions, and
              operations from one dashboard.
            </p>
          </div>

          <p className='relative z-10 text-xs text-white/40'>Authorized personnel only</p>
        </aside>

        <div className='relative flex min-h-screen items-center justify-center p-4 sm:p-8'>
          <div className='absolute inset-0 bg-zinc-50 lg:bg-zinc-100/90' />
          <LoginPatterns variant='light' />

          <Suspense
            fallback={
              <div className='relative z-10 w-full max-w-md space-y-3'>
                <Skeleton className='h-80 w-full rounded-2xl' />
              </div>
            }
          >
            <div className='relative z-10 w-full'>
              <LoginForm />
            </div>
          </Suspense>
        </div>
      </div>
    </RedirectIfAuthenticated>
  )
}
