'use client'

import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'

import api from '@/lib/api'
import { BRAND } from '@/lib/brand-colors'
import { formatDateTime, formatTime, formatScreenName } from '@/lib/format'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function UserActivitySummary({ userId }) {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    if (!userId) return
    let mounted = true
    const fetchSummary = async () => {
      setLoading(true)
      try {
        const res = await api.get(`/api/user-activity/user/${userId}/summary`)
        const raw = res.data || {}
        if (!mounted) return
        setSummary({
          totalTimeSeconds: Number(raw.totalTimeSeconds) || 0,
          totalSessions: Number(raw.sessionsCount) || 0,
          avgSessionSeconds: Number(raw.avgDurationSeconds) || 0,
          firstActivity: raw.firstActivity || null,
          lastActivity: raw.lastActivity || null,
          byScreen: Array.isArray(raw.byScreen)
            ? raw.byScreen.map(s => ({
                screen: formatScreenName(s.screen || s._id || 'Unknown'),
                minutes: Math.round((Number(s.totalTimeSeconds) || 0) / 60),
                sessions: Number(s.sessionsCount) || 0
              }))
            : []
        })
      } catch {
        if (mounted) toast.error('Failed to load user activity summary')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchSummary()
    return () => {
      mounted = false
    }
  }, [userId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className='h-5 w-40' />
        </CardHeader>
        <CardContent>
          <Skeleton className='h-64 w-full' />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity summary</CardTitle>
        <CardDescription>Time and sessions by screen for this user</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5'>
          <div className='rounded-xl border p-3'>
            <p className='text-xs text-muted-foreground'>Total time</p>
            <p className='mt-1 text-lg font-semibold'>{formatTime(summary?.totalTimeSeconds)}</p>
          </div>
          <div className='rounded-xl border p-3'>
            <p className='text-xs text-muted-foreground'>Sessions</p>
            <p className='mt-1 text-lg font-semibold'>{summary?.totalSessions || 0}</p>
          </div>
          <div className='rounded-xl border p-3'>
            <p className='text-xs text-muted-foreground'>Avg session</p>
            <p className='mt-1 text-lg font-semibold'>{formatTime(summary?.avgSessionSeconds)}</p>
          </div>
          <div className='rounded-xl border p-3'>
            <p className='text-xs text-muted-foreground'>First activity</p>
            <p className='mt-1 text-sm font-semibold'>{formatDateTime(summary?.firstActivity)}</p>
          </div>
          <div className='rounded-xl border p-3'>
            <p className='text-xs text-muted-foreground'>Last activity</p>
            <p className='mt-1 text-sm font-semibold'>{formatDateTime(summary?.lastActivity)}</p>
          </div>
        </div>

        <div className='h-72'>
          {!summary?.byScreen?.length ? (
            <div className='grid h-full place-items-center text-sm text-muted-foreground'>
              No screen activity yet
            </div>
          ) : (
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={summary.byScreen}>
                <CartesianGrid strokeDasharray='3 3' className='stroke-border' />
                <XAxis dataKey='screen' tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
                <Tooltip />
                <Bar dataKey='minutes' name='Minutes' fill={BRAND.chart} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
