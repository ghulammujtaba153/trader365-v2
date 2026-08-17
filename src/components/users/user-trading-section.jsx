'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, TrendingDown, TrendingUp } from 'lucide-react'

import api from '@/lib/api'
import TradingGraph from '@/components/trading/trading-graph'
import { asArray } from '@/components/users/user-profile-utils'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { formatDate, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'

const isLong = direction => /long|buy/i.test(String(direction || ''))
const isWin = result => /win|profit|tp/i.test(String(result || ''))

export default function UserTradingSection({ userId }) {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [insight, setInsight] = useState(null)
  const [trades, setTrades] = useState([])

  useEffect(() => {
    if (!userId) return
    let mounted = true

    queueMicrotask(() => {
      const load = async () => {
        setLoading(true)
        try {
          const [summaryRes, insightRes, tradesRes] = await Promise.allSettled([
            api.get(`/api/trading-form/graph/${userId}/summary`, {
              params: { duration: 'all time' }
            }),
            api.get(`/api/trading-form/graph/${userId}/insight-summary`, {
              params: { duration: 'all time' }
            }),
            api.get(`/api/trading-form/${userId}`)
          ])
          if (!mounted) return
          setSummary(
            summaryRes.status === 'fulfilled'
              ? summaryRes.value.data?.data || summaryRes.value.data
              : null
          )
          setInsight(
            insightRes.status === 'fulfilled'
              ? insightRes.value.data?.data || insightRes.value.data
              : null
          )
          setTrades(
            tradesRes.status === 'fulfilled' ? asArray(tradesRes.value.data) : []
          )
        } finally {
          if (mounted) setLoading(false)
        }
      }
      load()
    })

    return () => {
      mounted = false
    }
  }, [userId])

  const recent = useMemo(
    () =>
      [...trades]
        .sort((a, b) => new Date(b.tradeDate || b.createdAt) - new Date(a.tradeDate || a.createdAt))
        .slice(0, 8),
    [trades]
  )

  return (
    <section className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div>
          <h3 className='text-lg font-semibold tracking-tight'>Trading performance</h3>
          <p className='text-sm text-muted-foreground'>
            Journal KPIs, risk, and the latest trades for this account
          </p>
        </div>
        <Link href={`/trading/${userId}`} className={buttonVariants({ variant: 'outline' })}>
          Open full journal
          <ExternalLink className='size-4' />
        </Link>
      </div>

      {loading ? (
        <Skeleton className='h-28 w-full' />
      ) : (
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'>
          <div className='rounded-xl border p-3'>
            <p className='text-xs text-muted-foreground'>Total trades</p>
            <p className='mt-1 text-lg font-semibold'>{summary?.totalTrades || 0}</p>
          </div>
          <div className='rounded-xl border p-3'>
            <p className='text-xs text-muted-foreground'>Win rate</p>
            <p className='mt-1 text-lg font-semibold'>{summary?.winRate || 0}%</p>
          </div>
          <div className='rounded-xl border p-3'>
            <p className='text-xs text-muted-foreground'>Avg P&L / trade</p>
            <p className='mt-1 text-lg font-semibold'>{formatMoney(summary?.avgProfitPerTrade)}</p>
          </div>
          <div className='rounded-xl border p-3'>
            <p className='text-xs text-muted-foreground'>Max drawdown</p>
            <p className='mt-1 text-lg font-semibold'>{summary?.maxDrawdownPct || 0}%</p>
          </div>
        </div>
      )}

      {insight?.winRateText || insight?.avgRiskPerTradeText ? (
        <div className='grid gap-3 md:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Win-rate insight</CardTitle>
              <CardDescription>
                Zone {insight.winRateZone || '—'} · {insight.winRate || 0}%
              </CardDescription>
            </CardHeader>
            <CardContent className='text-sm text-muted-foreground'>
              {insight.winRateText || 'Not enough trades for insight.'}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Risk insight</CardTitle>
              <CardDescription>
                Zone {insight.avgRiskPerTradeZone || '—'} · {insight.avgRiskPerTradePct || 0}% avg risk
              </CardDescription>
            </CardHeader>
            <CardContent className='text-sm text-muted-foreground'>
              {insight.avgRiskPerTradeText || 'Not enough trades for insight.'}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <TradingGraph userId={userId} />

      <Card>
        <CardHeader>
          <CardTitle>Recent trades</CardTitle>
          <CardDescription>Latest 8 journal entries</CardDescription>
        </CardHeader>
        <CardContent className='p-0'>
          {loading ? (
            <div className='space-y-2 px-6 pb-6'>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className='h-10 w-full' />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <p className='px-6 py-8 text-center text-sm text-muted-foreground'>No trades logged</p>
          ) : (
            <div className='overflow-x-auto px-6 pb-6'>
              <div className='rounded-xl border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Setup</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Emotion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recent.map(trade => {
                      const long = isLong(trade.direction)
                      const win = isWin(trade.result)
                      return (
                        <TableRow key={trade._id}>
                          <TableCell>{formatDate(trade.tradeDate)}</TableCell>
                          <TableCell className='font-medium'>{trade.stockName || '—'}</TableCell>
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
                              className={win ? 'border-transparent bg-emerald-600 text-white' : undefined}
                            >
                              {trade.result || '—'}
                            </Badge>
                          </TableCell>
                          <TableCell className='text-muted-foreground'>
                            {trade.emotionalState || '—'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
