'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Clock, Eye, NotebookPen, Search, TimerOff } from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/api'
import { formatLabel, formatRelativeTime } from '@/lib/format'
import { TablePagination, usePagination } from '@/components/common/table-pagination'
import DashboardHeader from '@/components/layout/dashboard-header'
import MetricCard from '@/components/dashboard/metric-card'
import { MetricCardsRowSkeleton } from '@/components/dashboard/skeletons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

const lastTradeMs = trader => {
  if (!trader.lastTradeAt) return 0
  const time = new Date(trader.lastTradeAt).getTime()
  return Number.isNaN(time) ? 0 : time
}

const isInactiveJournal = trader => {
  if (!trader.tradeCount) return false
  const last = lastTradeMs(trader)
  return !last || Date.now() - last >= SEVEN_DAYS_MS
}

const FILTERS = [
  {
    id: 'all',
    title: 'All traders',
    subtitle: 'App accounts',
    icon: NotebookPen,
    match: () => true
  },
  {
    id: 'inactive',
    title: 'Idle 7d+',
    subtitle: 'Journaled, then went quiet',
    icon: Clock,
    match: isInactiveJournal
  },
  {
    id: 'none',
    title: 'No trades',
    subtitle: 'Never journaled',
    icon: TimerOff,
    match: trader => !trader.tradeCount
  },
  {
    id: 'active',
    title: 'Journaling',
    subtitle: 'Traded in 7 days',
    icon: NotebookPen,
    match: trader => Boolean(trader.tradeCount) && !isInactiveJournal(trader)
  }
]

const statusBadgeClass = status => {
  const s = String(status || '').toLowerCase()
  if (s === 'active') return 'border-transparent bg-emerald-600 text-white'
  if (s === 'suspended' || s === 'inactive') {
    return 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300'
  }
  return ''
}

export default function TradingPage() {
  return (
    <Suspense
      fallback={
        <>
          <DashboardHeader
            title='Trading'
            description='Who is journaling, who went quiet, and who to open for coaching.'
          />
          <main className='flex-1 space-y-4 px-4 py-4 md:px-6 md:pb-6'>
            <MetricCardsRowSkeleton count={4} />
          </main>
        </>
      }
    >
      <TradingPageContent />
    </Suspense>
  )
}

function TradingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedFilter = searchParams.get('filter') || 'all'
  const [search, setSearch] = useState('')
  const [traders, setTraders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState(
    FILTERS.some(item => item.id === requestedFilter) ? requestedFilter : 'all'
  )

  const fetchTraders = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/trading-form/admin/overview')
      setTraders(res.data.traders || [])
    } catch {
      toast.error('Failed to load traders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      fetchTraders()
    })
  }, [])

  useEffect(() => {
    if (FILTERS.some(item => item.id === requestedFilter)) setFilter(requestedFilter)
  }, [requestedFilter])

  const applyFilter = id => {
    setFilter(id)
    router.replace(id === 'all' ? '/trading' : `/trading?filter=${id}`, { scroll: false })
  }

  const counts = useMemo(() => {
    const next = {}
    for (const item of FILTERS) next[item.id] = traders.filter(item.match).length
    return next
  }, [traders])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const matcher = FILTERS.find(item => item.id === filter)?.match || (() => true)
    return traders.filter(trader => {
      if (!matcher(trader)) return false
      if (!q) return true
      return (
        trader.name?.toLowerCase().includes(q) ||
        trader.email?.toLowerCase().includes(q)
      )
    })
  }, [traders, search, filter])

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
  } = usePagination(filtered, 10)

  return (
    <>
      <DashboardHeader
        title='Trading'
        description='Who is journaling, who went quiet, and who to open for coaching.'
      />

      <main className='flex-1 space-y-4 px-4 py-4 md:px-6 md:pb-6'>
        <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
          {FILTERS.map(item => {
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

        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='relative w-full sm:max-w-sm'>
            <Search className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder='Search name or email…'
              className='pl-8'
            />
          </div>
          <p className='text-sm text-muted-foreground'>
            {filtered.length} of {traders.length} traders
          </p>
        </div>

        <Card>
          <CardContent className='p-0'>
            {loading ? (
              <div className='space-y-3 p-4'>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className='h-10 w-full' />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className='py-12 text-center text-sm text-muted-foreground'>
                {traders.length === 0 ? 'No traders yet.' : 'No matches for this filter.'}
              </p>
            ) : (
              <>
                <div className='overflow-x-auto'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Trades</TableHead>
                        <TableHead>Win rate</TableHead>
                        <TableHead>Last trade</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className='text-right'>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedItems.map(trader => (
                        <TableRow key={trader._id}>
                          <TableCell className='font-medium'>{trader.name || '—'}</TableCell>
                          <TableCell className='text-muted-foreground'>{trader.email || '—'}</TableCell>
                          <TableCell>{trader.tradeCount || 0}</TableCell>
                          <TableCell>
                            {trader.tradeCount ? `${trader.winRate}%` : '—'}
                          </TableCell>
                          <TableCell>{formatRelativeTime(trader.lastTradeAt)}</TableCell>
                          <TableCell>
                            <Badge variant='outline' className={cn(statusBadgeClass(trader.status))}>
                              {formatLabel(trader.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className='text-right'>
                            <Button
                              variant='ghost'
                              size='icon-sm'
                              onClick={() => router.push(`/trading/${trader._id}`)}
                              aria-label='View trading'
                            >
                              <Eye className='size-4' />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
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
      </main>
    </>
  )
}
