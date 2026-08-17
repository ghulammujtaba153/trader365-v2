'use client'

import Link from 'next/link'
import { Flag } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'

const capitalize = value => {
  if (!value || typeof value !== 'string') return '—'
  return value.charAt(0).toUpperCase() + value.slice(1)
}

const formatDate = (value, withTime = false) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return withTime ? date.toLocaleString() : date.toLocaleDateString()
}

const statusBadgeVariant = status => {
  switch (status) {
    case 'completed':
      return 'default'
    case 'pending':
      return 'secondary'
    case 'active':
    default:
      return 'outline'
  }
}

function MetaField({ label, value, children }) {
  return (
    <div>
      <p className='mb-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
        {label}
      </p>
      {children ?? <p className='text-sm font-semibold'>{value || '—'}</p>}
    </div>
  )
}

export default function GoalViewDialog({ open, onOpenChange, goal }) {
  if (!goal) return null

  const user = goal.userId && typeof goal.userId === 'object' ? goal.userId : null
  const userId = user?._id || (typeof goal.userId === 'string' ? goal.userId : null)
  const userName = user?.name || 'N/A'
  const userEmail = user?.email || '—'
  const frequency = goal.frequency || goal.type

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] flex-col overflow-hidden sm:max-w-lg'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>{goal.title || 'Goal'}</DialogTitle>
          <DialogDescription>
            {[capitalize(frequency), capitalize(goal.status)].filter(v => v !== '—').join(' · ')}
          </DialogDescription>
        </DialogHeader>

        <div className='scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto pr-1'>
          <div className='flex flex-wrap gap-1.5'>
            <Badge variant={statusBadgeVariant(goal.status)} className='gap-1 capitalize'>
              <Flag className='size-3' />
              {capitalize(goal.status)}
            </Badge>
            <Badge variant='outline' className='capitalize'>
              {capitalize(frequency)}
            </Badge>
          </div>

          {goal.description ? (
            <p className='text-sm leading-relaxed text-muted-foreground'>{goal.description}</p>
          ) : (
            <p className='text-sm text-muted-foreground/70'>No description provided.</p>
          )}

          <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
            <MetaField label='User'>
              {userId ? (
                <Link
                  href={`/users/${userId}`}
                  className='text-sm font-semibold text-primary hover:underline'
                >
                  {userName}
                </Link>
              ) : (
                <p className='text-sm font-semibold'>{userName}</p>
              )}
            </MetaField>
            <MetaField label='Email' value={userEmail} />
            <MetaField label='Frequency' value={capitalize(frequency)} />
            <MetaField label='Status' value={capitalize(goal.status)} />
            <MetaField label='Target date' value={formatDate(goal.targetDate)} />
            <MetaField label='Created' value={formatDate(goal.createdAt, true)} />
            <MetaField label='Updated' value={formatDate(goal.updatedAt, true)} />
          </div>
        </div>

        <DialogFooter className='shrink-0'>
          <Button variant='outline' onClick={() => onOpenChange?.(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
