'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Eye, RefreshCw, Search } from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { TablePagination, usePagination } from '@/components/common/table-pagination'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

const formatDate = value => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

const formatMoney = (amount, currency) => {
  if (amount == null || Number.isNaN(Number(amount))) return '—'
  const cur = currency || 'USD'
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: 2
    }).format(Number(amount))
  } catch {
    return `${Number(amount)} ${cur}`
  }
}

const formatEventType = type => {
  if (!type) return '—'
  return String(type)
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const eventBadgeProps = type => {
  const t = String(type || '').toUpperCase()
  if (
    ['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'NON_RENEWING_PURCHASE'].includes(t) ||
    t.includes('PURCHASE') ||
    t.includes('RENEW') ||
    t.includes('UNCANCEL')
  ) {
    return {
      variant: 'default',
      className: 'border-transparent bg-emerald-600 text-white'
    }
  }
  if (['CANCELLATION', 'BILLING_ISSUE'].includes(t) || t.includes('CANCEL') || t.includes('BILLING')) {
    return {
      variant: 'secondary',
      className: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300'
    }
  }
  if (['EXPIRATION'].includes(t) || t.includes('EXPIR')) {
    return { variant: 'destructive' }
  }
  return { variant: 'outline' }
}

export default function EventsTable() {
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState([])
  const [search, setSearch] = useState('')

  const fetchEvents = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true)
      const res = await api.get('/api/subscription/events', {
        params: { limit: 200 }
      })
      setEvents(Array.isArray(res.data?.events) ? res.data.events : [])
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to load events')
      setEvents([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      fetchEvents()
    })
  }, [fetchEvents])

  const rows = useMemo(
    () =>
      events.map(event => ({
        ...event,
        id: event.id || event.eventId,
        displayName: event.userName || event.userEmail || (event.pending ? 'Pending' : '—'),
        packageLabel: event.subscriptionName || 'Premium Subscription',
        paidLabel:
          event.priceInPurchasedCurrency != null
            ? formatMoney(event.priceInPurchasedCurrency, event.currency)
            : formatMoney(event.price, event.currency || 'USD'),
        when: event.createdAt || event.purchasedAt
      })),
    [events]
  )

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows

    return rows.filter(row =>
      [
        row.displayName,
        row.userEmail,
        row.eventType,
        row.packageLabel,
        row.store,
        row.statusAfter,
        row.environment
      ]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(q))
    )
  }, [rows, search])

  const {
    page,
    pageSize,
    totalItems,
    totalPages,
    from,
    to,
    paginatedItems,
    goToPage,
    changePageSize
  } = usePagination(filteredRows, 10)

  return (
    <Card>
      <CardHeader className='space-y-4'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <CardTitle>Subscription events</CardTitle>
            <p className='mt-1 text-sm text-muted-foreground'>
              RevenueCat webhook events ({filteredRows.length}).
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-3'>
            <div className='relative w-full sm:w-64'>
              <Search className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder='Search user, event, package…'
                className='pl-8'
              />
            </div>
            <Button
              variant='outline'
              size='sm'
              disabled={loading}
              onClick={() => fetchEvents()}
            >
              <RefreshCw className='size-4' />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className='p-0'>
        {loading && rows.length === 0 ? (
          <div className='space-y-3 p-4'>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className='h-10 w-full' />
            ))}
          </div>
        ) : filteredRows.length === 0 ? (
          <p className='py-12 text-center text-sm text-muted-foreground'>
            {rows.length === 0 ? 'No events yet.' : 'No matches for your search.'}
          </p>
        ) : (
          <>
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Env</TableHead>
                    <TableHead className='w-[4.5rem] text-right'>View user</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map(row => {
                    const badge = eventBadgeProps(row.eventType)

                    return (
                      <TableRow key={row.id || row.eventId}>
                        <TableCell className='whitespace-nowrap text-muted-foreground'>
                          {formatDate(row.when)}
                        </TableCell>
                        <TableCell className='whitespace-normal font-medium'>
                          {row.displayName}
                        </TableCell>
                        <TableCell>
                          <Badge variant={badge.variant} className={badge.className}>
                            {formatEventType(row.eventType)}
                          </Badge>
                        </TableCell>
                        <TableCell className='max-w-0 whitespace-normal'>
                          <p className='line-clamp-2 break-words'>{row.packageLabel}</p>
                        </TableCell>
                        <TableCell className='whitespace-nowrap'>{row.paidLabel}</TableCell>
                        <TableCell>{row.store || '—'}</TableCell>
                        <TableCell>{row.statusAfter || '—'}</TableCell>
                        <TableCell>{row.environment || '—'}</TableCell>
                        <TableCell className='text-right'>
                          {row.userId ? (
                            <Link
                              href={`/users/${row.userId}`}
                              className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
                              aria-label='View user'
                              title='View user'
                            >
                              <Eye className='size-4' />
                            </Link>
                          ) : (
                            <span className='text-muted-foreground'>—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            <TablePagination
              page={page}
              pageSize={pageSize}
              totalItems={totalItems}
              totalPages={totalPages}
              from={from}
              to={to}
              onPageChange={goToPage}
              onPageSizeChange={changePageSize}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}
