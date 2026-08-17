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
import { CheckCircle2, Flag, Hourglass, TrendingUp } from 'lucide-react'

import api from '@/lib/api'
import MetricCard from '@/components/dashboard/metric-card'
import { ChartCardSkeleton, MetricCardSkeleton } from '@/components/dashboard/skeletons'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const inRange = (dateValue, from, to) => {
  if (!dateValue) return false
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return false
  if (from && date < new Date(from)) return false
  if (to && date > new Date(to)) return false
  return true
}

const dayKey = date => {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function buildChartFromItems(items, dateRange) {
  const from = dateRange?.from ? new Date(dateRange.from) : null
  const to = dateRange?.to ? new Date(dateRange.to) : null
  const daySpan = from && to ? Math.max(1, Math.round((to - from) / (1000 * 60 * 60 * 24)) + 1) : 30
  const filtered = items.filter(item => inRange(item.createdAt, dateRange?.from, dateRange?.to))

  if (daySpan <= 31 && from && to) {
    const rows = []
    const cursor = new Date(from)
    cursor.setHours(0, 0, 0, 0)
    const end = new Date(to)
    end.setHours(23, 59, 59, 999)

    while (cursor <= end) {
      const key = dayKey(cursor)
      const dayItems = filtered.filter(item => dayKey(item.createdAt) === key)
      rows.push({
        label:
          daySpan <= 7
            ? cursor.toLocaleDateString(undefined, { weekday: 'short' })
            : cursor.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        created: dayItems.length,
        completed: dayItems.filter(i => i.status === 'completed').length,
        active: dayItems.filter(i => i.status === 'active' || i.status === 'pending').length
      })
      cursor.setDate(cursor.getDate() + 1)
    }

    const activeRows = rows.filter(r => r.created > 0 || r.completed > 0 || r.active > 0)
    const useCompressed = activeRows.length > 0 && activeRows.length < rows.length
    const finalRows = useCompressed ? activeRows : rows

    return {
      mode: 'day',
      compressed: useCompressed,
      rows: finalRows,
      totals: {
        created: finalRows.reduce((a, b) => a + b.created, 0),
        completed: finalRows.reduce((a, b) => a + b.completed, 0),
        active: finalRows.reduce((a, b) => a + b.active, 0)
      }
    }
  }

  const created = new Array(12).fill(0)
  const completed = new Array(12).fill(0)
  const active = new Array(12).fill(0)

  filtered.forEach(item => {
    const month = new Date(item.createdAt).getMonth()
    created[month]++
    if (item.status === 'completed') completed[month]++
    else if (item.status === 'active' || item.status === 'pending') active[month]++
  })

  const rows = MONTHS.map((label, idx) => ({
    label,
    created: created[idx],
    completed: completed[idx],
    active: active[idx]
  }))
  const activeRows = rows.filter(r => r.created > 0 || r.completed > 0 || r.active > 0)
  const useCompressed = activeRows.length > 0 && activeRows.length < 12
  const finalRows = useCompressed ? activeRows : rows

  return {
    mode: 'month',
    compressed: useCompressed,
    rows: finalRows,
    totals: {
      created: created.reduce((a, b) => a + b, 0),
      completed: completed.reduce((a, b) => a + b, 0),
      active: active.reduce((a, b) => a + b, 0)
    }
  }
}

export default function GoalsGraph({ dateRange }) {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])

  useEffect(() => {
    let mounted = true
    const fetchGoals = async () => {
      setLoading(true)
      try {
        const res = await api.get('/api/habbits')
        if (mounted) setItems(Array.isArray(res.data) ? res.data : [])
      } catch {
        if (mounted) setItems([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchGoals()
    return () => {
      mounted = false
    }
  }, [])

  const chartView = useMemo(() => buildChartFromItems(items, dateRange), [items, dateRange])
  const totalCreated = chartView.totals.created
  const totalCompleted = chartView.totals.completed
  const totalActive = chartView.totals.active
  const completionRate = totalCreated ? Math.round((totalCompleted / totalCreated) * 100) : 0

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
          <h2 className='text-lg font-semibold tracking-tight'>Goals analysis</h2>
          <p className='mt-1 text-sm text-muted-foreground'>Goals created in the selected date range.</p>
        </div>
        <Badge variant='outline'>{completionRate}% completion</Badge>
      </div>

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <MetricCard title='Created' value={totalCreated} subtitle='In selected period' icon={Flag} />
        <MetricCard
          title='Completed'
          value={totalCompleted}
          subtitle={`${completionRate}% of created`}
          icon={CheckCircle2}
        />
        <MetricCard title='Still Active' value={totalActive} subtitle='Not completed yet' icon={Hourglass} />
        <MetricCard
          title='Completion'
          value={`${completionRate}%`}
          subtitle='Completed ÷ created'
          icon={TrendingUp}
          format='raw'
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{chartView.mode === 'day' ? 'Daily breakdown' : 'Monthly breakdown'}</CardTitle>
          <CardDescription>
            {chartView.compressed
              ? 'Periods with activity in selected range'
              : 'Grouped by when the goal was created'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {totalCreated === 0 ? (
            <div className='grid h-72 place-items-center rounded-xl border border-dashed bg-muted/30 px-4 text-center'>
              <div>
                <p className='font-semibold'>No goals in this period</p>
                <p className='mt-1 text-sm text-muted-foreground'>Try a wider date range at the top of the page.</p>
              </div>
            </div>
          ) : (
            <div className='space-y-4'>
              <div>
                <div className='mb-2 flex justify-between text-sm'>
                  <span className='text-muted-foreground'>Progress toward completion</span>
                  <span className='font-medium'>
                    {totalCompleted} / {totalCreated}
                  </span>
                </div>
                <div className='h-2 overflow-hidden rounded-full bg-muted'>
                  <div className='h-full rounded-full bg-foreground' style={{ width: `${completionRate}%` }} />
                </div>
              </div>
              <div className='h-80'>
                <ResponsiveContainer width='100%' height='100%'>
                  <BarChart data={chartView.rows}>
                    <CartesianGrid strokeDasharray='3 3' className='stroke-border' />
                    <XAxis dataKey='label' tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey='created' name='Created' fill='#171717' radius={[4, 4, 0, 0]} />
                    <Bar dataKey='completed' name='Completed' fill='#525252' radius={[4, 4, 0, 0]} />
                    <Bar dataKey='active' name='Active' fill='#a3a3a3' radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
