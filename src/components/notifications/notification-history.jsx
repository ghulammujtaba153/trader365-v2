'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, Eye, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/api'
import { formatScreenName } from '@/lib/format'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TablePagination } from '@/components/common/table-pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

const STATUS_FILTERS = ['all', 'sent', 'scheduled', 'partial', 'failed', 'issues']

const statusLabel = status => {
  switch (status) {
    case 'sent':
      return 'Sent'
    case 'scheduled':
      return 'Scheduled'
    case 'processing':
      return 'Sending'
    case 'partial':
      return 'Partial'
    case 'failed':
      return 'Failed'
    case 'issues':
      return 'Needs attention'
    default:
      return status || '—'
  }
}

const audienceLabel = value => {
  switch (value) {
    case 'all':
      return 'All users'
    case 'roles':
      return 'By role'
    case 'specific':
      return 'Specific users'
    default:
      return value || '—'
  }
}

const statusBadgeProps = status => {
  switch (status) {
    case 'sent':
      return { variant: 'default' }
    case 'scheduled':
      return { variant: 'secondary' }
    case 'processing':
      return { variant: 'secondary' }
    case 'partial':
      return {
        variant: 'outline',
        className: 'border-amber-300 bg-amber-50 text-amber-800'
      }
    case 'failed':
      return { variant: 'destructive' }
    default:
      return { variant: 'outline' }
  }
}

const formatDate = value => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

function MetaField({ label, value }) {
  return (
    <div>
      <p className='mb-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
        {label}
      </p>
      <p className='text-sm font-semibold'>{value ?? '—'}</p>
    </div>
  )
}

