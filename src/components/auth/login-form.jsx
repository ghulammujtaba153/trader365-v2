'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { useAuth } from '@/contexts/auth-context'
import { firstAllowedPath } from '@/lib/dashboard-access'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

const fieldClassName =
  'h-10 border-zinc-200 bg-white px-3 text-zinc-950 placeholder:text-zinc-400 ' +
  'dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500'

export default function LoginForm() {
  const { login } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const loggedInUser = await login(email.trim(), password)
      toast.success('Signed in successfully')
      const next = searchParams.get('next')
      const fallback = firstAllowedPath(loggedInUser)
      router.replace(next && next.startsWith('/') ? next : fallback)
    } catch (err) {
      if (err.code === 'UNAUTHORIZED' || /admin or instructor accounts only/i.test(err.message || '')) {
        router.replace('/unauthorized')
        return
      }

      const message =
        err.response?.data?.message || err.message || 'Unable to sign in. Check your credentials.'
      setError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card
      className={
        'mx-auto w-full max-w-[420px] border-0 bg-white/95 py-8 text-zinc-950 ' +
        'shadow-xl shadow-zinc-900/10 ring-1 ring-zinc-200/80 backdrop-blur-sm ' +
        'dark:bg-zinc-900/95 dark:text-zinc-50 dark:shadow-black/40 dark:ring-white/10 ' +
        '[--card-spacing:--spacing(7)]'
      }
    >
      <CardHeader className='space-y-4'>
        <div className='flex items-center gap-3'>
          <img
            src='/logo.png'
            alt='Trader 365'
            className='size-12 rounded-2xl object-contain shadow-sm ring-1 ring-zinc-200 dark:ring-white/15'
          />
          <div className='lg:hidden'>
            <p className='text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50'>
              Trader 365
            </p>
            <p className='text-[11px] text-zinc-500 dark:text-zinc-400'>Control center</p>
          </div>
        </div>

        <div className='space-y-1.5'>
          <CardTitle className='text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50'>
            Welcome back
          </CardTitle>
          <CardDescription className='text-[15px] leading-relaxed text-zinc-500 dark:text-zinc-400'>
            Sign in with your admin or instructor account to open the dashboard.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='email' className='text-zinc-700 dark:text-zinc-300'>
              Email
            </Label>
            <Input
              id='email'
              type='email'
              autoComplete='email'
              placeholder='admin@example.com'
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className={fieldClassName}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='password' className='text-zinc-700 dark:text-zinc-300'>
              Password
            </Label>
            <div className='relative'>
              <Input
                id='password'
                type={showPassword ? 'text' : 'password'}
                autoComplete='current-password'
                placeholder='••••••••'
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className={`${fieldClassName} pr-10`}
              />
              <Button
                type='button'
                variant='ghost'
                size='icon-sm'
                className='absolute top-1/2 right-1.5 -translate-y-1/2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100'
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
              </Button>
            </div>
          </div>

          {error ? <p className='text-sm text-destructive'>{error}</p> : null}

          <Button type='submit' className='mt-1 h-10 w-full' disabled={submitting} size='lg'>
            {submitting ? (
              <>
                <Loader2 className='animate-spin' />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className='border-0 bg-transparent pt-0'>
        <p className='w-full text-center text-xs text-zinc-500 dark:text-zinc-400'>
          Access is limited to authorized admin accounts.
        </p>
      </CardFooter>
    </Card>
  )
}
