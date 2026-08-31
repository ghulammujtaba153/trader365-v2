'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { toast } from 'sonner'

import api from '@/lib/api'
import { BRAND } from '@/lib/brand-colors'
import { ChartCardSkeleton, MetricCardSkeleton } from '@/components/dashboard/skeletons'
import MetricCard from '@/components/dashboard/metric-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Percent, ThumbsDown, ThumbsUp, Wallet } from 'lucide-react'

const formatMoney = value =>
  `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`

const formatChartDate = value => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function TradingGraph({ userId }) {
  const [loading, setLoading] = useState(true)
  const [points, setPoints] = useState([])

  useEffect(() => {
    if (!userId) return
    let mounted = true

    queueMicrotask(() => {
      const fetchGraph = async () => {
        setLoading(true)
        try {
          const res = await api.get(
            `/api/trading-form/graph/${userId}?duration=${encodeURIComponent('all time')}`
          )
          if (!mounted) return
          const raw = Array.isArray(res.data)
            ? res.data
            : Array.isArray(res.data?.data)
              ? res.data.data
              : []
          setPoints(raw)
        } catch (err) {
          if (mounted) {
            setPoints([])
            toast.error(err?.response?.data?.message || 'Failed to fetch trading data')
          }
        } finally {
          if (mounted) setLoading(false)
        }
      }
      fetchGraph()
    })

    return () => {
      mounted = false
    }
  }, [userId])

  const chartRows = useMemo(() => {
    const sorted = [...points].sort((a, b) => new Date(a.date) - new Date(b.date))
    let cumulative = 0
    return sorted.map(item => {
      const daily = Number(item.amount) || 0
      cumulative += daily
      return {
        date: item.date,
        label: formatChartDate(item.date),
        daily: Number(daily.toFixed(2)),
        cumulative: Number(cumulative.toFixed(2))
      }
    })
  }, [points])

  const stats = useMemo(() => {
    const totalPnL = points.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
    const winningDays = points.filter(item => Number(item.amount) > 0).length
    const losingDays = points.filter(item => Number(item.amount) < 0).length
    const decided = winningDays + losingDays
    const winRate = decided > 0 ? ((winningDays / decided) * 100).toFixed(1) : '0'
    return { totalPnL, winningDays, losingDays, winRate }
  }, [points])

  if (loading) {
    return (
      <section className='space-y-4'>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
          {[0, 1, 2, 3].map(i => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>
        <ChartCardSkeleton height={360} />
      </section>
    )
  }

  return (
    <section className='space-y-4'>
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <MetricCard
          title='Total P&L'
          value={formatMoney(stats.totalPnL)}
          subtitle='All-time net'
          icon={Wallet}
          format='raw'
          accentClass={
            stats.totalPnL >= 0
              ? 'bg-emerald-500/10 text-emerald-700'
              : 'bg-red-500/10 text-red-700'
          }
        />
        <MetricCard
          title='Winning days'
          value={stats.winningDays}
          subtitle='Days with profit'
          icon={ThumbsUp}
          accentClass='bg-emerald-500/10 text-emerald-700'
        />
        <MetricCard
          title='Losing days'
          value={stats.losingDays}
          subtitle='Days with loss'
          icon={ThumbsDown}
          accentClass='bg-red-500/10 text-red-700'
        />
        <MetricCard
          title='Win rate'
          value={`${stats.winRate}%`}
          subtitle='Winning ÷ decided days'
          icon={Percent}
          format='raw'
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance</CardTitle>
          <CardDescription>
            {points.length} plotted point{points.length === 1 ? '' : 's'} · Win rate {stats.winRate}%
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartRows.length === 0 ? (
            <div className='grid h-72 place-items-center rounded-xl border border-dashed bg-muted/30 px-4 text-center'>
              <div>
                <p className='font-semibold'>No trading performance data yet</p>
                <p className='mt-1 text-sm text-muted-foreground'>
                  Trades with P&L will appear on this chart.
                </p>
              </div>
            </div>
          ) : (
            <div className='h-96'>
              <ResponsiveContainer width='100%' height='100%'>
                <LineChart data={chartRows}>
                  <CartesianGrid strokeDasharray='3 3' className='stroke-border' />
                  <XAxis
                    dataKey='label'
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tickFormatter={v => `$${Number(v).toFixed(0)}`}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      formatMoney(value),
                      name === 'cumulative' ? 'Cumulative P&L' : 'Daily P&L'
                    ]}
                    labelFormatter={(_, payload) => {
                      const raw = payload?.[0]?.payload?.date
                      if (!raw) return ''
                      const d = new Date(raw)
                      return Number.isNaN(d.getTime())
                        ? String(raw)
                        : d.toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
                    }}
                  />
                  <Legend />
                  <Line
                    type='monotone'
                    dataKey='cumulative'
                    name='Cumulative P&L'
                    stroke={BRAND.chart}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type='monotone'
                    dataKey='daily'
                    name='Daily P&L'
                    stroke='#E05A5A'
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
