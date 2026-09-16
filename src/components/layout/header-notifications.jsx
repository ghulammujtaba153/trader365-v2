'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, CircleAlert, Loader2, Ticket } from 'lucide-react'

import api from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

const relativeTime = value => {
  if (!value) return ''
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  if (!Number.isFinite(diffMs)) return formatDateTime(value)
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDateTime(value)
}

export default function HeaderNotifications() {
  const { user } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [error, setError] = useState('')

  const fetchInbox = useCallback(async () => {
    if (!user?._id && !user?.id) return
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/api/notifications/inbox')
      setItems(Array.isArray(res.data?.items) ? res.data.items : [])
      setUnreadCount(Number(res.data?.unreadCount) || 0)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load notifications')
      setItems([])
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }, [user?._id, user?.id])

  useEffect(() => {
    fetchInbox()
    const timer = setInterval(fetchInbox, 60000)
    return () => clearInterval(timer)
  }, [fetchInbox])

  useEffect(() => {
    if (open) fetchInbox()
  }, [open, fetchInbox])

  const markSeen = async item => {
    if (item.type !== 'notification' || item.isSeen || !item.id) return
    try {
      await api.post(`/api/notifications/seen/${item.id}`, {})
      setItems(prev =>
        prev.map(row => (row.id === item.id ? { ...row, isSeen: true } : row))
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {
      /* keep unread; user can retry */
    }
  }

  const markAllSeen = async () => {
    const unseen = items.filter(item => item.type === 'notification' && !item.isSeen)
    if (!unseen.length) return
    await Promise.allSettled(
      unseen.map(item => api.post(`/api/notifications/seen/${item.id}`, {}))
    )
    setItems(prev => {
      const next = prev.map(row =>
        row.type === 'notification' ? { ...row, isSeen: true } : row
      )
      setUnreadCount(next.filter(row => !row.isSeen).length)
      return next
    })
  }

  const onItemClick = async item => {
    await markSeen(item)
    setOpen(false)
    if (item.href) router.push(item.href)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            variant='outline'
            size='icon-sm'
            className='relative border-border/80 bg-background/80 shadow-sm'
            aria-label={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : 'Notifications'
            }
          />
        }
      >
        <Bell className='size-4' />
        {unreadCount > 0 ? (
          <span className='absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground'>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </DropdownMenuTrigger>

      <DropdownMenuContent align='end' className='w-[360px] p-0'>
        <div className='flex items-center justify-between gap-2 border-b px-3 py-2.5'>
          <div>
            <DropdownMenuLabel className='px-0 py-0 text-sm font-semibold text-foreground'>
              Notifications
            </DropdownMenuLabel>
            <p className='text-[11px] text-muted-foreground'>
              For {user?.email || user?.name || 'your account'}
              {user?.role === 'editor'
                ? ' · Instructor'
                : user?.role === 'admin'
                  ? ' · Admin'
                  : ''}
            </p>
          </div>
          {items.some(item => item.type === 'notification' && !item.isSeen) ? (
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='h-7 gap-1 px-2 text-xs'
              onClick={markAllSeen}
            >
              <CheckCheck className='size-3.5' />
              Mark read
            </Button>
          ) : null}
        </div>

        <div className='max-h-80 overflow-y-auto'>
          {loading && items.length === 0 ? (
            <div className='flex items-center justify-center gap-2 px-3 py-8 text-sm text-muted-foreground'>
              <Loader2 className='size-4 animate-spin' />
              Loading…
            </div>
          ) : error ? (
            <p className='px-3 py-8 text-center text-sm text-destructive'>{error}</p>
          ) : items.length === 0 ? (
            <div className='px-3 py-8 text-center'>
              <Bell className='mx-auto mb-2 size-5 text-muted-foreground' />
              <p className='text-sm font-medium'>No notifications</p>
              <p className='mt-1 text-xs text-muted-foreground'>
                Role and email-targeted updates will show up here.
              </p>
            </div>
          ) : (
            items.map(item => {
              const Icon = item.type === 'ticket' ? Ticket : CircleAlert
              return (
                <DropdownMenuItem
                  key={item.id}
                  className={cn(
                    'cursor-pointer items-start gap-2 rounded-none px-3 py-2.5',
                    !item.isSeen && 'bg-primary/5'
                  )}
                  onClick={() => onItemClick(item)}
                >
                  <span
                    className={cn(
                      'mt-0.5 grid size-7 shrink-0 place-items-center rounded-full',
                      item.type === 'ticket'
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                        : 'bg-primary/15 text-primary'
                    )}
                  >
                    <Icon className='size-3.5' />
                  </span>
                  <span className='min-w-0 flex-1 space-y-0.5'>
                    <span className='flex items-start justify-between gap-2'>
                      <span className='text-sm font-medium leading-snug'>{item.title}</span>
                      {!item.isSeen ? (
                        <span className='mt-1 size-1.5 shrink-0 rounded-full bg-primary' />
                      ) : null}
                    </span>
                    <span className='line-clamp-2 text-xs text-muted-foreground'>
                      {item.message}
                    </span>
                    <span className='text-[11px] text-muted-foreground'>
                      {relativeTime(item.sendAt || item.createdAt)}
                    </span>
                  </span>
                </DropdownMenuItem>
              )
            })
          )}
        </div>

        <DropdownMenuSeparator className='m-0' />
        <div className='p-1.5'>
          <Button
            variant='ghost'
            className='h-8 w-full justify-center text-xs'
            onClick={() => {
              setOpen(false)
              router.push('/issues')
            }}
          >
            View support tickets
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
