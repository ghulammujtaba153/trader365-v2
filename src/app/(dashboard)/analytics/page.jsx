'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BarChart3,
  Clock3,
  Globe2,
  Languages,
  LayoutGrid,
  Radio,
  Smartphone,
  TrendingUp,
  Users
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { toast } from 'sonner'

import api from '@/lib/api'
import { cn } from '@/lib/utils'
import DashboardHeader from '@/components/layout/dashboard-header'
import MetricCard from '@/components/dashboard/metric-card'
import { ChartCardSkeleton, MetricCardsRowSkeleton } from '@/components/dashboard/skeletons'
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

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'realtime', label: 'Realtime', icon: Radio },
  { id: 'events', label: 'Events', icon: BarChart3 },
  { id: 'screens', label: 'Screens', icon: Activity },
  { id: 'platforms', label: 'Platforms', icon: Smartphone },
  { id: 'geo', label: 'Geo', icon: Globe2 },
  { id: 'audience', label: 'Audience', icon: Languages }
]

const PIE_COLORS = ['#0f172a', '#334155', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0']

const pct = value => `${((Number(value) || 0) * 100).toFixed(1)}%`
const round1 = value => Number(Number(value || 0).toFixed(2))

function EmptyRow({ colSpan, message }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className='py-8 text-center text-muted-foreground'>
        {message}
      </TableCell>
    </TableRow>
  )
}

