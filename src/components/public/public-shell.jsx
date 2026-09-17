'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import LoginPatterns from '@/components/auth/login-patterns'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/support', label: 'Support' },
  { href: '/delete-account', label: 'Delete account' }
]

export default function PublicShell({ children }) {
  const pathname = usePathname()

  return (
    <div className='relative min-h-screen overflow-hidden bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50'>
      <div className='absolute inset-0 dark:hidden'>
        <LoginPatterns variant='light' />
      </div>
      <div className='absolute inset-0 hidden dark:block'>
        <LoginPatterns variant='dark' />
      </div>

      <header className='relative z-10 border-b border-zinc-200/80 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/80'>
        <div className='mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6'>
          <Link href='/support' className='flex min-w-0 items-center gap-2.5'>
            <img
              src='/logo.png'
              alt='Trader 365'
              className='size-9 shrink-0 rounded-xl object-contain ring-1 ring-zinc-200 dark:ring-white/15'
            />
            <div className='min-w-0'>
              <p className='truncate text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50'>
                Trader 365
              </p>
              <p className='truncate text-[11px] text-zinc-500 dark:text-zinc-400'>Help center</p>
            </div>
          </Link>

          <nav className='flex items-center gap-1'>
            {NAV.map(item => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                      : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-50'
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      <main className='relative z-10 mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12'>
        {children}
      </main>
    </div>
  )
}
