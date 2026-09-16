'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Brain,
  Clock3,
  Coins,
  ExternalLink,
  Eye,
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
import { BRAND, TAB_ACTIVE_CLASS } from '@/lib/brand-colors'
import { cn } from '@/lib/utils'
import { formatDateTime, formatMoney, formatNumber } from '@/lib/format'
import DashboardHeader from '@/components/layout/dashboard-header'
import MetricCard from '@/components/dashboard/metric-card'
import { ChartCardSkeleton, MetricCardsRowSkeleton } from '@/components/dashboard/skeletons'
import { Badge } from '@/components/ui/badge'
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

const TRACE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'attention', label: 'Needs attention' },
  { value: 'crisis', label: 'Crisis' }
]

const formatCost = value => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '$0.00'
  if (num > 0 && num < 0.01) return `$${num.toFixed(4)}`
  return formatMoney(num)
}

const formatLatency = ms => {
  const value = Number(ms) || 0
  if (!value) return '—'
  if (value < 1000) return `${Math.round(value)} ms`
  return `${(value / 1000).toFixed(1)} s`
}

const shortUserId = value => {
  const text = String(value || '').trim()
  if (!text) return 'Unknown user'
  if (text.length <= 10) return text
  return `${text.slice(0, 6)}…${text.slice(-4)}`
}

