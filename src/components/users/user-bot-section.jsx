'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import api from '@/lib/api'
import { BRAND } from '@/lib/brand-colors'
import { asArray } from '@/components/users/user-profile-utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { decodeBotResponse, formatDateTime } from '@/lib/format'

const EMPTY_STATS = {
  total: 0,
  today: 0,
  week: 0,
  uniqueDays: 0,
  uniqueSessions: 0,
  avgPerActiveDay: 0,
  firstAt: null,
  lastAt: null,
  byDay: [],
  recent: []
}

function formatChartDay(date) {
  const parsed = new Date(`${date}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

export default function UserBotSection({ userId }) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(EMPTY_STATS)

  useEffect(() => {
    if (!userId) return
    let mounted = true

    queueMicrotask(() => {
      const load = async () => {
        setLoading(true)
        try {
          const res = await api.get(`/api/bot/${userId}/stats`)
          if (!mounted) return
          setStats({
            ...EMPTY_STATS,
            ...(res.data || {}),
            byDay: asArray(res.data?.byDay),
            recent: asArray(res.data?.recent)
          })
        } catch {
          if (mounted) setStats(EMPTY_STATS)
        } finally {
          if (mounted) setLoading(false)
        }
      }
      load()
    })

    return () => {
      mounted = false
    }
  }, [userId])

  const chartData = useMemo(
    () =>
      stats.byDay.map(row => ({
        ...row,
        label: formatChartDay(row.date)
      })),
    [stats.byDay]
  )

  return (
    <section className='space-y-4'>
      <div>
        <h3 className='text-lg font-semibold tracking-tight'>Trade Sense AI</h3>
        <p className='text-sm text-muted-foreground'>
          How this user has interacted with the coaching bot over time
        </p>
      </div>

      {loading ? (
        <Skeleton className='h-28 w-full' />
      ) : (
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'>
          <div className='rounded-xl border p-3'>
            <p className='text-xs text-muted-foreground'>Total messages</p>
            <p className='mt-1 text-lg font-semibold'>{stats.total}</p>
          </div>
          <div className='rounded-xl border p-3'>
            <p className='text-xs text-muted-foreground'>Today</p>
            <p className='mt-1 text-lg font-semibold'>{stats.today}</p>
          </div>
          <div className='rounded-xl border p-3'>
            <p className='text-xs text-muted-foreground'>Last 7 days</p>
            <p className='mt-1 text-lg font-semibold'>{stats.week}</p>
          </div>
          <div className='rounded-xl border p-3'>
            <p className='text-xs text-muted-foreground'>Active days</p>
            <p className='mt-1 text-lg font-semibold'>{stats.uniqueDays}</p>
          </div>
          <div className='rounded-xl border p-3'>
            <p className='text-xs text-muted-foreground'>Avg / active day</p>
            <p className='mt-1 text-lg font-semibold'>{stats.avgPerActiveDay}</p>
          </div>
          <div className='rounded-xl border p-3'>
            <p className='text-xs text-muted-foreground'>Sessions</p>
            <p className='mt-1 text-lg font-semibold'>{stats.uniqueSessions}</p>
          </div>
          <div className='rounded-xl border p-3'>
            <p className='text-xs text-muted-foreground'>First interaction</p>
            <p className='mt-1 text-sm font-semibold'>{formatDateTime(stats.firstAt)}</p>
          </div>
          <div className='rounded-xl border p-3'>
            <p className='text-xs text-muted-foreground'>Last interaction</p>
            <p className='mt-1 text-sm font-semibold'>{formatDateTime(stats.lastAt)}</p>
          </div>
        </div>
      )}

      <div className='grid gap-4 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Last 14 days</CardTitle>
            <CardDescription>Messages sent to Trade Sense AI each day</CardDescription>
          </CardHeader>
          <CardContent className='h-72'>
            {loading ? (
              <Skeleton className='h-full w-full' />
            ) : chartData.every(row => !row.count) ? (
              <div className='grid h-full place-items-center text-sm text-muted-foreground'>
                No Trade Sense AI messages in the last 14 days
              </div>
            ) : (
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray='3 3' className='stroke-border' />
                  <XAxis dataKey='label' tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
                  <Tooltip />
                  <Bar dataKey='count' name='Messages' fill={BRAND.chart} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent conversations</CardTitle>
            <CardDescription>Latest questions and Trade Sense AI replies</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className='space-y-2'>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className='h-16 w-full' />
                ))}
              </div>
            ) : stats.recent.length === 0 ? (
              <p className='text-sm text-muted-foreground'>This user has not talked to Trade Sense AI yet</p>
            ) : (
              <div className='max-h-72 space-y-3 overflow-y-auto pr-1'>
                {stats.recent.map(chat => (
                  <div key={chat._id} className='rounded-xl border p-3'>
                    <p className='text-xs text-muted-foreground'>{formatDateTime(chat.createdAt)}</p>
                    <p className='mt-1 text-sm font-medium'>{chat.message || '—'}</p>
                    <p className='mt-1 line-clamp-4 text-sm text-muted-foreground'>
                      {decodeBotResponse(chat.response) || '—'}
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
