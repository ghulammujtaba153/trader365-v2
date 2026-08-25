'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  Brain,
  Clock3,
  Coins,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Zap
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { toast } from 'sonner'

import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { formatDateTime, formatMoney, formatNumber } from '@/lib/format'
import DashboardHeader from '@/components/layout/dashboard-header'
import MetricCard from '@/components/dashboard/metric-card'
import { ChartCardSkeleton, MetricCardsRowSkeleton } from '@/components/dashboard/skeletons'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'

const RANGE_LABELS = {
  today: 'Today',
  week: 'This week',
  month: 'This month',
  custom: 'Last 3 months'
}

const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Last 3 Months' }
]

const formatCost = value => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '$0.00'
  if (num > 0 && num < 0.01) return `$${num.toFixed(4)}`
  return formatMoney(num)
}

const formatLatency = ms => {
  const value = Number(ms) || 0
  if (value < 1000) return `${Math.round(value)} ms`
  return `${(value / 1000).toFixed(1)} s`
}

function EmptyRow({ colSpan, message }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className='py-8 text-center text-muted-foreground'>
        {message}
      </TableCell>
    </TableRow>
  )
}

export default function BotAnalyticsPage() {
  const [dateRange, setDateRange] = useState('week')
  const [analytics, setAnalytics] = useState(null)
  const [setup, setSetup] = useState(null)
  const [loading, setLoading] = useState(true)

  const currentDateRange = useMemo(() => {
    const now = new Date()
    const from = new Date()
    switch (dateRange) {
      case 'today':
        from.setHours(0, 0, 0, 0)
        break
      case 'week':
        from.setDate(now.getDate() - 7)
        break
      case 'month':
        from.setMonth(now.getMonth() - 1)
        break
      case 'custom':
        from.setMonth(now.getMonth() - 3)
        break
      default:
        from.setDate(now.getDate() - 7)
    }
    return { from: from.toISOString(), to: now.toISOString() }
  }, [dateRange])

  useEffect(() => {
    let mounted = true
    const fetchAll = async () => {
      setLoading(true)
      setSetup(null)
      try {
        const res = await api.get('/api/analytics/langfuse', { params: currentDateRange })
        if (!mounted) return
        setAnalytics(res.data)
      } catch (error) {
        if (!mounted) return
        setAnalytics(null)
        setSetup(error.response?.data?.setup || null)
        toast.error(error.response?.data?.message || error.message)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchAll()
    return () => {
      mounted = false
    }
  }, [currentDateRange])

  const overview = analytics?.overview || {}
  const daily = analytics?.daily || []
  const models = analytics?.models || []
  const recentTraces = analytics?.recentTraces || []
  const langfuseUrl = analytics?.baseUrl || setup?.baseUrl || 'https://cloud.langfuse.com'

  return (
    <>
      <DashboardHeader
        title='Trade Sense AI Analytics'
        description={`Langfuse · ${analytics?.traceName || 'trade-sense-chat'} · ${RANGE_LABELS[dateRange] || 'selected range'}`}
      />

      <main className='flex-1 space-y-6 px-4 py-4 md:px-6 md:pb-6'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div className='min-w-0 max-w-2xl'>
            <h2 className='text-xl font-semibold tracking-tight'>Bot tracing & usage</h2>
            <p className='mt-1 text-sm text-muted-foreground'>
              Chat turns, latency, token usage, and cost from Langfuse Cloud.
            </p>
          </div>

          <div className='flex shrink-0 flex-row flex-wrap items-center gap-2'>
            <div className='inline-flex w-fit max-w-full overflow-x-auto rounded-lg border border-border/80 bg-muted/30 p-1'>
              {RANGE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type='button'
                  onClick={() => setDateRange(option.value)}
                  className={cn(
                    'shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    dateRange === option.value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <Button variant='outline' size='sm' className='shrink-0' asChild>
              <a href={langfuseUrl} target='_blank' rel='noreferrer'>
                <ExternalLink className='size-4' />
                Open Langfuse
              </a>
            </Button>
          </div>
        </div>

        {loading ? (
          <>
            <MetricCardsRowSkeleton count={4} />
            <div className='grid gap-4 lg:grid-cols-2'>
              <ChartCardSkeleton />
              <ChartCardSkeleton />
            </div>
          </>
        ) : !analytics ? (
          <Card>
            <CardHeader>
              <CardTitle>Langfuse not configured</CardTitle>
              <CardDescription>
                {setup?.hint ||
                  'Add LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, and LANGFUSE_BASE_URL to the backend environment.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className='text-sm text-muted-foreground'>
                Use the same three values as in <code className='text-xs'>trader-ai-bot-main/.env</code>.
                Restart the backend after updating <code className='text-xs'>trader-365-backend/.env</code>.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
              <MetricCard
                title='Chat turns'
                value={overview.chatTurns}
                subtitle='Root traces named trade-sense-chat'
                icon={MessageSquare}
              />
              <MetricCard
                title='Estimated cost'
                value={formatCost(overview.totalCost)}
                subtitle='Sum of observation cost in range'
                icon={Coins}
                format='raw'
              />
              <MetricCard
                title='Avg latency'
                value={formatLatency(overview.avgLatencyMs)}
                subtitle='Per chat turn'
                icon={Clock3}
                format='raw'
              />
              <MetricCard
                title='Total tokens'
                value={overview.totalTokens}
                subtitle={`${formatNumber(overview.allObservations || 0)} total observations · ${formatNumber(overview.generations || 0)} generations`}
                icon={Zap}
              />
            </div>

            <div className='grid gap-4 lg:grid-cols-2'>
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2 text-base'>
                    <Activity className='size-4' />
                    Daily chat volume
                  </CardTitle>
                  <CardDescription>Root chat traces per day</CardDescription>
                </CardHeader>
                <CardContent className='h-72'>
                  {daily.length === 0 ? (
                    <div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
                      No chat traces in this range yet.
                    </div>
                  ) : (
                    <ResponsiveContainer width='100%' height='100%'>
                      <LineChart data={daily}>
                        <CartesianGrid strokeDasharray='3 3' className='stroke-border/60' />
                        <XAxis dataKey='date' tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line
                          type='monotone'
                          dataKey='chatTurns'
                          name='Chat turns'
                          stroke='#0f172a'
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2 text-base'>
                    <Coins className='size-4' />
                    Daily cost
                  </CardTitle>
                  <CardDescription>Estimated LLM spend per day</CardDescription>
                </CardHeader>
                <CardContent className='h-72'>
                  {daily.length === 0 ? (
                    <div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
                      No cost data in this range yet.
                    </div>
                  ) : (
                    <ResponsiveContainer width='100%' height='100%'>
                      <BarChart data={daily}>
                        <CartesianGrid strokeDasharray='3 3' className='stroke-border/60' />
                        <XAxis dataKey='date' tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip formatter={value => formatCost(value)} />
                        <Bar dataKey='totalCost' name='Cost' fill='#059669' radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className='grid gap-4 lg:grid-cols-2'>
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2 text-base'>
                    <Brain className='size-4' />
                    By model
                  </CardTitle>
                  <CardDescription>Usage and cost breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Model</TableHead>
                        <TableHead className='text-right'>Turns</TableHead>
                        <TableHead className='text-right'>Cost</TableHead>
                        <TableHead className='text-right'>Avg latency</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {models.length === 0 ? (
                        <EmptyRow colSpan={4} message='No model breakdown yet.' />
                      ) : (
                        models.map(row => (
                          <TableRow key={row.model}>
                            <TableCell className='font-medium'>{row.model}</TableCell>
                            <TableCell className='text-right'>{formatNumber(row.count)}</TableCell>
                            <TableCell className='text-right'>{formatCost(row.totalCost)}</TableCell>
                            <TableCell className='text-right'>
                              {formatLatency(row.avgLatencyMs)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2 text-base'>
                    <Sparkles className='size-4' />
                    Recent chat traces
                  </CardTitle>
                  <CardDescription>Latest Trade Sense AI turns in Langfuse</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead className='text-right'>Latency</TableHead>
                        <TableHead className='text-right'>Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentTraces.length === 0 ? (
                        <EmptyRow colSpan={4} message='No traces yet — send a message in Trade Sense AI.' />
                      ) : (
                        recentTraces.map(row => (
                          <TableRow key={row.id || row.traceId}>
                            <TableCell className='whitespace-nowrap text-xs'>
                              {formatDateTime(row.startTime)}
                            </TableCell>
                            <TableCell className='max-w-[140px] truncate text-xs'>
                              {row.userId || row.sessionId || '—'}
                            </TableCell>
                            <TableCell className='text-right text-xs'>
                              {row.latencyMs != null ? formatLatency(row.latencyMs) : '—'}
                            </TableCell>
                            <TableCell className='text-right text-xs'>
                              {formatCost(row.totalCost)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </>
  )
}
