'use client'

import { useCallback, useState } from 'react'
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  Plus
} from 'lucide-react'

import ComposeNotification from '@/components/notifications/compose-notification'
import NotificationHistory from '@/components/notifications/notification-history'
import MetricCard from '@/components/dashboard/metric-card'
import DashboardHeader from '@/components/layout/dashboard-header'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const EMPTY_SUMMARY = {
  total: 0,
  sent: 0,
  scheduled: 0,
  issues: 0
}

const METRIC_CARDS = [
  {
    value: 'all',
    title: 'Total',
    summaryKey: 'total',
    subtitle: 'All campaigns',
    icon: Bell,
    accentClass: 'bg-muted text-foreground'
  },
  {
    value: 'sent',
    title: 'Sent',
    summaryKey: 'sent',
    subtitle: 'Delivered campaigns',
    icon: CheckCircle2,
    accentClass: 'bg-muted text-foreground'
  },
  {
    value: 'scheduled',
    title: 'Scheduled',
    summaryKey: 'scheduled',
    subtitle: 'Waiting to send',
    icon: Clock,
    accentClass: 'bg-muted text-foreground'
  },
  {
    value: 'issues',
    title: 'Needs attention',
    summaryKey: 'issues',
    subtitle: 'Partial or failed',
    icon: AlertTriangle,
    accentClass: 'bg-amber-100 text-amber-800'
  }
]

export default function NotificationsPage() {
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [refreshKey, setRefreshKey] = useState(0)
  const [statusFilter, setStatusFilter] = useState('all')
  const [composeOpen, setComposeOpen] = useState(false)

  const handleSummary = useCallback(next => {
    setSummary(next || EMPTY_SUMMARY)
  }, [])

  return (
    <>
      <DashboardHeader
        title='Push Notifications'
        description='Compose and schedule push campaigns, then track delivery across devices and in-app inbox.'
      />

      <main className='flex-1 space-y-4 px-4 py-4 md:px-6 md:pb-6'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <p className='text-sm text-muted-foreground'>
            {statusFilter === 'all'
              ? 'Showing all campaigns'
              : statusFilter === 'issues'
                ? 'Showing partial and failed campaigns'
                : `Showing ${statusFilter} campaigns`}
          </p>
          <Button onClick={() => setComposeOpen(true)}>
            <Plus className='size-4' />
            New notification
          </Button>
        </div>

        <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
          {METRIC_CARDS.map(card => {
            const selected = statusFilter === card.value
            const Icon = card.icon
            return (
              <button
                key={card.value}
                type='button'
                aria-pressed={selected}
                onClick={() => setStatusFilter(card.value)}
                className={cn(
                  'rounded-xl text-left transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selected && 'ring-2 ring-foreground/20'
                )}
              >
                <MetricCard
                  title={card.title}
                  value={summary[card.summaryKey]}
                  subtitle={selected ? 'Filtering history' : card.subtitle}
                  icon={Icon}
                  accentClass={card.accentClass}
                  format='number'
                />
              </button>
            )
          })}
        </div>

        <NotificationHistory
          refreshKey={refreshKey}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onCompose={() => setComposeOpen(true)}
          onSummary={handleSummary}
        />
      </main>

      <ComposeNotification
        open={composeOpen}
        onOpenChange={setComposeOpen}
        onSent={() => {
          setRefreshKey(k => k + 1)
          setStatusFilter('all')
        }}
      />
    </>
  )
}
