'use client'

import { useEffect, useMemo, useState } from 'react'

import api from '@/lib/api'
import { asArray, pickSnapshot } from '@/components/users/user-profile-utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { formatDateTime, formatYesNo } from '@/lib/format'

const statusBadge = status => {
  switch (status) {
    case 'active':
      return { variant: 'default', className: 'border-transparent bg-emerald-600 text-white' }
    case 'cancelled':
    case 'billing_issue':
      return {
        variant: 'secondary',
        className: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300'
      }
    case 'expired':
      return { variant: 'destructive' }
    default:
      return { variant: 'outline' }
  }
}

export default function UserSubscriptionSection({ userId, userIsPremium }) {
  const [loading, setLoading] = useState(true)
  const [payload, setPayload] = useState(null)

  useEffect(() => {
    if (!userId) return
    let mounted = true
    queueMicrotask(() => {
      const fetchSub = async () => {
        setLoading(true)
        try {
          let res
          try {
            res = await api.get(`/api/subscription/debug/${userId}`)
          } catch {
            res = await api.get(`/api/subscription/${userId}`)
          }
          if (!mounted) return
          setPayload(res.data || null)
        } catch {
          if (mounted) setPayload(null)
        } finally {
          if (mounted) setLoading(false)
        }
      }
      fetchSub()
    })
    return () => {
      mounted = false
    }
  }, [userId])

  const snapshot = pickSnapshot(payload)
  const events = asArray(payload?.events || payload?.history)
  const snapshots = Array.isArray(payload?.current) ? payload.current : snapshot ? [snapshot] : []

  const mismatch = useMemo(() => {
    if (!snapshot) return userIsPremium ? 'Profile is premium, but no billing snapshot exists.' : null
    if (userIsPremium && ['expired', 'unknown'].includes(snapshot.status)) {
      return `Profile is premium, billing status is ${snapshot.status}.`
    }
    if (!userIsPremium && ['active', 'cancelled', 'billing_issue'].includes(snapshot.status)) {
      return `Billing is ${snapshot.status}, but the premium flag is off.`
    }
    return null
  }, [snapshot, userIsPremium])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription & billing</CardTitle>
        <CardDescription>RevenueCat snapshot, renewal, and recent webhook events</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        {loading ? (
          <Skeleton className='h-24 w-full' />
        ) : (
          <>
            {mismatch ? (
              <div className='rounded-xl border border-amber-500/40 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200'>
                {mismatch}
              </div>
            ) : null}

            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'>
              <div className='rounded-xl border p-3'>
                <p className='text-xs text-muted-foreground'>Plan</p>
                <p className='mt-1 font-semibold'>
                  {snapshot?.subscriptionName || snapshot?.productIdentifier || (userIsPremium ? 'Premium' : 'Free')}
                </p>
              </div>
              <div className='rounded-xl border p-3'>
                <p className='text-xs text-muted-foreground'>Status</p>
                <div className='mt-1'>
                  <Badge {...statusBadge(snapshot?.status)}>
                    {snapshot?.status || (userIsPremium ? 'active' : 'free')}
                  </Badge>
                </div>
              </div>
              <div className='rounded-xl border p-3'>
                <p className='text-xs text-muted-foreground'>Will renew</p>
                <p className='mt-1 font-semibold'>{formatYesNo(snapshot?.willRenew)}</p>
              </div>
              <div className='rounded-xl border p-3'>
                <p className='text-xs text-muted-foreground'>Expires</p>
                <p className='mt-1 font-semibold'>{formatDateTime(snapshot?.expirationDate)}</p>
              </div>
              <div className='rounded-xl border p-3'>
                <p className='text-xs text-muted-foreground'>Purchased</p>
                <p className='mt-1 font-semibold'>{formatDateTime(snapshot?.purchaseDate)}</p>
              </div>
              <div className='rounded-xl border p-3'>
                <p className='text-xs text-muted-foreground'>Environment</p>
                <p className='mt-1 font-semibold'>{snapshot?.environment || '—'}</p>
              </div>
              <div className='rounded-xl border p-3'>
                <p className='text-xs text-muted-foreground'>Last event</p>
                <p className='mt-1 font-semibold'>{snapshot?.lastEventType || '—'}</p>
              </div>
              <div className='rounded-xl border p-3'>
                <p className='text-xs text-muted-foreground'>App user id</p>
                <p className='mt-1 break-all font-semibold'>{snapshot?.appUserId || '—'}</p>
              </div>
            </div>

            {snapshots.length > 1 ? (
              <p className='text-xs text-muted-foreground'>
                {snapshots.length} billing snapshots on file for this user.
              </p>
            ) : null}

            <div>
              <p className='mb-2 text-sm font-semibold'>Recent billing events</p>
              {events.length === 0 ? (
                <p className='text-sm text-muted-foreground'>No webhook events recorded</p>
              ) : (
                <div className='overflow-x-auto rounded-xl border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Store</TableHead>
                        <TableHead>Premium after</TableHead>
                        <TableHead>When</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.slice(0, 8).map(event => (
                        <TableRow key={event._id || event.eventId}>
                          <TableCell className='font-medium'>{event.eventType || '—'}</TableCell>
                          <TableCell>
                            {event.subscriptionName || event.productIdentifier || '—'}
                          </TableCell>
                          <TableCell>{event.store || event.environment || '—'}</TableCell>
                          <TableCell>{formatYesNo(event.premiumAfter)}</TableCell>
                          <TableCell className='text-muted-foreground'>
                            {formatDateTime(event.createdAt || event.purchasedAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
