'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, Clock, CreditCard, Eye, Plus, RefreshCw, Search, XCircle } from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { TablePagination, usePagination } from '@/components/common/table-pagination'
import GrantSubscriptionDialog from '@/components/subscriptions/grant-subscription-dialog'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import MetricCard from '@/components/dashboard/metric-card'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
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

const isAnonymousId = id => typeof id === 'string' && id.startsWith('$RCAnonymousID:')

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

const isExpiredRow = row => {
  if (row.status === 'expired') return true
  if (!row.expirationDate) return false
  const exp = new Date(row.expirationDate).getTime()
  return Number.isFinite(exp) && exp <= Date.now()
}

const isExpiringRow = row => {
  if (isExpiredRow(row)) return false
  if (!row.expirationDate) return false
  const exp = new Date(row.expirationDate).getTime()
  return Number.isFinite(exp) && exp > Date.now() && exp <= Date.now() + SEVEN_DAYS_MS
}

const SUB_FILTERS = [
  {
    id: 'all',
    title: 'All',
    subtitle: 'Current snapshots',
    icon: CreditCard,
    match: () => true
  },
  {
    id: 'active',
    title: 'Active',
    subtitle: 'Currently entitled',
    icon: CreditCard,
    match: row => row.status === 'active' && !isExpiredRow(row)
  },
  {
    id: 'expiring',
    title: 'Expiring 7d',
    subtitle: 'Renew soon',
    icon: Clock,
    match: isExpiringRow
  },
  {
    id: 'expired',
    title: 'Churned / expired',
    subtitle: 'Access ended',
    icon: XCircle,
    match: isExpiredRow
  },
  {
    id: 'billing',
    title: 'Billing issue',
    subtitle: 'Needs follow-up',
    icon: AlertTriangle,
    match: row => row.status === 'billing_issue' || row.status === 'cancelled'
  }
]

const statusBadgeProps = status => {
  switch (status) {
    case 'active':
      return {
        variant: 'default',
        className: 'border-transparent bg-emerald-600 text-white'
      }
    case 'cancelled':
    case 'billing_issue':
      return {
        variant: 'secondary',
        className: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300'
      }
    case 'expired':
      return { variant: 'destructive' }
    default:
      return { variant: 'outline' }
  }
}

