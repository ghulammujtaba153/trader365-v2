'use client'

import { useEffect, useMemo, useState } from 'react'
import { Minus, TrendingDown, TrendingUp, UserRound } from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/api'
import { PROGRESS_BAR_CLASS } from '@/lib/brand-colors'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export default function ActiveUsersPanel({ dateRange, eligibleAccounts = 0 }) {
  const [activeUsers, setActiveUsers] = useState(0)
  const [previousActiveUsers, setPreviousActiveUsers] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const fetchActive = async () => {
      setLoading(true)
      try {
        const params = {}
        if (dateRange?.from) params.from = dateRange.from
        if (dateRange?.to) params.to = dateRange.to
        const res = await api.get('/api/user-activity/active-users', { params })
        if (!mounted) return
        setActiveUsers(Number(res.data?.activeUsers) || 0)

        if (dateRange?.from && dateRange?.to) {
          const from = new Date(dateRange.from)
          const to = new Date(dateRange.to)
          const diff = to.getTime() - from.getTime()
          const prevFrom = new Date(from.getTime() - diff)
          const prevTo = new Date(from)
          const prevRes = await api.get('/api/user-activity/active-users', {
            params: { from: prevFrom.toISOString(), to: prevTo.toISOString() }
          })
          if (!mounted) return
          setPreviousActiveUsers(Number(prevRes.data?.activeUsers) || 0)
        } else {
          setPreviousActiveUsers(0)
        }
      } catch {
        if (mounted) {
          toast.error('Failed to fetch active users data')
          setActiveUsers(0)
          setPreviousActiveUsers(0)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchActive()
    return () => {
      mounted = false
    }
  }, [dateRange])

  const growthPct = useMemo(() => {
    if (previousActiveUsers === 0) return activeUsers > 0 ? 100 : 0
    return Math.round(((activeUsers - previousActiveUsers) / previousActiveUsers) * 100)
  }, [activeUsers, previousActiveUsers])

  const engagementPct = useMemo(() => {
    const denom = Number(eligibleAccounts) || 0
    if (denom <= 0) return 0
    return Math.min(100, Math.round((activeUsers / denom) * 1000) / 10)
  }, [activeUsers, eligibleAccounts])

  const TrendIcon = growthPct > 0 ? TrendingUp : growthPct < 0 ? TrendingDown : Minus
  const trendClass = growthPct > 0 ? 'text-emerald-600' : growthPct < 0 ? 'text-red-600' : 'text-muted-foreground'

  return (
    <Card className='h-full'>
      <CardHeader>
        <CardTitle>In-app users</CardTitle>
        <CardDescription>Unique people with recorded sessions in the selected range (not account status)</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className='space-y-4'>
            <Skeleton className='h-16 w-full' />
            <Skeleton className='h-2 w-full' />
            <Skeleton className='h-4 w-2/3' />
          </div>
        ) : (
          <div className='space-y-4'>
            <div className='flex items-center justify-between gap-3'>
              <div className='flex items-center gap-3'>
                <div className='grid size-12 place-items-center rounded-xl bg-muted'>
                  <UserRound className='size-5' />
                </div>
                <div>
                  <p className='text-3xl font-semibold tracking-tight'>{activeUsers.toLocaleString()}</p>
                  <p className='text-xs text-muted-foreground'>opened the app this period</p>
                </div>
              </div>
              <Badge variant='outline' className={cn('gap-1 font-semibold', trendClass)}>
                <TrendIcon className='size-3.5' />
                {growthPct > 0 ? '+' : ''}
                {growthPct}% vs prior
              </Badge>
            </div>

            <Separator />

            <div>
              <div className='mb-2 flex items-end justify-between gap-3'>
                <div>
                  <p className='text-sm font-semibold'>In-app rate</p>
                  <p className='text-xs text-muted-foreground'>Users in-app ÷ account-active</p>
                </div>
                <p className='text-xl font-semibold'>{engagementPct}%</p>
              </div>
              <div className='h-2 overflow-hidden rounded-full bg-muted'>
                <div className={`h-full rounded-full ${PROGRESS_BAR_CLASS}`} style={{ width: `${Math.min(engagementPct, 100)}%` }} />
              </div>
              <p className='mt-2 text-xs text-muted-foreground'>
                {activeUsers.toLocaleString()} of {(Number(eligibleAccounts) || 0).toLocaleString()} eligible
                accounts · prior {previousActiveUsers.toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
