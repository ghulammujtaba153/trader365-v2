'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Eye, Search, TrendingDown, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/api'
import { TablePagination, usePagination } from '@/components/common/table-pagination'
import DashboardHeader from '@/components/layout/dashboard-header'
import TradeViewDialog from '@/components/trading/trade-view-dialog'
import TradingGraph from '@/components/trading/trading-graph'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { cn } from '@/lib/utils'

const formatDate = value => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString()
  } catch {
    return '—'
  }
}

const formatPrice = value => {
  if (value == null || value === '') return '—'
  const num = Number(value)
  return Number.isFinite(num) ? num.toLocaleString() : '—'
}

const isLong = direction => String(direction || '').toLowerCase().includes('long')
const isWin = result => /win|profit|tp/i.test(String(result || ''))

export default function TradingDetailPage() {
  const { id } = useParams()
  const router = useRouter()

  const [data, setData] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedTrade, setSelectedTrade] = useState(null)
  const [viewOpen, setViewOpen] = useState(false)

  useEffect(() => {
    if (!id) return
    let mounted = true

    queueMicrotask(() => {
      const load = async () => {
        setLoading(true)
        try {
          const [tradesRes, userRes] = await Promise.all([
            api.get(`/api/trading-form/${id}`),
            api.get(`/api/auth/users/${id}`).catch(() => null)
          ])
          if (!mounted) return

          const trades = Array.isArray(tradesRes.data)
            ? tradesRes.data
            : tradesRes.data?.data || []

          setData([...trades].reverse())
          setUser(userRes?.data?.user || null)
        } catch (error) {
          if (mounted) {
            toast.error(error?.response?.data?.message || 'Failed to fetch trades')
          }
        } finally {
          if (mounted) setLoading(false)
        }
      }
      load()
    })

    return () => {
      mounted = false
    }
  }, [id])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return data
    return data.filter(row =>
      [row.stockName, row.setupName, row.tradeType, row.direction, row.result, row.emotionalState]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q))
    )
  }, [data, search])

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

  const tradeCountLabel =
    data.length > 0 ? ` · ${data.length} trade${data.length === 1 ? '' : 's'}` : ''

  return (
    <>
      <DashboardHeader
        title={user?.name || 'Trader journal'}
        description={`${user?.email || id}${tradeCountLabel}`}
      />

      <main className='flex-1 space-y-4 px-4 py-4 md:px-6 md:pb-6'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <Button variant='outline' onClick={() => router.push('/trading')}>
            <ArrowLeft className='size-4' />
            Back to traders
          </Button>
          <div className='relative w-full sm:max-w-sm'>
            <Search className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder='Search trades…'
              className='pl-8'
            />
          </div>
        </div>

        {id ? <TradingGraph userId={id} /> : null}

        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-base'>Trade log</CardTitle>
          </CardHeader>
          <CardContent className='p-0'>
            {loading ? (
              <div className='space-y-3 p-4'>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className='h-10 w-full' />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className='py-12 text-center text-sm text-muted-foreground'>
                {data.length === 0 ? 'No trades logged yet.' : 'No matches for your search.'}
              </p>
            ) : (
              <>
                <div className='overflow-x-auto'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Setup</TableHead>
                        <TableHead>Direction</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Entry</TableHead>
                        <TableHead>Exit</TableHead>
                        <TableHead className='text-right'>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedItems.map(trade => {
                        const long = isLong(trade.direction)
                        const win = isWin(trade.result)
                        return (
                          <TableRow key={trade._id}>
                            <TableCell>{formatDate(trade.tradeDate)}</TableCell>
                            <TableCell className='font-medium'>
                              {trade.stockName || '—'}
                            </TableCell>
                            <TableCell className='text-muted-foreground'>
                              {trade.tradeType || '—'}
                            </TableCell>
                            <TableCell>{trade.setupName || '—'}</TableCell>
                            <TableCell>
                              <Badge
                                variant='outline'
                                className={cn(
                                  long
                                    ? 'border-emerald-500/40 text-emerald-700'
                                    : 'border-red-500/40 text-red-700'
                                )}
                              >
                                {long ? (
                                  <TrendingUp data-icon='inline-start' />
                                ) : (
                                  <TrendingDown data-icon='inline-start' />
                                )}
                                {trade.direction || '—'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={win ? 'default' : 'outline'}
                                className={
                                  win ? 'border-transparent bg-emerald-600 text-white' : undefined
                                }
                              >
                                {trade.result || '—'}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatPrice(trade.entryPrice)}</TableCell>
                            <TableCell>{formatPrice(trade.actualExitPrice)}</TableCell>
                            <TableCell className='text-right'>
                              <Button
                                variant='ghost'
                                size='icon-sm'
                                onClick={() => {
                                  setSelectedTrade(trade)
                                  setViewOpen(true)
                                }}
                                aria-label='View trade'
                              >
                                <Eye className='size-4' />
                              </Button>
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
      </main>

      <TradeViewDialog
        open={viewOpen}
        onOpenChange={open => {
          setViewOpen(open)
          if (!open) setSelectedTrade(null)
        }}
        trade={selectedTrade}
      />
    </>
  )
}