export default function SubscriptionsTable() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedFilter = searchParams.get('filter') || 'all'
  const [loading, setLoading] = useState(true)
  const [subscribers, setSubscribers] = useState([])
  const [includeExpired, setIncludeExpired] = useState(true)
  const [search, setSearch] = useState('')
  const [grantOpen, setGrantOpen] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState(null)
  const [filter, setFilter] = useState(
    SUB_FILTERS.some(item => item.id === requestedFilter) ? requestedFilter : 'all'
  )

  const fetchSubscribers = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true)
      const res = await api.get('/api/subscription/subscribers', {
        params: { includeExpired: includeExpired ? 'true' : 'false' }
      })
      setSubscribers(Array.isArray(res.data?.subscribers) ? res.data.subscribers : [])
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to load subscriptions')
      setSubscribers([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [includeExpired])

  useEffect(() => {
    queueMicrotask(() => {
      fetchSubscribers()
    })
  }, [fetchSubscribers])

  useEffect(() => {
    if (SUB_FILTERS.some(item => item.id === requestedFilter)) setFilter(requestedFilter)
    if (requestedFilter === 'expired' || requestedFilter === 'expiring') setIncludeExpired(true)
  }, [requestedFilter])

  const applyFilter = id => {
    setFilter(id)
    router.replace(id === 'all' ? '/subscriptions' : `/subscriptions?filter=${id}`, { scroll: false })
  }

  const rows = useMemo(() => {
    const byKey = new Map()

    for (const row of subscribers) {
      const key = row.userId || row.appUserId || row.id
      const existing = byKey.get(key)

      if (!existing) {
        byKey.set(key, row)
        continue
      }

      const score = r => {
        let s = 0
        if (r.userId) s += 2
        if (!isAnonymousId(r.appUserId)) s += 1
        if (r.subscriptionName) s += 1
        return s
      }

      if (score(row) > score(existing)) byKey.set(key, row)
    }

    return [...byKey.values()].map(row => ({
      ...row,
      id: row.id,
      displayName: row.name || (row.userId ? String(row.userId) : 'Pending'),
      packageLabel: row.subscriptionName || 'Premium Subscription'
    }))
  }, [subscribers])

  const counts = useMemo(() => {
    const next = {}
    for (const item of SUB_FILTERS) next[item.id] = rows.filter(item.match).length
    return next
  }, [rows])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const matcher = SUB_FILTERS.find(item => item.id === filter)?.match || (() => true)

    return rows.filter(row => {
      if (!matcher(row)) return false
      if (!q) return true
      return [row.displayName, row.email, row.packageLabel, row.status, row.environment, row.lastEventType]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(q))
    })
  }, [rows, search, filter])

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
    <>
    <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-5'>
      {SUB_FILTERS.map(item => {
        const selected = filter === item.id
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type='button'
            onClick={() => applyFilter(item.id)}
            className={cn(
              'rounded-xl text-left transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected && 'ring-2 ring-foreground/20'
            )}
          >
            <MetricCard
              title={item.title}
              value={counts[item.id] || 0}
              subtitle={selected ? 'Filtering list' : item.subtitle}
              icon={Icon}
              format='number'
            />
          </button>
        )
      })}
    </div>

    <Card>
      <CardHeader className='space-y-4'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <CardTitle>Subscriptions</CardTitle>
            <p className='mt-1 text-sm text-muted-foreground'>
              Current subscription snapshots ({filteredRows.length}). Grant promotional access
              through RevenueCat — not an App Store or Play purchase.
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-3'>
            <div className='relative w-full sm:w-64'>
              <Search className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder='Search user, email, package…'
                className='pl-8'
              />
            </div>
            <div className='flex items-center gap-2'>
              <Switch
                id='include-expired'
                checked={includeExpired}
                onCheckedChange={setIncludeExpired}
              />
              <Label htmlFor='include-expired' className='text-sm font-normal'>
                Include expired
              </Label>
            </div>
            <Button
              variant='outline'
              size='sm'
              disabled={loading}
              onClick={() => fetchSubscribers()}
            >
              <RefreshCw className='size-4' />
              Refresh
            </Button>
            <Button size='sm' onClick={() => setGrantOpen(true)}>
              <Plus className='size-4' />
              Grant access
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
            {rows.length === 0 ? 'No subscriptions found.' : 'No matches for your search.'}
          </p>
        ) : (
          <>
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Renew</TableHead>
                    <TableHead>Purchased</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Last event</TableHead>
                    <TableHead>Env</TableHead>
                    <TableHead className='w-[7.5rem] text-right'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map(row => {
                    const badge = statusBadgeProps(row.status)

                    return (
                      <TableRow key={row.id || row.userId || row.appUserId}>
                        <TableCell className='whitespace-normal font-medium'>
                          {row.displayName}
                        </TableCell>
                        <TableCell className='whitespace-normal text-muted-foreground'>
                          {row.email || '—'}
                        </TableCell>
                        <TableCell className='max-w-0 whitespace-normal'>
                          <p className='line-clamp-2 break-words'>{row.packageLabel}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={badge.variant} className={badge.className}>
                            {row.status || 'unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {row.willRenew == null ? '—' : row.willRenew ? 'Yes' : 'No'}
                        </TableCell>
                        <TableCell className='whitespace-nowrap text-muted-foreground'>
                          {formatDate(row.purchaseDate)}
                        </TableCell>
                        <TableCell className='whitespace-nowrap text-muted-foreground'>
                          {formatDate(row.expirationDate)}
                        </TableCell>
                        <TableCell className='whitespace-normal'>
                          {row.lastEventType || '—'}
                        </TableCell>
                        <TableCell>{row.environment || '—'}</TableCell>
                        <TableCell className='text-right'>
                          <div className='inline-flex items-center justify-end gap-1'>
                            {row.userId && String(row.productIdentifier || '').startsWith('rc_promo') ? (
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => setRevokeTarget(row)}
                              >
                                Revoke
                              </Button>
                            ) : null}
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
                          </div>
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

      <GrantSubscriptionDialog
        open={grantOpen}
        onOpenChange={setGrantOpen}
        onGranted={() => fetchSubscribers({ silent: true })}
      />

      <ConfirmDialog
        open={Boolean(revokeTarget)}
        onOpenChange={open => !open && setRevokeTarget(null)}
        title='Revoke promotional access?'
        description='This removes RevenueCat promotional entitlements. A paid App Store or Play subscription is left unchanged.'
        confirmText='Revoke'
        destructive
        onConfirm={async () => {
          await api.post('/api/subscription/revoke-promotional', {
            userId: revokeTarget.userId
          })
          await fetchSubscribers({ silent: true })
          return 'Promotional access revoked'
        }}
      />
    </>
  )
}
