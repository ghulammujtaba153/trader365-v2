'use client'

import { useEffect, useState } from 'react'
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import api from '@/lib/api'
import { BRAND } from '@/lib/brand-colors'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function UserDailyActivity({ userId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    let mounted = true
    const fetchDaily = async () => {
      setLoading(true)
      try {
        const to = new Date()
        const from = new Date()
        from.setDate(to.getDate() - 14)
        const res = await api.get('/api/user-activity/daily', {
          params: {
            from: from.toISOString(),
            to: to.toISOString(),
            userId
          }
        })
        if (!mounted) return
        const results = Array.isArray(res.data?.results) ? res.data.results : []
        setRows(
          results.map(r => ({
            date: r.date || '',
            minutes: Math.round((r.totalTimeSeconds || 0) / 60),
            sessions: r.sessionsCount || 0
          }))
        )
      } catch {
        if (mounted) setRows([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchDaily()
    return () => {
      mounted = false
    }
  }, [userId])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily activity</CardTitle>
        <CardDescription>Last 14 days of sessions and time</CardDescription>
      </CardHeader>
      <CardContent className='h-72'>
        {loading ? (
          <Skeleton className='h-full w-full' />
        ) : rows.length === 0 ? (
          <div className='grid h-full place-items-center text-sm text-muted-foreground'>
            No daily activity in this period
          </div>
        ) : (
          <ResponsiveContainer width='100%' height='100%'>
            <LineChart data={rows}>
              <CartesianGrid strokeDasharray='3 3' className='stroke-border' />
              <XAxis dataKey='date' tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
              <Tooltip />
              <Line type='monotone' dataKey='minutes' name='Minutes' stroke={BRAND.chart} strokeWidth={2} dot={false} />
              <Line type='monotone' dataKey='sessions' name='Sessions' stroke={BRAND.chartPalette[1]} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
