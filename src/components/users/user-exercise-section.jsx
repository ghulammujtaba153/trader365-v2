'use client'

import { useEffect, useMemo, useState } from 'react'

import api from '@/lib/api'
import { asArray } from '@/components/users/user-profile-utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

const EMPTY = {
  totalCompletions: 0,
  totalStarts: 0,
  totalAbandoned: 0,
  totalMissed: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastCompletedDateKey: null,
  completedToday: 0,
  remainingToday: 0,
  byExercise: [],
  catalog: [],
  recent: []
}

function dateKeyLabel(dateKey) {
  if (!dateKey) return '—'
  const parsed = new Date(`${dateKey}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) return dateKey
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  })
}

function statusLabel(status) {
  if (!status) return '—'
  return String(status).replace(/_/g, ' ')
}

function daysAgoKey(days) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

export default function UserExerciseSection({ userId }) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(EMPTY)

  useEffect(() => {
    if (!userId) return
    let mounted = true

    queueMicrotask(() => {
      const load = async () => {
        setLoading(true)
        try {
          const from = daysAgoKey(30)
          const to = new Date().toISOString().slice(0, 10)
          const [summaryRes, streaksRes, activityRes] = await Promise.all([
            api.get(`/api/therapy-exercises/summary/${userId}`),
            api.get(`/api/therapy-exercises/streaks/${userId}`),
            api.get(`/api/therapy-exercises/activity/${userId}`, {
              params: { from, to }
            })
          ])
          if (!mounted) return

          const summary = summaryRes.data || {}
          const streaks = streaksRes.data || {}
          const all = streaks.all || {}
          const byExercise = asArray(streaks.byExercise)
          const catalog = asArray(summary.catalog)
          const activities = asArray(activityRes.data?.activities)

          setStats({
            totalCompletions: Number(all.totalCompletions) || 0,
            totalStarts: Number(all.totalStarts) || 0,
            totalAbandoned: Number(all.totalAbandoned) || 0,
            totalMissed: Number(all.totalMissed) || 0,
            currentStreak: Number(all.currentStreak) || 0,
            longestStreak: Number(all.longestStreak) || 0,
            lastCompletedDateKey: all.lastCompletedDateKey || null,
            completedToday: Number(summary.counts?.completedToday) || 0,
            remainingToday: Number(summary.counts?.remainingToday) || 0,
            byExercise,
            catalog,
            recent: activities.slice(0, 12)
          })
        } catch {
          if (mounted) setStats(EMPTY)
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

  const titleById = useMemo(() => {
    const map = new Map()
    for (const ex of stats.catalog) {
      if (ex?.id) map.set(ex.id, ex.title || ex.id)
    }
    return map
  }, [stats.catalog])

  const exerciseRows = useMemo(() => {
    if (stats.byExercise.length) {
      return stats.byExercise.map(row => ({
        ...row,
        title: titleById.get(row.exerciseId) || row.exerciseId
      }))
    }
    return stats.catalog.map(ex => ({
      exerciseId: ex.id,
      title: ex.title,
      totalCompletions: 0,
      currentStreak: 0,
      longestStreak: 0
    }))
  }, [stats.byExercise, stats.catalog, titleById])

  return (
    <section className='space-y-4'>
      <div>
        <h3 className='text-lg font-semibold tracking-tight'>Therapy exercises</h3>
        <p className='text-sm text-muted-foreground'>
          Completions, streaks, and recent activity for the three in-app exercises
        </p>
      </div>

      {loading ? (
        <Skeleton className='h-28 w-full' />
      ) : (
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'>
          <div className='rounded-xl border p-3'>
            <p className='text-xs text-muted-foreground'>Total completions</p>
            <p className='mt-1 text-lg font-semibold'>{stats.totalCompletions}</p>
          </div>
          <div className='rounded-xl border p-3'>
            <p className='text-xs text-muted-foreground'>Completed today</p>
            <p className='mt-1 text-lg font-semibold'>{stats.completedToday}/3</p>
          </div>
          <div className='rounded-xl border p-3'>
            <p className='text-xs text-muted-foreground'>Current streak</p>
            <p className='mt-1 text-lg font-semibold'>{stats.currentStreak}</p>
          </div>
          <div className='rounded-xl border p-3'>
            <p className='text-xs text-muted-foreground'>Longest streak</p>
            <p className='mt-1 text-lg font-semibold'>{stats.longestStreak}</p>
          </div>
          <div className='rounded-xl border p-3'>
            <p className='text-xs text-muted-foreground'>Starts</p>
            <p className='mt-1 text-lg font-semibold'>{stats.totalStarts}</p>
          </div>
          <div className='rounded-xl border p-3'>
            <p className='text-xs text-muted-foreground'>Abandoned</p>
            <p className='mt-1 text-lg font-semibold'>{stats.totalAbandoned}</p>
          </div>
          <div className='rounded-xl border p-3'>
            <p className='text-xs text-muted-foreground'>Missed</p>
            <p className='mt-1 text-lg font-semibold'>{stats.totalMissed}</p>
          </div>
          <div className='rounded-xl border p-3'>
            <p className='text-xs text-muted-foreground'>Last completed</p>
            <p className='mt-1 text-sm font-semibold'>{dateKeyLabel(stats.lastCompletedDateKey)}</p>
          </div>
        </div>
      )}

      <div className='grid gap-4 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>By exercise</CardTitle>
            <CardDescription>Lifetime completions and streaks per exercise</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className='space-y-2'>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className='h-14 w-full' />
                ))}
              </div>
            ) : exerciseRows.length === 0 ? (
              <p className='text-sm text-muted-foreground'>No exercise data yet</p>
            ) : (
              <div className='space-y-3'>
                {exerciseRows.map(row => (
                  <div key={row.exerciseId} className='rounded-xl border p-3'>
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <p className='text-sm font-medium'>{row.title}</p>
                      <Badge variant='outline'>{Number(row.totalCompletions) || 0} completed</Badge>
                    </div>
                    <p className='mt-1 text-xs text-muted-foreground'>
                      Streak {Number(row.currentStreak) || 0} · longest {Number(row.longestStreak) || 0}
                      {row.lastCompletedDateKey
                        ? ` · last ${dateKeyLabel(row.lastCompletedDateKey)}`
                        : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Last 30 days of starts, completions, and misses</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className='space-y-2'>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className='h-12 w-full' />
                ))}
              </div>
            ) : stats.recent.length === 0 ? (
              <p className='text-sm text-muted-foreground'>No exercise activity in the last 30 days</p>
            ) : (
              <div className='max-h-72 space-y-3 overflow-y-auto pr-1'>
                {stats.recent.map(item => (
                  <div
                    key={item._id || `${item.dateKey}-${item.exerciseId}`}
                    className='rounded-xl border p-3'
                  >
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <p className='text-sm font-medium'>
                        {titleById.get(item.exerciseId) || item.exerciseId}
                      </p>
                      <Badge variant='outline'>{statusLabel(item.status)}</Badge>
                    </div>
                    <p className='mt-1 text-xs text-muted-foreground'>
                      {dateKeyLabel(item.dateKey)}
                      {item.source ? ` · ${item.source}` : ''}
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
