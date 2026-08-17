'use client'

import { useEffect, useMemo, useState } from 'react'

import api from '@/lib/api'
import { asArray } from '@/components/users/user-profile-utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime, formatTime } from '@/lib/format'

export default function UserEngagementSection({ userId }) {
  const [loading, setLoading] = useState(true)
  const [moods, setMoods] = useState([])
  const [favorites, setFavorites] = useState([])
  const [progress, setProgress] = useState([])
  const [notifications, setNotifications] = useState([])
  const [delivered, setDelivered] = useState([])

  useEffect(() => {
    if (!userId) return
    let mounted = true

    queueMicrotask(() => {
      const load = async () => {
        setLoading(true)
        try {
          const [moodRes, favRes, progressRes, notifRes, deliveredRes] = await Promise.allSettled([
            api.get(`/api/mood/${userId}`),
            api.get(`/api/favorites/${userId}`),
            api.get(`/api/resource/progress/${userId}`),
            api.get(`/api/notifications/${userId}`),
            api.get(`/api/delivered/notifications/${userId}`)
          ])
          if (!mounted) return
          setMoods(moodRes.status === 'fulfilled' ? asArray(moodRes.value.data) : [])
          setFavorites(favRes.status === 'fulfilled' ? asArray(favRes.value.data) : [])
          setProgress(progressRes.status === 'fulfilled' ? asArray(progressRes.value.data) : [])
          setNotifications(notifRes.status === 'fulfilled' ? asArray(notifRes.value.data) : [])
          setDelivered(deliveredRes.status === 'fulfilled' ? asArray(deliveredRes.value.data) : [])
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

  const moodCounts = useMemo(() => {
    const map = new Map()
    for (const item of moods) {
      const key = String(item.mood || 'unknown').toLowerCase()
      map.set(key, (map.get(key) || 0) + 1)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [moods])

  const recentMoods = useMemo(
    () =>
      [...moods]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 8),
    [moods]
  )

  return (
    <section className='space-y-4'>
      <div>
        <h3 className='text-lg font-semibold tracking-tight'>Engagement & content</h3>
        <p className='text-sm text-muted-foreground'>
          Mood, saved resources, watch progress, and notification reach
        </p>
      </div>

      <div className='grid gap-4 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Mood check-ins</CardTitle>
            <CardDescription>{moods.length} total logs</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className='h-24 w-full' />
            ) : moods.length === 0 ? (
              <p className='text-sm text-muted-foreground'>No mood logs yet</p>
            ) : (
              <div className='space-y-3'>
                <div className='flex flex-wrap gap-1.5'>
                  {moodCounts.map(([mood, count]) => (
                    <Badge key={mood} variant='secondary'>
                      {mood} · {count}
                    </Badge>
                  ))}
                </div>
                <div className='space-y-2'>
                  {recentMoods.map(item => (
                    <div key={item._id} className='flex items-center justify-between gap-3 text-sm'>
                      <span className='font-medium capitalize'>{item.mood || '—'}</span>
                      <span className='text-muted-foreground'>{formatDateTime(item.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Favorites</CardTitle>
            <CardDescription>{favorites.length} saved items</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className='h-24 w-full' />
            ) : favorites.length === 0 ? (
              <p className='text-sm text-muted-foreground'>No saved resources</p>
            ) : (
              <div className='space-y-2'>
                {favorites.slice(0, 8).map(item => (
                  <div key={item._id} className='flex items-center justify-between gap-3 text-sm'>
                    <span className='min-w-0 truncate font-medium'>
                      {item.itemId?.title || item.itemId?.name || item.itemType || 'Saved item'}
                    </span>
                    <span className='shrink-0 text-muted-foreground'>
                      {formatDateTime(item.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resource progress</CardTitle>
            <CardDescription>{progress.length} in-progress items</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className='h-24 w-full' />
            ) : progress.length === 0 ? (
              <p className='text-sm text-muted-foreground'>No watch progress recorded</p>
            ) : (
              <div className='space-y-2'>
                {progress.slice(0, 8).map(item => (
                  <div key={item._id} className='flex items-center justify-between gap-3 text-sm'>
                    <span className='min-w-0 truncate font-medium'>
                      {item.resourceId || 'Resource'}
                    </span>
                    <span className='shrink-0 text-muted-foreground'>
                      {formatTime(item.currentTime)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              {notifications.filter(n => !n.isSeen).length} unseen · {delivered.length} delivery records
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className='h-24 w-full' />
            ) : notifications.length === 0 ? (
              <p className='text-sm text-muted-foreground'>No notifications targeted to this user</p>
            ) : (
              <div className='space-y-2'>
                {notifications.slice(0, 8).map(item => (
                  <div key={item._id} className='flex items-start justify-between gap-3 text-sm'>
                    <div className='min-w-0'>
                      <p className='truncate font-medium'>{item.title || item.body || 'Notification'}</p>
                      <p className='text-xs text-muted-foreground'>{formatDateTime(item.sendAt)}</p>
                    </div>
                    <Badge variant={item.isSeen ? 'outline' : 'secondary'}>
                      {item.isSeen ? 'Seen' : 'Unseen'}
                    </Badge>
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