export default function NotificationHistory({
  refreshKey = 0,
  statusFilter = 'all',
  onStatusFilterChange,
  onCompose,
  onSummary
}) {
  const [notifications, setNotifications] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [viewItem, setViewItem] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const fetchGen = useRef(0)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(0)
  }, [debouncedSearch, statusFilter])

  const fetchHistory = useCallback(async () => {
    const generation = ++fetchGen.current
    setLoading(true)

    try {
      const res = await api.get('/api/notifications/history', {
        params: {
          page,
          pageSize,
          status: statusFilter,
          q: debouncedSearch
        }
      })

      if (generation !== fetchGen.current) return

      setNotifications(res.data?.notifications || [])
      setTotal(res.data?.total ?? 0)
    } catch (err) {
      if (generation === fetchGen.current) {
        toast.error(err.response?.data?.message || 'Failed to load notification history')
      }
    } finally {
      if (generation === fetchGen.current) setLoading(false)
    }
  }, [page, pageSize, statusFilter, debouncedSearch])

  useEffect(() => {
    queueMicrotask(() => {
      fetchHistory()
    })
  }, [fetchHistory, refreshKey])

  // Keep summary cards fresh independently of table filters
  useEffect(() => {
    if (!onSummary) return
    let cancelled = false
    queueMicrotask(() => {
      ;(async () => {
        try {
          const res = await api.get('/api/notifications/history', {
            params: {
              page: 0,
              pageSize: 1,
              status: 'all',
              includeSummary: 1
            }
          })
          if (!cancelled && res.data?.summary) onSummary(res.data.summary)
        } catch {
          // keep previous summary
        }
      })()
    })
    return () => {
      cancelled = true
    }
  }, [refreshKey, onSummary])

  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)
  const uiPage = page + 1
  const from = total === 0 ? 0 : page * pageSize + 1
  const to = Math.min((page + 1) * pageSize, total)

  const stats = viewItem?.deliveryStats
  const viewStatusProps = statusBadgeProps(viewItem?.status)
  const showFilters = STATUS_FILTERS.filter(value => value !== 'issues')

  return (
    <>
      <Card className='min-h-[520px]'>
        <CardHeader className='border-b'>
          <div className='flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between'>
            <div>
              <CardTitle>Delivery history</CardTitle>
              <CardDescription>
                Sent, scheduled, and failed campaigns. Tap a metric above to filter.
              </CardDescription>
            </div>
            <div className='relative w-full lg:max-w-xs'>
              <Search className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder='Search title or message'
                className='pl-8'
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-3 p-0'>
          <div className='flex flex-wrap gap-1.5 px-4 pt-4'>
            {showFilters.map(value => {
              const isActive = statusFilter === value
              return (
                <button
                  key={value}
                  type='button'
                  aria-pressed={isActive}
                  onClick={() => onStatusFilterChange?.(value)}
                  className={cn(
                    'inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  )}
                >
                  {value === 'all' ? 'All' : statusLabel(value)}
                </button>
              )
            })}
            {statusFilter === 'issues' ? (
              <button
                type='button'
                aria-pressed
                onClick={() => onStatusFilterChange?.('all')}
                className='inline-flex h-7 items-center rounded-full border border-amber-500 bg-amber-50 px-2.5 text-xs font-medium text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              >
                Needs attention ×
              </button>
            ) : null}
          </div>

          {loading && notifications.length === 0 ? (
            <div className='space-y-3 p-4'>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className='h-10 w-full' />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className='flex flex-col items-center justify-center gap-3 px-6 py-16 text-center'>
              <div className='grid size-12 place-items-center rounded-2xl bg-muted'>
                <Bell className='size-5 text-muted-foreground' />
              </div>
              <div className='space-y-1'>
                <p className='text-sm font-medium'>No notifications found</p>
                <p className='max-w-sm text-sm text-muted-foreground'>
                  {debouncedSearch || statusFilter !== 'all'
                    ? 'Try clearing search or filters.'
                    : 'Compose your first push to reach app users.'}
                </p>
              </div>
              {!debouncedSearch && statusFilter === 'all' && onCompose ? (
                <Button onClick={onCompose}>
                  <Plus className='size-4' />
                  New notification
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              <div className={cn('overflow-x-auto', loading && 'opacity-60')}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='min-w-[160px]'>Title</TableHead>
                      <TableHead>Audience</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead title='Number of users targeted'>Reach</TableHead>
                      <TableHead title='Successful device deliveries / total devices'>
                        Devices OK
                      </TableHead>
                      <TableHead>Send at</TableHead>
                      <TableHead className='text-right'>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notifications.map(row => {
                      const badge = statusBadgeProps(row.status)
                      const reach =
                        row.deliveryStats?.recipientCount ?? row.recipients?.length ?? 0
                      const devices =
                        !row.deliveryStats || row.status === 'scheduled'
                          ? '—'
                          : `${row.deliveryStats.successCount ?? 0}/${row.deliveryStats.deviceTokenCount ?? 0}`

                      return (
                        <TableRow key={row._id}>
                          <TableCell className='max-w-[220px]'>
                            <p className='line-clamp-2 whitespace-normal font-medium'>
                              {row.title || '—'}
                            </p>
                          </TableCell>
                          <TableCell className='text-muted-foreground'>
                            {audienceLabel(row.targetType)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={badge.variant} className={badge.className}>
                              {statusLabel(row.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>{reach}</TableCell>
                          <TableCell>{devices}</TableCell>
                          <TableCell className='whitespace-nowrap text-muted-foreground'>
                            {formatDate(row.sendAt)}
                          </TableCell>
                          <TableCell className='text-right'>
                            <div className='inline-flex gap-1'>
                              <Button
                                variant='ghost'
                                size='icon-sm'
                                onClick={() => setViewItem(row)}
                                aria-label='View notification'
                                title='View details'
                              >
                                <Eye className='size-4' />
                              </Button>
                              <Button
                                variant='ghost'
                                size='icon-sm'
                                onClick={() => setDeleteId(row._id)}
                                aria-label={
                                  row.status === 'scheduled'
                                    ? 'Cancel scheduled notification'
                                    : 'Delete notification'
                                }
                                title={
                                  row.status === 'scheduled' ? 'Cancel schedule' : 'Delete'
                                }
                              >
                                <Trash2 className='size-4 text-destructive' />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              <TablePagination
                page={uiPage}
                pageSize={pageSize}
                totalItems={total}
                totalPages={totalPages}
                from={from}
                to={to}
                onPageChange={next => setPage(Math.max(0, next - 1))}
                onPageSizeChange={size => {
                  setPageSize(size)
                  setPage(0)
                }}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(viewItem)} onOpenChange={open => !open && setViewItem(null)}>
        <DialogContent className='flex max-h-[90vh] flex-col overflow-hidden sm:max-w-lg'>
          <DialogHeader className='shrink-0'>
            <DialogTitle>{viewItem?.title || 'Notification'}</DialogTitle>
            <DialogDescription>Delivery details and recipient sample</DialogDescription>
          </DialogHeader>

          {viewItem ? (
            <div className='scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto pr-1'>
              <div className='rounded-lg border border-border bg-muted/30 p-3'>
                <p className='mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                  Message
                </p>
                <p className='whitespace-pre-wrap text-sm leading-relaxed'>
                  {viewItem.message || '—'}
                </p>
              </div>

              <div className='flex flex-wrap gap-1.5'>
                <Badge variant={viewStatusProps.variant} className={viewStatusProps.className}>
                  {statusLabel(viewItem.status)}
                </Badge>
                <Badge variant='outline'>Audience · {audienceLabel(viewItem.targetType)}</Badge>
                {viewItem.screenName ? (
                  <Badge variant='outline'>Screen · {formatScreenName(viewItem.screenName)}</Badge>
                ) : null}
              </div>

              <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                <MetaField label='Send at' value={formatDate(viewItem.sendAt)} />
                <MetaField
                  label='Recipients'
                  value={String(stats?.recipientCount ?? viewItem.recipients?.length ?? 0)}
                />
                <MetaField
                  label='Devices delivered'
                  value={
                    viewItem.status === 'scheduled'
                      ? 'Pending'
                      : `${stats?.successCount ?? 0} / ${stats?.deviceTokenCount ?? 0}`
                  }
                />
                <MetaField label='No device' value={String(stats?.skippedNoToken ?? 0)} />
              </div>

              {viewItem.logs?.length > 0 ? (
                <div>
                  <p className='mb-2 text-sm font-semibold'>Recipient sample</p>
                  <div className='max-h-[280px] space-y-2 overflow-y-auto'>
                    {viewItem.logs.map((log, idx) => (
                      <div
                        key={idx}
                        className='flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2.5'
                      >
                        <div className='min-w-0'>
                          <p className='truncate text-sm font-medium'>
                            {log.userId?.name || 'Unknown user'}
                          </p>
                          <p className='truncate text-xs text-muted-foreground'>
                            {log.userId?.email || ''}
                          </p>
                        </div>
                        <div className='flex flex-wrap gap-1.5'>
                          <Badge variant={log.delivered ? 'default' : 'outline'}>
                            {log.delivered ? 'Push delivered' : 'Not pushed'}
                          </Badge>
                          <Badge variant='outline'>{log.seen ? 'Seen' : 'Unseen'}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className='shrink-0'>
            <Button variant='outline' onClick={() => setViewItem(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={open => !open && setDeleteId(null)}
        title={
          notifications.find(n => n._id === deleteId)?.status === 'scheduled'
            ? 'Cancel scheduled notification?'
            : 'Delete notification?'
        }
        description='Inbox copies for recipients will also be removed. This cannot be undone.'
        confirmText={
          notifications.find(n => n._id === deleteId)?.status === 'scheduled'
            ? 'Cancel schedule'
            : 'Delete'
        }
        destructive
        onConfirm={async () => {
          await api.delete(`/api/notifications/${deleteId}`)
          setDeleteId(null)
          if (notifications.length <= 1 && page > 0) {
            setPage(p => p - 1)
          } else {
            await fetchHistory()
          }
          return 'Notification deleted successfully'
        }}
      />
    </>
  )
}
