'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  CircleDashed,
  Eye,
  Flag,
  Search,
  Trash2,
  CircleDot
} from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TablePagination, usePagination } from '@/components/common/table-pagination'
import GoalViewDialog from '@/components/accountability/goal-view-dialog'
import DashboardHeader from '@/components/layout/dashboard-header'
import MetricCard from '@/components/dashboard/metric-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'

const FILTERS = [
  {
    id: 'all',
    title: 'All goals',
    subtitle: 'Every habit & goal',
    icon: CircleDot,
    match: () => true
  },
  {
    id: 'active',
    title: 'Active',
    subtitle: 'In progress',
    icon: Flag,
    match: goal => goal.status === 'active'
  },
  {
    id: 'completed',
    title: 'Completed',
    subtitle: 'Finished goals',
    icon: CheckCircle2,
    match: goal => goal.status === 'completed'
  },
  {
    id: 'pending',
    title: 'Pending',
    subtitle: 'Not started yet',
    icon: CircleDashed,
    match: goal => goal.status === 'pending'
  }
]

const normalizeGoalRow = habit => ({
  ...habit,
  id: habit._id,
  frequency: habit.type || habit.frequency || '—'
})

const capitalize = value => {
  if (!value || typeof value !== 'string') return '—'
  return value.charAt(0).toUpperCase() + value.slice(1)
}

const formatDate = (value, withTime = false) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return withTime ? date.toLocaleString() : date.toLocaleDateString()
}

const statusBadgeVariant = status => {
  switch (status) {
    case 'completed':
      return 'default'
    case 'pending':
      return 'secondary'
    case 'active':
    default:
      return 'outline'
  }
}

export default function AccountabilityPage() {
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewGoal, setViewGoal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const fetchGoals = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true)
      const res = await api.get('/api/habbits')

      if (!Array.isArray(res.data)) {
        toast.error('Unexpected response format from server')
        setGoals([])
        return
      }

      setGoals(res.data.map(normalizeGoalRow))
    } catch {
      toast.error('Failed to load goals')
      setGoals([])
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      fetchGoals()
    })
  }, [])

  const counts = useMemo(() => {
    const next = {}
    for (const item of FILTERS) next[item.id] = goals.filter(item.match).length
    return next
  }, [goals])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const matcher = FILTERS.find(item => item.id === statusFilter)?.match || (() => true)

    return goals.filter(goal => {
      if (!matcher(goal)) return false
      if (!q) return true

      const name = goal.userId?.name?.toLowerCase() || ''
      const title = goal.title?.toLowerCase() || ''

      return title.includes(q) || name.includes(q)
    })
  }, [goals, search, statusFilter])

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
  } = usePagination(filtered, 10)

  return (
    <>
      <DashboardHeader
        title='Accountability'
        description='Review user goals and habits — status, frequency, and targets.'
      />

      <main className='flex-1 space-y-4 px-3 py-4 sm:px-4 md:px-6 md:pb-6'>
        <div className='grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4'>
          {FILTERS.map(item => {
            const selected = statusFilter === item.id
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type='button'
                onClick={() => setStatusFilter(item.id)}
                className={cn(
                  'min-w-0 w-full rounded-xl text-left transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selected && 'ring-2 ring-foreground/20'
                )}
              >
                <MetricCard
                  title={item.title}
                  value={counts[item.id] || 0}
                  subtitle={selected ? 'Filtering list' : item.subtitle}
                  icon={Icon}
                  format='number'
                />
              </button>
            )
          })}
        </div>

        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3'>
          <div className='relative w-full sm:max-w-sm'>
            <Search className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder='Search title or user…'
              className='pl-8'
            />
          </div>
          <p className='shrink-0 text-sm text-muted-foreground'>
            {filtered.length} of {goals.length} goals
          </p>
        </div>

        <Card className='min-w-0 overflow-hidden'>
          <CardContent className='p-0'>
            {loading ? (
              <div className='space-y-3 p-4'>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className='h-10 w-full' />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className='py-12 text-center text-sm text-muted-foreground'>
                {goals.length === 0 ? 'No goals yet.' : 'No matches for your search.'}
              </p>
            ) : (
              <>
                <div className='overflow-x-auto'>
                  <Table className='min-w-[640px]'>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead className='hidden sm:table-cell'>Frequency</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className='hidden md:table-cell'>Target date</TableHead>
                        <TableHead className='hidden lg:table-cell'>Created</TableHead>
                        <TableHead className='text-right'>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedItems.map(goal => {
                        const user = goal.userId && typeof goal.userId === 'object' ? goal.userId : null
                        const userId =
                          user?._id || (typeof goal.userId === 'string' ? goal.userId : null)
                        const userName = user?.name || 'N/A'

                        return (
                          <TableRow key={goal._id || goal.id}>
                            <TableCell className='max-w-[8rem] truncate font-medium sm:max-w-none'>
                              {userId ? (
                                <Link
                                  href={`/users/${userId}`}
                                  className='text-primary hover:underline'
                                >
                                  {userName}
                                </Link>
                              ) : (
                                userName
                              )}
                            </TableCell>
                            <TableCell className='max-w-[10rem] truncate sm:max-w-56' title={goal.title}>
                              {goal.title || '—'}
                            </TableCell>
                            <TableCell className='hidden sm:table-cell'>
                              <Badge variant='outline' className='capitalize'>
                                {capitalize(goal.frequency)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={statusBadgeVariant(goal.status)}
                                className='capitalize'
                              >
                                {capitalize(goal.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className='hidden text-muted-foreground md:table-cell'>
                              {formatDate(goal.targetDate)}
                            </TableCell>
                            <TableCell className='hidden whitespace-nowrap text-muted-foreground lg:table-cell'>
                              {formatDate(goal.createdAt, true)}
                            </TableCell>
                            <TableCell className='text-right'>
                              <div className='inline-flex gap-1'>
                                <Button
                                  variant='ghost'
                                  size='icon-sm'
                                  onClick={() => setViewGoal(goal)}
                                  aria-label='View goal'
                                >
                                  <Eye className='size-4' />
                                </Button>
                                <Button
                                  variant='ghost'
                                  size='icon-sm'
                                  onClick={() => setDeleteTarget(goal)}
                                  aria-label='Delete goal'
                                >
                                  <Trash2 className='size-4 text-destructive' />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
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
      </main>

      <GoalViewDialog
        open={Boolean(viewGoal)}
        onOpenChange={open => !open && setViewGoal(null)}
        goal={viewGoal}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title='Delete goal?'
        description={`Are you sure you want to delete "${deleteTarget?.title || 'this goal'}"? This will soft-delete the goal.`}
        confirmText='Delete'
        destructive
        onConfirm={async () => {
          await api.delete(`/api/habbits/${deleteTarget._id || deleteTarget.id}`)
          await fetchGoals({ silent: true })
          return 'Goal deleted successfully'
        }}
      />
    </>
  )
}