const statusVariant = status => {
  if (status === 'crisis') return 'destructive'
  if (status === 'policy' || status === 'attention') return 'secondary'
  return 'outline'
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
  const [traceFilter, setTraceFilter] = useState('all')
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

  const attentionCount = recentTraces.filter(
    row => row.status && row.status !== 'normal'
  ).length
  const crisisCount = recentTraces.filter(row => row.status === 'crisis').length

  const filteredTraces = useMemo(() => {
    if (traceFilter === 'crisis') {
      return recentTraces.filter(row => row.status === 'crisis')
    }
    if (traceFilter === 'attention') {
      return recentTraces.filter(row => row.status && row.status !== 'normal')
    }
    return recentTraces
  }, [recentTraces, traceFilter])

  return (
    <>
      <DashboardHeader
        title='Trade Sense AI Analytics'
        description={`${RANGE_LABELS[dateRange] || 'Selected range'} · bot usage & conversation health`}
      />

      <main className='flex-1 space-y-6 px-4 py-4 md:px-6 md:pb-6'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div className='min-w-0 max-w-2xl'>
            <h2 className='text-xl font-semibold tracking-tight'>Bot usage overview</h2>
            <p className='mt-1 text-sm text-muted-foreground'>
              Monitor conversation volume, spend, response time, and turns that need admin attention.
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
                      ? TAB_ACTIVE_CLASS
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <Button
              variant='outline'
              size='sm'
              className='shrink-0'
              asChild
            >
              <a href={langfuseUrl} target='_blank' rel='noreferrer'>
                <ExternalLink className='size-4' />
                Langfuse
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
              <CardTitle>Analytics unavailable</CardTitle>
              <CardDescription>
                {setup?.hint ||
                  'Add LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, and LANGFUSE_BASE_URL to the backend environment.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className='text-sm text-muted-foreground'>
                Copy the Langfuse keys from the bot service into{' '}
                <code className='text-xs'>trader-365-backend/.env</code>, then restart the API.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
              <MetricCard
                title='Conversations'
                value={overview.chatTurns}
                subtitle='Chat turns in selected range'
                icon={MessageSquare}
              />
              <MetricCard
                title='Estimated spend'
                value={formatCost(overview.totalCost)}
                subtitle='LLM cost for this period'
                icon={Coins}
                format='raw'
              />
              <MetricCard
                title='Avg response time'
                value={formatLatency(overview.avgLatencyMs)}
                subtitle='Average time to complete a turn'
                icon={Clock3}
                format='raw'
              />
              <MetricCard
                title='Needs attention'
                value={attentionCount}
                subtitle={
                  crisisCount > 0
                    ? `${crisisCount} crisis · ${attentionCount - crisisCount} other flags in recent list`
                    : 'Flagged turns in the recent list below'
                }
                icon={AlertTriangle}
                accentClass={
                  attentionCount > 0
                    ? 'bg-destructive/10 text-destructive ring-1 ring-destructive/20'
                    : 'bg-muted/50 text-foreground/70 ring-1 ring-border/70'
                }
              />
            </div>

            <div className='grid gap-4 lg:grid-cols-2'>
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2 text-base'>
                    <Activity className='size-4' />
                    Daily conversations
                  </CardTitle>
                  <CardDescription>How many bot turns happened each day</CardDescription>
                </CardHeader>
                <CardContent className='h-72'>
                  {daily.length === 0 ? (
                    <div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
                      No conversations in this range yet.
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
                          name='Conversations'
                          stroke={BRAND.chart}
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
                    Daily spend
                  </CardTitle>
                  <CardDescription>Estimated LLM cost per day</CardDescription>
                </CardHeader>
                <CardContent className='h-72'>
                  {daily.length === 0 ? (
                    <div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
                      No spend data in this range yet.
                    </div>
                  ) : (
                    <ResponsiveContainer width='100%' height='100%'>
                      <BarChart data={daily}>
                        <CartesianGrid strokeDasharray='3 3' className='stroke-border/60' />
                        <XAxis dataKey='date' tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip formatter={value => formatCost(value)} />
                        <Bar dataKey='totalCost' name='Spend' fill={BRAND.chart} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className='grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]'>
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2 text-base'>
                    <Brain className='size-4' />
                    Models used
                  </CardTitle>
                  <CardDescription>Which models handled traffic</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Model</TableHead>
                        <TableHead className='text-right'>Turns</TableHead>
                        <TableHead className='text-right'>Spend</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {models.length === 0 ? (
                        <EmptyRow colSpan={3} message='No model data yet.' />
                      ) : (
                        models.map(row => (
                          <TableRow key={row.model}>
                            <TableCell className='font-medium'>{row.model}</TableCell>
                            <TableCell className='text-right'>{formatNumber(row.count)}</TableCell>
                            <TableCell className='text-right'>{formatCost(row.totalCost)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  {overview.totalTokens ? (
                    <p className='mt-4 flex items-center gap-2 text-xs text-muted-foreground'>
                      <Zap className='size-3.5' />
                      {formatNumber(overview.totalTokens)} tokens in this range
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className='gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between'>
                  <div>
                    <CardTitle className='flex items-center gap-2 text-base'>
                      <Sparkles className='size-4' />
                      Recent conversations
                    </CardTitle>
                    <CardDescription>
                      Latest Trade Sense AI turns for ops review. Open a user profile or full trace when
                      something looks off.
                    </CardDescription>
                  </div>
                  <div className='inline-flex w-fit overflow-x-auto rounded-lg border border-border/80 bg-muted/30 p-1'>
                    {TRACE_FILTERS.map(option => (
                      <button
                        key={option.value}
                        type='button'
                        onClick={() => setTraceFilter(option.value)}
                        className={cn(
                          'shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                          traceFilter === option.value
                            ? TAB_ACTIVE_CLASS
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {option.label}
                        {option.value === 'attention' && attentionCount > 0
                          ? ` (${attentionCount})`
                          : ''}
                        {option.value === 'crisis' && crisisCount > 0 ? ` (${crisisCount})` : ''}
                      </button>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className='overflow-x-auto p-0'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='pl-6'>Time</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Conversation</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className='text-right'>Response</TableHead>
                        <TableHead className='text-right'>Cost</TableHead>
                        <TableHead className='pr-6 text-right'>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTraces.length === 0 ? (
                        <EmptyRow
                          colSpan={7}
                          message={
                            recentTraces.length === 0
                              ? 'No conversations yet — activity will appear after users chat with Trade Sense AI.'
                              : 'No conversations match this filter.'
                          }
                        />
                      ) : (
                        filteredTraces.map(row => {
                          const userId = row.userId || row.sessionId
                          return (
                            <TableRow key={row.id || row.traceId}>
                              <TableCell className='pl-6 align-middle whitespace-nowrap text-muted-foreground'>
                                {formatDateTime(row.startTime)}
                              </TableCell>
                              <TableCell className='align-middle font-medium'>
                                {userId ? (
                                  <Link
                                    href={`/users/${userId}`}
                                    className='text-primary hover:underline'
                                  >
                                    {shortUserId(userId)}
                                  </Link>
                                ) : (
                                  'Unknown user'
                                )}
                              </TableCell>
                              <TableCell className='align-middle min-w-[240px] max-w-[360px]'>
                                <p className='line-clamp-2 text-sm leading-snug'>
                                  {row.userPreview || '—'}
                                </p>
                                {row.notes?.length ? (
                                  <p className='mt-1 text-xs text-muted-foreground'>
                                    {row.notes.join(' · ')}
                                  </p>
                                ) : null}
                              </TableCell>
                              <TableCell className='align-middle'>
                                <Badge variant={statusVariant(row.status)}>
                                  {row.statusLabel || 'Normal'}
                                </Badge>
                              </TableCell>
                              <TableCell className='align-middle text-right text-sm text-muted-foreground'>
                                {formatLatency(row.latencyMs)}
                              </TableCell>
                              <TableCell className='align-middle text-right text-sm'>
                                {row.totalCost > 0 ? formatCost(row.totalCost) : '—'}
                              </TableCell>
                              <TableCell className='pr-6 align-middle text-right'>
                                <div className='inline-flex gap-1'>
                                  {userId ? (
                                    <Button variant='ghost' size='icon-sm' asChild>
                                      <Link href={`/users/${userId}`} title='View user'>
                                        <Eye className='size-4' />
                                      </Link>
                                    </Button>
                                  ) : null}
                                  {row.traceUrl ? (
                                    <Button variant='ghost' size='icon-sm' asChild>
                                      <a
                                        href={row.traceUrl}
                                        target='_blank'
                                        rel='noreferrer'
                                        title='Open full trace'
                                      >
                                        <ExternalLink className='size-4' />
                                      </a>
                                    </Button>
                                  ) : null}
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
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
