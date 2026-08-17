'use client'

import Link from 'next/link'
import { ArrowLeft, FileQuestion, Home, ShieldAlert, ShieldOff } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const ICONS = {
  'file-question': FileQuestion,
  'shield-off': ShieldOff,
  'shield-alert': ShieldAlert
}

export default function StatusPage({
  code,
  title,
  description,
  icon = 'shield-alert',
  primaryHref = '/home',
  primaryLabel = 'Back to home',
  secondaryHref = '/login',
  secondaryLabel = 'Go to login'
}) {
  const Icon = ICONS[icon] || ShieldAlert

  return (
    <div className='relative flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-muted via-background to-background p-4'>
      <Card className='w-full max-w-md border-border/80 shadow-sm'>
        <CardHeader className='space-y-4 text-center'>
          <div className='mx-auto grid size-14 place-items-center rounded-2xl bg-foreground text-background'>
            <Icon className='size-6' />
          </div>
          <div className='space-y-2'>
            <p className='text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase'>{code}</p>
            <CardTitle className='text-2xl'>{title}</CardTitle>
            <CardDescription className='text-sm leading-relaxed'>{description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className='flex flex-col gap-2 sm:flex-row'>
          <Link href={primaryHref} className={cn(buttonVariants({ size: 'lg' }), 'flex-1')}>
            <Home className='size-4' />
            {primaryLabel}
          </Link>
          <Link
            href={secondaryHref}
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'flex-1')}
          >
            <ArrowLeft className='size-4' />
            {secondaryLabel}
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
