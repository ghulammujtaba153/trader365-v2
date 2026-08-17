'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import api from '@/lib/api'
import { formatTime, formatScreenName } from '@/lib/format'
import { TablePagination, usePagination } from '@/components/common/table-pagination'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { TableCardSkeleton } from '@/components/dashboard/skeletons'

export default function ScreenPerformanceTable({ dateRange }) {
  const [screens, setScreens] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const fetchScreens = async () => {
      setLoading(true)
      try {
        const params = { limit: 50 }
        if (dateRange?.from) params.from = dateRange.from
        if (dateRange?.to) params.to = dateRange.to
        const res = await api.get('/api/user-activity/top-screens', { params })
        if (mounted) setScreens(res.data?.results || [])
      } catch {
        if (mounted) toast.error('Failed to fetch screen performance data')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchScreens()
    return () => {
      mounted = false
    }
  }, [dateRange])

  const maxTime = screens.length > 0 ? Math.max(...screens.map(s => s.totalTimeSeconds || 0), 1) : 1
  const {
    page,
    pageSize,
    totalItems,
    totalPages,
    from,
    to,
    paginatedItems,
    goToPage,
    changePageSize
  } = usePagination(screens, 10)

  if (loading) return <TableCardSkeleton />

  return (
    <Card>
      <CardHeader>
        <CardTitle>Screen Performance Breakdown</CardTitle>
        <CardDescription>Detailed metrics by screen</CardDescription>
      </CardHeader>
      <CardContent className='p-0'>
        {screens.length === 0 ? (
          <p className='px-6 py-8 text-center text-sm text-muted-foreground'>No activity data available</p>
        ) : (
          <>
            <div className='overflow-x-auto px-6'>
              <div className='rounded-xl border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Screen</TableHead>
                      <TableHead className='text-center'>Total Time</TableHead>
                      <TableHead className='text-center'>Sessions</TableHead>
                      <TableHead className='text-center'>Unique Users</TableHead>
                      <TableHead>Engagement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map((screen, index) => {
                      const rank = from + index
                      const pct = Math.round(((screen.totalTimeSeconds || 0) / maxTime) * 100)
                      return (
                        <TableRow key={`${screen.screen}-${rank}`}>
                          <TableCell>
                            <div className='flex items-center gap-2'>
                              <Badge
                                variant={rank <= 3 ? 'default' : 'outline'}
                                className='min-w-7 justify-center'
                              >
                                {rank}
                              </Badge>
                              <span className={rank <= 3 ? 'font-semibold' : ''}>
                                {formatScreenName(screen.screen)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className='text-center font-medium'>
                            {formatTime(screen.totalTimeSeconds)}
                          </TableCell>
                          <TableCell className='text-center'>
                            <Badge variant='outline'>{screen.sessionsCount}</Badge>
                          </TableCell>
                          <TableCell className='text-center'>
                            <Badge variant='secondary'>{screen.uniqueUsersCount}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className='flex items-center gap-2'>
                              <div className='h-1.5 flex-1 overflow-hidden rounded-full bg-muted'>
                                <div
                                  className='h-full rounded-full bg-foreground'
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className='w-8 text-xs text-muted-foreground'>{pct}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
            <TablePagination
              page={page}
              pageSize={pageSize}
              totalItems={totalItems}
              totalPages={totalPages}
              from={from}
              to={to}
              onPageChange={goToPage}
              onPageSizeChange={changePageSize}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}
