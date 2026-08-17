'use client'

import { BadgeCheck, Crown, UserPlus, Users } from 'lucide-react'

import MetricCard from '@/components/dashboard/metric-card'
import UserGrowth from '@/components/dashboard/user-growth'
import ActiveUsersPanel from '@/components/dashboard/active-users-panel'
import { MetricCardSkeleton } from '@/components/dashboard/skeletons'
import { Badge } from '@/components/ui/badge'

export default function UsersOverview({ data, dateRange, loading = false }) {
  return (
    <section className='space-y-4'>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <div>
          <h2 className='text-lg font-semibold tracking-tight'>Accounts</h2>
          <p className='mt-1 text-sm text-muted-foreground'>
            Signup growth and whether accounts are allowed in. “In-app” is usage, not this status.
          </p>
        </div>
        {!loading ? (
          <Badge variant='outline'>
            {data?.accountActiveUsers ?? data?.activeUsers ?? 0} account active · {data?.suspendedUsers ?? 0}{' '}
            suspended
          </Badge>
        ) : null}
      </div>

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        {loading ? (
          [0, 1, 2, 3].map(i => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <MetricCard title='Total Users' value={data?.totalUsers || 0} subtitle='All app accounts' icon={Users} />
            <MetricCard
              title='Account active'
              value={data?.accountActiveUsers ?? data?.activeUsers ?? 0}
              subtitle='Not suspended'
              icon={BadgeCheck}
            />
            <MetricCard title='Premium' value={data?.premiumUsers || 0} subtitle='Paid / premium tier' icon={Crown} />
            <MetricCard
              title='New In Period'
              value={data?.newInPeriod ?? data?.newThisWeek ?? 0}
              subtitle='Created in selected range'
              icon={UserPlus}
              trend={data?.periodGrowthPct ?? data?.weekGrowthPct}
              trendValue='vs prior period'
            />
          </>
        )}
      </div>

      <div className='grid grid-cols-1 gap-4 lg:grid-cols-12'>
        <div className='lg:col-span-7'>
          <UserGrowth dateRange={dateRange} />
        </div>
        <div className='lg:col-span-5'>
          <ActiveUsersPanel
            dateRange={dateRange}
            eligibleAccounts={data?.accountActiveUsers ?? data?.activeUsers ?? 0}
          />
        </div>
      </div>
    </section>
  )
}
