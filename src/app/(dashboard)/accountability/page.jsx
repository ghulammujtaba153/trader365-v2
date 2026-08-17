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

const STAT_CARDS = [
  {
    value: 'all',
    label: 'Total',
    statKey: 'total',
    icon: CircleDot,
    accent: 'text-muted-foreground',
    selectedBorder: 'border-foreground/40',
    selectedBg: 'bg-muted/60',
    selectedBar: 'bg-foreground/50'
  },
  {
    value: 'active',
    label: 'Active',
    statKey: 'active',
    icon: Flag,
    accent: 'text-primary',
    selectedBorder: 'border-primary',
    selectedBg: 'bg-primary/5',
    selectedBar: 'bg-primary'
  },
  {
    value: 'completed',
    label: 'Completed',
    statKey: 'completed',
    icon: CheckCircle2,
    accent: 'text-emerald-600',
    selectedBorder: 'border-emerald-600',
    selectedBg: 'bg-emerald-50',
    selectedBar: 'bg-emerald-600'
  },
  {
    value: 'pending',
    label: 'Pending',
    statKey: 'pending',
    icon: CircleDashed,
    accent: 'text-amber-600',
    selectedBorder: 'border-amber-500',
    selectedBg: 'bg-amber-50',
    selectedBar: 'bg-amber-500'
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
  const [stats, setStats] = useState({ active: 0, completed: 0, total: 0, pending: 0 })
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
        setStats({ active: 0, completed: 0, total: 0, pending: 0 })
        return
      }

      const goalsWithId = res.data.map(normalizeGoalRow)
      setGoals(goalsWithId)
      setStats({
        active: goalsWithId.filter(g => g.status === 'active').length,
        completed: goalsWithId.filter(g => g.status === 'completed').length,
        pending: goalsWithId.filter(g => g.status === 'pending').length,
        total: goalsWithId.length
      })
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()

    return goals.filter(goal => {
      const matchesStatus = statusFilter === 'all' || goal.status === statusFilter
      if (!matchesStatus) return false
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

      <main className='flex-1 space-y-4 px-4 py-4 md:px-6 md:pb-6'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='relative w-full sm:max-w-sm'>
            <Search className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder='Search title or user…'
              className='pl-8'
            />
          </div>
          <p className='text-sm text-muted-foreground'>
            {filtered.length} of {goals.length} goals
          </p>
        </div>

        <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
          {STAT_CARDS.map(card => {
            const Icon = card.icon
            const selected = statusFilter === card.value
            const count = stats[card.statKey] ?? 0

            return (
              <button
                key={card.value}
                type='button'
                aria-pressed={selected}
                onClick={() => setStatusFilter(card.value)}
                className={cn(
                  'relative overflow-hidden rounded-xl border bg-card text-left transition-colors',
                  'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selected ? cn(card.selectedBorder, card.selectedBg) : 'border-border'
                )}
              >
                {selected ? (
                  <span className={cn('absolute inset-y-0 left-0 w-1', card.selectedBar)} />
                ) : null}
                <div className='flex items-start justify-between gap-3 p-4'>
                  <div className='min-w-0 flex-1'>
                    <p className='text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
                      {card.label}
                    </p>
                    <p
                      className={cn(
                        'mt-1 text-2xl font-semibold tracking-tight',
                        selected && card.accent
                      )}
                    >
                      {count}
                    </p>
                    <p className='mt-1 text-xs text-muted-foreground'>
                      {selected ? 'Showing these' : 'Click to filter'}
                    </p>
                  </div>
                  <div
                    className={cn(
                      'grid size-10 shrink-0 place-items-center rounded-xl bg-muted',
                      card.accent
                    )}
                  >
                    <Icon className='size-5' />
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <Card>
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Target date</TableHead>
                        <TableHead>Created</TableHead>
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
                            <TableCell className='font-medium'>
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
                            <TableCell className='max-w-56 truncate' title={goal.title}>
                              {goal.title || '—'}
                            </TableCell>
                            <TableCell>
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
                            <TableCell className='text-muted-foreground'>
                              {formatDate(goal.targetDate)}
                            </TableCell>
                            <TableCell className='text-muted-foreground whitespace-nowrap'>
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