function DataTable({ columns, rows, empty }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map(col => (
            <TableHead key={col.key} className={col.align === 'right' ? 'text-right' : undefined}>
              {col.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <EmptyRow colSpan={columns.length} message={empty} />
        ) : (
          rows.map((row, index) => (
            <TableRow key={`${row[columns[0].key]}-${index}`}>
              {columns.map(col => (
                <TableCell
                  key={col.key}
                  className={cn(col.align === 'right' && 'text-right', col.bold && 'font-medium')}
                >
                  {col.format ? col.format(row[col.key], row) : row[col.key] ?? 0}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}

export default function FirebaseAnalyticsPage() {
  const [dateRange, setDateRange] = useState('week')
  const [tab, setTab] = useState('overview')
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
        const res = await api.get('/api/analytics/firebase', { params: currentDateRange })
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
  const events = analytics?.events || []
  const screens = analytics?.screens || []
  const platforms = analytics?.platforms || []
  const devices = analytics?.devices || []
  const operatingSystems = analytics?.operatingSystems || []
  const appVersions = analytics?.appVersions || []
  const countries = analytics?.countries || []
  const cities = analytics?.cities || []
  const languages = analytics?.languages || []
  const newVsReturning = analytics?.newVsReturning || []
  const channels = analytics?.channels || []
  const realtime = analytics?.realtime || { activeUsers: 0, events: [], platforms: [] }

  return (
    <>
      <DashboardHeader
        title='Firebase Analytics'
        description={`GA4 · ${analytics?.measurementId || 'G-4MNEYVFGM4'} · ${RANGE_LABELS[dateRange] || 'selected range'}`}
      />

      <main className='flex-1 space-y-6 px-4 py-4 md:px-6 md:pb-6'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between'>
          <div>
            <h2 className='text-xl font-semibold tracking-tight'>Firebase / GA4 reports</h2>
            <p className='mt-1 text-sm text-muted-foreground'>
              {analytics?.projectId || 'trader-5ceac'}
              {analytics?.propertyId ? ` · property ${analytics.propertyId}` : ''} ·{' '}
              {analytics?.range?.from || '…'} → {analytics?.range?.to || '…'}
            </p>
          </div>
          <div className='inline-flex flex-wrap rounded-xl border bg-background p-1'>
            {RANGE_OPTIONS.map(option => (
              <button
                key={option.value}
                type='button'
                onClick={() => setDateRange(option.value)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm transition-colors',
                  dateRange === option.value
                    ? 'bg-foreground font-medium text-background'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {setup ? (
          <Card className='border-amber-200 bg-amber-50/60'>
            <CardHeader>
              <CardTitle className='text-base'>Firebase Analytics setup required</CardTitle>
              <CardDescription className='text-amber-950/80'>{setup.hint}</CardDescription>
            </CardHeader>
            <CardContent className='space-y-1 text-sm text-muted-foreground'>
              <p>Measurement ID: {setup.measurementId}</p>
              <p>Firebase project: {setup.projectId}</p>
              {setup.serviceAccount ? <p>Service account: {setup.serviceAccount}</p> : null}
            </CardContent>
          </Card>
        ) : null}

        <div className='inline-flex max-w-full flex-wrap rounded-xl border bg-background p-1'>
          {TABS.map(item => {
            const Icon = item.icon
            const selected = tab === item.id
            return (
              <button
                key={item.id}
                type='button'
                onClick={() => setTab(item.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors',
                  selected
                    ? 'bg-foreground font-medium text-background'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className='size-3.5' />
                {item.label}
              </button>
            )
          })}
        </div>

        {tab === 'overview' ? (
          <div className='space-y-4'>
            {loading ? (
              <MetricCardsRowSkeleton count={4} />
            ) : (
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
                <MetricCard title='Active users' value={overview.activeUsers || 0} subtitle='activeUsers' icon={Users} />
                <MetricCard title='New users' value={overview.newUsers || 0} subtitle={RANGE_LABELS[dateRange]} icon={TrendingUp} />
                <MetricCard title='Total users' value={overview.totalUsers || 0} subtitle='totalUsers' icon={Users} />
                <MetricCard title='Realtime now' value={realtime.activeUsers || 0} subtitle='Users active now' icon={Radio} />
                <MetricCard
                  title='Sessions'
                  value={overview.sessions || 0}
                  subtitle={`${overview.engagedSessions || 0} engaged`}
                  icon={Activity}
                />
                <MetricCard
                  title='Sessions / user'
                  value={round1(overview.sessionsPerUser)}
                  subtitle='sessionsPerUser'
                  icon={Activity}
                />
                <MetricCard
                  title='Avg. session'
                  value={overview.averageSessionDuration || 0}
                  subtitle='averageSessionDuration'
                  icon={Clock3}
                  format='time'
                />
                <MetricCard
                  title='Engagement time'
                  value={overview.userEngagementDuration || 0}
                  subtitle='userEngagementDuration'
                  icon={Clock3}
                  format='time'
                />
                <MetricCard
                  title='Screen views'
                  value={overview.screenPageViews || 0}
                  subtitle={`${round1(overview.screenPageViewsPerSession)} per session`}
                  icon={BarChart3}
                />
                <MetricCard
                  title='Events'
                  value={overview.eventCount || 0}
                  subtitle={`${round1(overview.eventsPerSession)} per session`}
                  icon={Activity}
                />
                <MetricCard
                  title='Engagement rate'
                  value={pct(overview.engagementRate)}
                  subtitle={`Bounce ${pct(overview.bounceRate)}`}
                  icon={TrendingUp}
                />
                <MetricCard
                  title='Stickiness'
                  value={pct(overview.dauPerMau)}
                  subtitle={`WAU/MAU ${pct(overview.wauPerMau)}`}
                  icon={Users}
                />
              </div>
            )}

            {loading ? (
              <ChartCardSkeleton height={320} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Daily trend</CardTitle>
                  <CardDescription>Users, sessions, events, and screen views</CardDescription>
                </CardHeader>
                <CardContent className='h-[320px]'>
                  {daily.length === 0 ? (
                    <p className='py-16 text-center text-sm text-muted-foreground'>No daily rows yet.</p>
                  ) : (
                    <ResponsiveContainer width='100%' height='100%'>
                      <LineChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray='3 3' vertical={false} />
                        <XAxis dataKey='date' tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Line type='monotone' dataKey='activeUsers' stroke='#0f172a' strokeWidth={2} dot={false} name='Active users' />
                        <Line type='monotone' dataKey='newUsers' stroke='#334155' strokeWidth={2} dot={false} name='New users' />
                        <Line type='monotone' dataKey='sessions' stroke='#64748b' strokeWidth={2} dot={false} name='Sessions' />
                        <Line type='monotone' dataKey='eventCount' stroke='#94a3b8' strokeWidth={2} dot={false} name='Events' />
                        <Line type='monotone' dataKey='screenPageViews' stroke='#cbd5e1' strokeWidth={2} dot={false} name='Screens' />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}

        {tab === 'realtime' ? (
          loading ? (
            <ChartCardSkeleton height={240} />
          ) : (
            <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
              <Card className='xl:col-span-2'>
                <CardHeader>
                  <CardTitle>Users active now</CardTitle>
                  <CardDescription>Realtime activeUsers</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className='text-3xl font-semibold tracking-tight'>{realtime.activeUsers || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Realtime events</CardTitle>
                  <CardDescription>Last 30 minutes</CardDescription>
                </CardHeader>
                <CardContent className='p-0'>
                  <DataTable
                    empty='No realtime events.'
                    columns={[
                      { key: 'eventName', label: 'Event', bold: true },
                      { key: 'eventCount', label: 'Count', align: 'right' }
                    ]}
                    rows={realtime.events || []}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Realtime platforms</CardTitle>
                  <CardDescription>Active users by platform right now</CardDescription>
                </CardHeader>
                <CardContent className='p-0'>
                  <DataTable
                    empty='No realtime platform data.'
                    columns={[
                      { key: 'platform', label: 'Platform', bold: true },
                      { key: 'activeUsers', label: 'Users', align: 'right' }
                    ]}
                    rows={realtime.platforms || []}
                  />
                </CardContent>
              </Card>
            </div>
          )
        ) : null}

        {tab === 'events' ? (
          loading ? (
            <ChartCardSkeleton height={360} />
          ) : (
            <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
              <Card>
                <CardHeader>
                  <CardTitle>Top events</CardTitle>
                  <CardDescription>eventName by eventCount</CardDescription>
                </CardHeader>
                <CardContent className='h-[360px]'>
                  {events.length === 0 ? (
                    <p className='py-16 text-center text-sm text-muted-foreground'>No events yet.</p>
                  ) : (
                    <ResponsiveContainer width='100%' height='100%'>
                      <BarChart
                        data={events.slice(0, 15)}
                        layout='vertical'
                        margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray='3 3' horizontal={false} />
                        <XAxis type='number' />
                        <YAxis type='category' dataKey='eventName' width={130} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey='eventCount' fill='#0f172a' radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Event table</CardTitle>
                  <CardDescription>All tracked Firebase events in range</CardDescription>
                </CardHeader>
                <CardContent className='max-h-[360px] overflow-auto p-0'>
                  <DataTable
                    empty='No events in this range.'
                    columns={[
                      { key: 'eventName', label: 'Event', bold: true },
                      { key: 'eventCount', label: 'Count', align: 'right' },
                      { key: 'totalUsers', label: 'Users', align: 'right' },
                      {
                        key: 'eventCountPerUser',
                        label: 'Per user',
                        align: 'right',
                        format: v => round1(v)
                      }
                    ]}
                    rows={events}
                  />
                </CardContent>
              </Card>
            </div>
          )
        ) : null}

        {tab === 'screens' ? (
          loading ? (
            <ChartCardSkeleton height={360} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Screen views</CardTitle>
                <CardDescription>unifiedScreenName from Firebase Analytics</CardDescription>
              </CardHeader>
              <CardContent className='p-0'>
                <DataTable
                  empty='No screen views. Ensure screen_view tracking is enabled in the app.'
                  columns={[
                    { key: 'screen', label: 'Screen', bold: true },
                    { key: 'screenPageViews', label: 'Views', align: 'right' },
                    { key: 'totalUsers', label: 'Users', align: 'right' },
                    { key: 'eventCount', label: 'Events', align: 'right' },
                    {
                      key: 'userEngagementDuration',
                      label: 'Engagement (s)',
                      align: 'right',
                      format: v => Math.round(v || 0)
                    }
                  ]}
                  rows={screens}
                />
              </CardContent>
            </Card>
          )
        ) : null}

        {tab === 'platforms' ? (
          loading ? (
            <ChartCardSkeleton height={320} />
          ) : (
            <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
              <Card>
                <CardHeader>
                  <CardTitle>Platform</CardTitle>
                  <CardDescription>iOS · Android · Web</CardDescription>
                </CardHeader>
                <CardContent className='h-[300px]'>
                  {platforms.length === 0 ? (
                    <p className='py-16 text-center text-sm text-muted-foreground'>No platform data.</p>
                  ) : (
                    <ResponsiveContainer width='100%' height='100%'>
                      <BarChart data={platforms} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray='3 3' vertical={false} />
                        <XAxis dataKey='platform' />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey='activeUsers' fill='#0f172a' radius={[6, 6, 0, 0]} name='Users' />
                        <Bar dataKey='sessions' fill='#94a3b8' radius={[6, 6, 0, 0]} name='Sessions' />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Device category</CardTitle>
                  <CardDescription>mobile · desktop · tablet</CardDescription>
                </CardHeader>
                <CardContent className='h-[300px]'>
                  {devices.length === 0 ? (
                    <p className='py-16 text-center text-sm text-muted-foreground'>No device data.</p>
                  ) : (
                    <ResponsiveContainer width='100%' height='100%'>
                      <PieChart>
                        <Pie
                          data={devices}
                          dataKey='activeUsers'
                          nameKey='device'
                          innerRadius={56}
                          outerRadius={92}
                          paddingAngle={2}
                        >
                          {devices.map((_, index) => (
                            <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Platform table</CardTitle>
                </CardHeader>
                <CardContent className='p-0'>
                  <DataTable
                    empty='No platform rows.'
                    columns={[
                      { key: 'platform', label: 'Platform', bold: true },
                      { key: 'activeUsers', label: 'Users', align: 'right' },
                      { key: 'newUsers', label: 'New', align: 'right' },
                      { key: 'sessions', label: 'Sessions', align: 'right' },
                      { key: 'eventCount', label: 'Events', align: 'right' },
                      { key: 'screenPageViews', label: 'Screens', align: 'right' }
                    ]}
                    rows={platforms}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Operating systems</CardTitle>
                </CardHeader>
                <CardContent className='p-0'>
                  <DataTable
                    empty='No OS data.'
                    columns={[
                      { key: 'os', label: 'OS', bold: true },
                      { key: 'activeUsers', label: 'Users', align: 'right' },
                      { key: 'sessions', label: 'Sessions', align: 'right' },
                      { key: 'eventCount', label: 'Events', align: 'right' }
                    ]}
                    rows={operatingSystems}
                  />
                </CardContent>
              </Card>
              <Card className='xl:col-span-2'>
                <CardHeader>
                  <CardTitle>App versions</CardTitle>
                  <CardDescription>activeUsers by appVersion</CardDescription>
                </CardHeader>
                <CardContent className='p-0'>
                  <DataTable
                    empty='No app version data (common for web-only streams).'
                    columns={[
                      { key: 'version', label: 'Version', bold: true },
                      { key: 'activeUsers', label: 'Users', align: 'right' },
                      { key: 'sessions', label: 'Sessions', align: 'right' },
                      { key: 'eventCount', label: 'Events', align: 'right' }
                    ]}
                    rows={appVersions}
                  />
                </CardContent>
              </Card>
            </div>
          )
        ) : null}

        {tab === 'geo' ? (
          loading ? (
            <ChartCardSkeleton height={360} />
          ) : (
            <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
              <Card>
                <CardHeader>
                  <CardTitle>Countries</CardTitle>
                </CardHeader>
                <CardContent className='p-0'>
                  <DataTable
                    empty='No country data.'
                    columns={[
                      { key: 'country', label: 'Country', bold: true },
                      { key: 'activeUsers', label: 'Users', align: 'right' },
                      { key: 'sessions', label: 'Sessions', align: 'right' },
                      { key: 'eventCount', label: 'Events', align: 'right' }
                    ]}
                    rows={countries}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Cities</CardTitle>
                </CardHeader>
                <CardContent className='p-0'>
                  <DataTable
                    empty='No city data.'
                    columns={[
                      { key: 'city', label: 'City', bold: true },
                      { key: 'activeUsers', label: 'Users', align: 'right' },
                      { key: 'sessions', label: 'Sessions', align: 'right' },
                      { key: 'eventCount', label: 'Events', align: 'right' }
                    ]}
                    rows={cities}
                  />
                </CardContent>
              </Card>
            </div>
          )
        ) : null}

        {tab === 'audience' ? (
          loading ? (
            <ChartCardSkeleton height={280} />
          ) : (
            <div className='grid grid-cols-1 gap-4 xl:grid-cols-3'>
              <Card>
                <CardHeader>
                  <CardTitle>New vs returning</CardTitle>
                </CardHeader>
                <CardContent className='p-0'>
                  <DataTable
                    empty='No new/returning split yet.'
                    columns={[
                      { key: 'type', label: 'Type', bold: true },
                      { key: 'activeUsers', label: 'Users', align: 'right' },
                      { key: 'sessions', label: 'Sessions', align: 'right' }
                    ]}
                    rows={newVsReturning}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Languages</CardTitle>
                </CardHeader>
                <CardContent className='p-0'>
                  <DataTable
                    empty='No language data.'
                    columns={[
                      { key: 'language', label: 'Language', bold: true },
                      { key: 'activeUsers', label: 'Users', align: 'right' },
                      { key: 'sessions', label: 'Sessions', align: 'right' }
                    ]}
                    rows={languages}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Traffic channels</CardTitle>
                  <CardDescription>sessionDefaultChannelGroup</CardDescription>
                </CardHeader>
                <CardContent className='p-0'>
                  <DataTable
                    empty='No channel data.'
                    columns={[
                      { key: 'channel', label: 'Channel', bold: true },
                      { key: 'activeUsers', label: 'Users', align: 'right' },
                      { key: 'sessions', label: 'Sessions', align: 'right' }
                    ]}
                    rows={channels}
                  />
                </CardContent>
              </Card>
            </div>
          )
        ) : null}
      </main>
    </>
  )
}
