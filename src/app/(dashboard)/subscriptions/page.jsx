'use client'

import { Suspense } from 'react'

import SubscriptionsTable from '@/components/subscriptions/subscriptions-table'
import EventsTable from '@/components/subscriptions/events-table'
import DashboardHeader from '@/components/layout/dashboard-header'
import { MetricCardsRowSkeleton, TableCardSkeleton } from '@/components/dashboard/skeletons'

export default function SubscriptionsPage() {
  return (
    <>
      <DashboardHeader
        title='Subscriptions'
        description='Review store purchases, grants, and who is about to lose access.'
      />

      <main className='flex-1 space-y-4 px-4 py-4 md:px-6 md:pb-6'>
        <Suspense
          fallback={
            <>
              <MetricCardsRowSkeleton count={5} />
              <TableCardSkeleton />
            </>
          }
        >
          <SubscriptionsTable />
        </Suspense>
        <EventsTable />
      </main>
    </>
  )
}
