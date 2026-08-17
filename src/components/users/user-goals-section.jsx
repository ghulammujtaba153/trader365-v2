'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

import api from '@/lib/api'
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
import { Skeleton } from '@/components/ui/skeleton'

export default function UserGoalsSection({ userId }) {
  const { id: paramId } = useParams()
  const id = userId || paramId
  const [data, setData] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let mounted = true
    const fetchGoals = async () => {
      setLoading(true)
      try {
        const [habitsRes, statsRes] = await Promise.allSettled([
          api.get(`/api/habbits/${id}`),
          api.get(`/api/habbits/stats/${id}`)
        ])
        if (!mounted) return
        const habits =
          habitsRes.status === 'fulfilled'
            ? Array.isArray(habitsRes.value.data)
              ? habitsRes.value.data
              : habitsRes.value.data?.habits || []
            : []
        setData(habits)
        setStats(statsRes.status === 'fulfilled' ? statsRes.value.data : null)
      } catch {
        if (mounted) setData([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchGoals()
    return () => {
      mounted = false
    }
  }, [id])

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
  } = usePagination(data, 10)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Goals & habits</CardTitle>
        <CardDescription>
          {stats
            ? `${stats.total || 0} habits · ${stats.completed || 0} complete now · ${stats.pending || 0} pending · streak ${stats.streak || 0}`
            : 'Habits and goals for this user'}
        </CardDescription>
      </CardHeader>
      <CardContent className='p-0'>
        {loading ? (
          <div className='space-y-2 px-6 pb-6'>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className='h-10 w-full' />
            ))}
          </div>
        ) : data.length === 0 ? (
          <p className='px-6 py-8 text-center text-sm text-muted-foreground'>No goals found</p>
        ) : (
          <>
            <div className='overflow-x-auto px-6'>
              <div className='rounded-xl border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map(goal => (
                      <TableRow key={goal._id}>
                        <TableCell className='font-medium'>{goal.title || '—'}</TableCell>
                        <TableCell>{goal.type || goal.frequency || '—'}</TableCell>
                        <TableCell>
                          {goal.progress != null ? `${goal.progress}%` : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant='outline'>{goal.status || '—'}</Badge>
                        </TableCell>
                        <TableCell className='text-muted-foreground'>
                          {goal.createdAt ? new Date(goal.createdAt).toLocaleDateString() : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
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
