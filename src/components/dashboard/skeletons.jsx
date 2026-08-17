'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function MetricCardSkeleton() {
  return (
    <Card>
      <CardContent className='p-4'>
        <div className='flex items-start justify-between gap-3'>
          <div className='flex-1 space-y-2'>
            <Skeleton className='h-4 w-24' />
            <Skeleton className='h-8 w-20' />
            <Skeleton className='h-3 w-32' />
          </div>
          <Skeleton className='size-10 rounded-xl' />
        </div>
      </CardContent>
    </Card>
  )
}

export function MetricCardsRowSkeleton({ count = 4 }) {
  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
      {Array.from({ length: count }).map((_, i) => (
        <MetricCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function ChartCardSkeleton({ height = 320 }) {
  return (
    <Card>
      <CardHeader className='space-y-2'>
        <Skeleton className='h-5 w-40' />
        <Skeleton className='h-4 w-56' />
      </CardHeader>
      <CardContent>
        <Skeleton className='w-full rounded-xl' style={{ height }} />
      </CardContent>
    </Card>
  )
}

export function TableCardSkeleton({ rows = 6 }) {
  return (
    <Card>
      <CardHeader className='space-y-2'>
        <Skeleton className='h-5 w-52' />
        <Skeleton className='h-4 w-40' />
      </CardHeader>
      <CardContent className='space-y-3'>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className='h-10 w-full' />
        ))}
      </CardContent>
    </Card>
  )
}
