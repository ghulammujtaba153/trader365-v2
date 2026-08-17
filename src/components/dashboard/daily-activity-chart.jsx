'use client'

import { useEffect, useState } from 'react'
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
import { formatScreenName } from '@/lib/format'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartCardSkeleton } from '@/components/dashboard/skeletons'

export default function DailyActivityChart({ dateRange }) {
  const [rows, setRows] = useState([])
  const [screens, setScreens] = useState([])
  const [selectedScreen, setSelectedScreen] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    api
      .get('/api/user-activity/top-screens', { params: { limit: 50 } })
      .then(res => {
        if (mounted) setScreens(res.data?.results?.map(r => r.screen) || [])
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const fetchDaily = async () => {
      setLoading(true)
      try {
        const params = {}
        if (dateRange?.from) params.from = dateRange.from
        if (dateRange?.to) params.to = dateRange.to
        if (selectedScreen !== 'all') params.screen = selectedScreen

        const res = await api.get('/api/user-activity/daily', { params })
        if (!mounted) return
        const results = Array.isArray(res.data?.results) ? res.data.results : []
        setRows(
          results.map(r => ({
            date: r.date || '',
            minutes: typeof r.totalTimeSeconds === 'number' ? Math.round(r.totalTimeSeconds / 60) : 0,
            sessions: typeof r.sessionsCount === 'number' ? r.sessionsCount : 0
          }))
        )
      } catch (err) {
        if (mounted) toast.error(err.response?.data?.message || 'Failed to load daily activity')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchDaily()
    return () => {
      mounted = false
    }
  }, [dateRange, selectedScreen])

  if (loading) return <ChartCardSkeleton height={320} />

  return (
    <Card className='h-full'>
      <CardHeader className='flex flex-row flex-wrap items-start justify-between gap-3 space-y-0'>
        <div>
          <CardTitle>Daily Activity Trends</CardTitle>
          <CardDescription>Time and sessions across the selected period</CardDescription>
        </div>
        <select
          value={selectedScreen}
          onChange={e => setSelectedScreen(e.target.value)}
          className='h-8 rounded-lg border border-input bg-background px-2 text-sm'
        >
          <option value='all'>All Screens</option>
          {screens.map(screen => (
            <option key={screen} value={screen}>
              {formatScreenName(screen)}
            </option>
          ))}
        </select>
      </CardHeader>
      <CardContent className='h-80'>
        {rows.length === 0 ? (
          <div className='grid h-full place-items-center text-sm text-muted-foreground'>
            No activity data available for the selected period
          </div>
        ) : (
          <ResponsiveContainer width='100%' height='100%'>
            <LineChart data={rows}>
              <CartesianGrid strokeDasharray='3 3' className='stroke-border' />
              <XAxis dataKey='date' tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis yAxisId='left' tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
              <YAxis
                yAxisId='right'
                orientation='right'
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <Tooltip />
              <Legend />
              <Line
                yAxisId='left'
                type='monotone'
                dataKey='minutes'
                name='Time (minutes)'
                stroke='#171717'
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId='right'
                type='monotone'
                dataKey='sessions'
                name='Sessions'
                stroke='#737373'
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
