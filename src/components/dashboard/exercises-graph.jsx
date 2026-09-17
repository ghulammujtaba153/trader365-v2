'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { CheckCircle2, Flag, TrendingUp, Users } from 'lucide-react'

import api from '@/lib/api'
import { BRAND } from '@/lib/brand-colors'
import MetricCard from '@/components/dashboard/metric-card'
import { ChartCardSkeleton, MetricCardSkeleton } from '@/components/dashboard/skeletons'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { asArray } from '@/components/users/user-profile-utils'

const EMPTY = {
  totals: {
    completions: 0,
    starts: 0,
    abandoned: 0,
    missed: 0,
    uniqueUsers: 0,
    completionRate: 0
  },
  byExercise: [],
  byDay: []
}

function formatDayLabel(dateKey) {
  if (!dateKey) return ''
  const parsed = new Date(`${dateKey}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) return dateKey
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  })
}

export default function ExercisesGraph({ dateRange }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(EMPTY)

  useEffect(() => {
    let mounted = true
    const fetchStats = async () => {
      setLoading(true)
      try {
        const res = await api.get('/api/therapy-exercises/admin/stats', {
          params: {
            from: dateRange?.from,
            to: dateRange?.to
          }
        })
        if (!mounted) return
        const payload = res.data || {}
        setData({
          totals: {
            ...EMPTY.totals,
            ...(payload.totals || {})
          },
          byExercise: asArray(payload.byExercise),
          byDay: asArray(payload.byDay)
        })
      } catch {
        if (mounted) setData(EMPTY)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchStats()
    return () => {
      mounted = false
    }
  }, [dateRange?.from, dateRange?.to])

  const chartRows = useMemo(
    () =>
      data.byDay.map(row => ({
        ...row,
        label: formatDayLabel(row.dateKey)
      })),
    [data.byDay]
  )

  const totals = data.totals
  const completionRate = Number(totals.completionRate) || 0

  if (loading) {
    return (
      <section className='space-y-4'>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
          {[0, 1, 2, 3].map(i => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>
        <ChartCardSkeleton height={300} />
      </section>
    )
  }

  return (
    <section className='space-y-4'>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <div>
          <h2 className='text-lg font-semibold tracking-tight'>Therapy exercises</h2>
          <p className='mt-1 text-sm text-muted-foreground'>
            Platform completions and engagement in the selected date range.
          </p>
        </div>
        <Badge variant='outline'>{completionRate}% completion</Badge>
      </div>

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <MetricCard
          title='Completions'
          value={Number(totals.completions) || 0}
          subtitle='In selected period'
          icon={CheckCircle2}
        />
        <MetricCard
          title='Unique users'
          value={Number(totals.uniqueUsers) || 0}
          subtitle='Did any exercise activity'
          icon={Users}
        />
        <MetricCard
          title='Starts'
          value={Number(totals.starts) || 0}
          subtitle={`${Number(totals.abandoned) || 0} abandoned · ${Number(totals.missed) || 0} missed`}
          icon={Flag}
        />
        <MetricCard
          title='Completion'
          value={`${completionRate}%`}
          subtitle='Completed ÷ (completed + abandoned + missed)'
          icon={TrendingUp}
          format='raw'
        />
      </div>

      <div className='grid gap-4 lg:grid-cols-3'>
        <Card className='lg:col-span-2'>
          <CardHeader>
            <CardTitle>Daily breakdown</CardTitle>
            <CardDescription>Starts and completions by day</CardDescription>
          </CardHeader>
          <CardContent>
            {chartRows.length === 0 ? (
              <div className='grid h-72 place-items-center rounded-xl border border-dashed bg-muted/30 px-4 text-center'>
                <div>
                  <p className='font-semibold'>No exercise activity in this period</p>
                  <p className='mt-1 text-sm text-muted-foreground'>
                    Try a wider date range at the top of the page.
                  </p>
                </div>
              </div>
            ) : (
              <div className='h-80'>
                <ResponsiveContainer width='100%' height='100%'>
                  <BarChart data={chartRows}>
                    <CartesianGrid strokeDasharray='3 3' className='stroke-border' />
                    <XAxis dataKey='label' tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={28}
                    />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey='starts'
                      name='Starts'
                      fill={BRAND.chart}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey='completions'
                      name='Completions'
                      fill={BRAND.chartPalette[1]}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By exercise</CardTitle>
            <CardDescription>Completions in this range</CardDescription>
          </CardHeader>
          <CardContent>
            {data.byExercise.length === 0 ? (
              <p className='text-sm text-muted-foreground'>No exercise breakdown yet</p>
            ) : (
              <div className='space-y-3'>
                {data.byExercise.map(row => (
                  <div key={row.exerciseId} className='rounded-xl border p-3'>
                    <p className='text-sm font-medium'>{row.title || row.exerciseId}</p>
                    <p className='mt-1 text-xs text-muted-foreground'>
                      {Number(row.completions) || 0} completed · {Number(row.starts) || 0} starts
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
