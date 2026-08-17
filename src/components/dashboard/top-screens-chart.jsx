'use client'

import { useEffect, useState } from 'react'
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
import { toast } from 'sonner'

import api from '@/lib/api'
import { formatScreenName } from '@/lib/format'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartCardSkeleton } from '@/components/dashboard/skeletons'

export default function TopScreensChart({ dateRange }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const fetchTop = async () => {
      setLoading(true)
      try {
        const params = { limit: 10 }
        if (dateRange?.from) params.from = dateRange.from
        if (dateRange?.to) params.to = dateRange.to
        const res = await api.get('/api/user-activity/top-screens', { params })
        if (!mounted) return
        setRows(
          (res.data?.results || []).map(r => {
            const label = formatScreenName(r.screen)
            return {
              screen: label.length > 18 ? `${label.slice(0, 18)}…` : label,
              minutes: Math.round((r.totalTimeSeconds || 0) / 60),
              sessions: r.sessionsCount || 0
            }
          })
        )
      } catch {
        if (mounted) toast.error('Failed to fetch top screens data')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchTop()
    return () => {
      mounted = false
    }
  }, [dateRange])

  if (loading) return <ChartCardSkeleton height={320} />

  return (
    <Card className='h-full'>
      <CardHeader>
        <CardTitle>Top Screens by Activity</CardTitle>
        <CardDescription>Most engaged screens by time and sessions</CardDescription>
      </CardHeader>
      <CardContent className='h-80'>
        {rows.length === 0 ? (
          <div className='grid h-full place-items-center text-sm text-muted-foreground'>
            No activity data available for the selected period
          </div>
        ) : (
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={rows} layout='vertical' margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray='3 3' className='stroke-border' horizontal={false} />
              <XAxis type='number' tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                type='category'
                dataKey='screen'
                width={100}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip />
              <Legend />
              <Bar dataKey='minutes' name='Time (minutes)' fill='#171717' radius={[0, 4, 4, 0]} />
              <Bar dataKey='sessions' name='Sessions' fill='#a3a3a3' radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
