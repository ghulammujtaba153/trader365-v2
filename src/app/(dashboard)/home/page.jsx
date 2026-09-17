'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, Clock3, TrendingUp, Users } from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/api'
import DashboardHeader from '@/components/layout/dashboard-header'
import MetricCard from '@/components/dashboard/metric-card'
import DailyActivityChart from '@/components/dashboard/daily-activity-chart'
import TopScreensChart from '@/components/dashboard/top-screens-chart'
import ScreenPerformanceTable from '@/components/dashboard/screen-performance-table'
import UsersOverview from '@/components/dashboard/users-overview'
import GoalsGraph from '@/components/dashboard/goals-graph'
import ExercisesGraph from '@/components/dashboard/exercises-graph'
import { MetricCardsRowSkeleton } from '@/components/dashboard/skeletons'
import { TAB_ACTIVE_CLASS } from '@/lib/brand-colors'
import { cn } from '@/lib/utils'

const RANGE_LABELS = {
  today: 'Today',
  week: 'This week',
  month: 'This month',
  custom: 'Last 3 months'
}

const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Last 3 Months' }
]

export default function HomePage() {
  const [data, setData] = useState()
  const [activityData, setActivityData] = useState()
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState('week')

  const currentDateRange = useMemo(() => {
    const now = new Date()
    const from = new Date()

    switch (dateRange) {
      case 'today':
        from.setHours(0, 0, 0, 0)
        break
      case 'week':
        from.setDate(now.getDate() - 7)
        break
      case 'month':
        from.setMonth(now.getMonth() - 1)
        break
      case 'custom':
        from.setMonth(now.getMonth() - 3)
        break
      default:
        from.setDate(now.getDate() - 7)
    }

    return {
      from: from.toISOString(),
      to: now.toISOString()
    }
  }, [dateRange])

  useEffect(() => {
    let mounted = true

    const fetchAll = async () => {
      setIsLoading(true)
      try {
        const [dashboardRes, activityRes] = await Promise.all([
          api.get('/api/dashboard', { params: currentDateRange }),
          api.get('/api/user-activity/summary', { params: currentDateRange })
        ])
        if (!mounted) return
        setData(dashboardRes.data)
        setActivityData(activityRes.data)
      } catch (error) {
        if (mounted) toast.error(error.response?.data?.message || error.message)
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    fetchAll()
    return () => {
      mounted = false
    }
  }, [currentDateRange])

  return (
    <>
      <DashboardHeader
        title='Home'
        description={`Application overview · ${RANGE_LABELS[dateRange] || 'selected range'}`}
      />

      <main className='flex-1 space-y-6 px-4 py-4 md:px-6 md:pb-6'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
          <div>
            <h2 className='text-xl font-semibold tracking-tight'>In-app activity</h2>
            <p className='mt-1 text-sm text-muted-foreground'>
              Time and sessions for {RANGE_LABELS[dateRange] || 'selected range'}. Account status is below.
            </p>
          </div>

          <div className='inline-flex flex-wrap rounded-xl border bg-background p-1'>
            {RANGE_OPTIONS.map(option => (
              <button
                key={option.value}
                type='button'
                onClick={() => setDateRange(option.value)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm transition-colors',
                  dateRange === option.value
                    ? TAB_ACTIVE_CLASS
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <MetricCardsRowSkeleton count={4} />
        ) : (
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
            <MetricCard
              title='Total Activity Time'
              value={activityData?.totalTimeSeconds || 0}
              subtitle={`Across all users · ${RANGE_LABELS[dateRange]}`}
              icon={Clock3}
              format='time'
            />
            <MetricCard
              title='Total Sessions'
              value={activityData?.sessionsCount || 0}
              subtitle={`User interactions · ${RANGE_LABELS[dateRange]}`}
              icon={Activity}
            />
            <MetricCard
              title='Avg. Session Time'
              value={activityData?.avgDurationSeconds || 0}
              subtitle={`Per session · ${RANGE_LABELS[dateRange]}`}
              icon={TrendingUp}
              format='time'
            />
            <MetricCard
              title='Users in-app'
              value={activityData?.uniqueUsers || 0}
              subtitle='Opened the app this period'
              icon={Users}
            />
          </div>
        )}

        <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
          <DailyActivityChart dateRange={currentDateRange} />
          <TopScreensChart dateRange={currentDateRange} />
        </div>

        <ScreenPerformanceTable dateRange={currentDateRange} />

        <UsersOverview data={data} dateRange={currentDateRange} loading={isLoading} />

        <GoalsGraph dateRange={currentDateRange} />

        <ExercisesGraph dateRange={currentDateRange} />
      </main>
    </>
  )
}
