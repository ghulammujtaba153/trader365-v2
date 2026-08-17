'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertCircle,
  CheckCircle2,
  CircleOff,
  Eye,
  Flag,
  Hourglass,
  Search
} from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TablePagination, usePagination } from '@/components/common/table-pagination'
import IssueViewDialog, {
  STATUS_META,
  formatTicketType,
  getNextAction
} from '@/components/issues/issue-view-dialog'
import MetricCard from '@/components/dashboard/metric-card'
import DashboardHeader from '@/components/layout/dashboard-header'
import { MetricCardsRowSkeleton } from '@/components/dashboard/skeletons'
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
import { formatDateTime, formatWaitingAge, recordCreatedAt } from '@/lib/format'

const METRIC_CARDS = [
  {
    value: 'all',
    title: 'Total',
    subtitle: 'All tickets',
    icon: AlertCircle,
    accentClass: 'bg-muted text-foreground'
  },
  {
    value: 'open',
    title: 'Open',
    subtitle: 'Awaiting action',
    icon: AlertCircle,
    accentClass: 'bg-red-100 text-red-800'
  },
  {
    value: 'in-progress',
    title: 'In progress',
    subtitle: 'Being handled',
    icon: Hourglass,
    accentClass: 'bg-amber-100 text-amber-800'
  },
  {
    value: 'resolved',
    title: 'Resolved',
    subtitle: 'Waiting to close',
    icon: CheckCircle2,
    accentClass: 'bg-muted text-foreground'
  },
  {
    value: 'closed',
    title: 'Closed',
    subtitle: 'Completed',
    icon: CircleOff,
    accentClass: 'bg-muted text-foreground'
  },
  {
    value: 'unassigned',
    title: 'Unassigned',
    subtitle: 'No owner yet',
    icon: Flag,
    accentClass: 'bg-muted text-foreground'
  },
  {
    value: 'overdue',
    title: 'Waiting 48h+',
    subtitle: 'Open too long',
    icon: AlertCircle,
    accentClass: 'bg-red-100 text-red-800'
  }
]

const TYPE_FILTERS = [
  { value: 'all', label: 'All types' },
  { value: 'help-center', label: 'Help Center' },
  { value: 'delete-account', label: 'Account Deletion' },
  { value: 'app', label: 'In-app' }
]

const STATUS_ORDER = { open: 1, 'in-progress': 2, resolved: 3, closed: 4 }

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000
const OPEN_STATUSES = new Set(['open', 'in-progress'])

const ticketAgeMs = row => {
  const created = recordCreatedAt(row)
  return created ? Date.now() - created.getTime() : 0
}

const isUnassigned = row => !row.assignedTo && !row.assigneeName
const isOverdue = row => OPEN_STATUSES.has(row.status) && ticketAgeMs(row) >= FORTY_EIGHT_HOURS_MS

const normalizeIssue = item => ({
  ...item,
  id: item._id,
  name: item.userId?.name || item.contactName || 'N/A',
  email: item.contactEmail || item.userId?.email || '—',
  phone: item.userId?.phone || '—',
  rawUserId: item.userId?._id,
  assigneeName: item.assignedTo?.name || null,
  statusOrder: STATUS_ORDER[item.status] || 5
})

export default function IssuesPage() {
  return (
    <Suspense
      fallback={
        <>
          <DashboardHeader
            title='Support Tickets'
            description='Help center requests, account deletion requests, and in-app tickets. Assign admins and email progress updates.'
          />
          <main className='flex-1 space-y-4 px-4 py-4 md:px-6 md:pb-6'>
            <MetricCardsRowSkeleton count={4} />
          </main>
        </>
      }
    >
      <IssuesPageContent />
    </Suspense>
  )
}

function IssuesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedStatus = searchParams.get('status') || 'all'
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [admins, setAdmins] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(
    METRIC_CARDS.some(card => card.value === requestedStatus) ? requestedStatus : 'all'
  )
  const [typeFilter, setTypeFilter] = useState('all')
  const [viewOpen, setViewOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [statusTarget, setStatusTarget] = useState(null)

  const fetchIssues = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true)
      const [problemRes, adminsRes] = await Promise.all([
        api.get('/api/problem'),
        api.get('/api/auth/admins')
      ])
      const list = Array.isArray(problemRes.data) ? problemRes.data : []
      const formatted = list.map(normalizeIssue)
      formatted.sort(
        (a, b) =>
          a.statusOrder - b.statusOrder ||
          (recordCreatedAt(b)?.getTime() || 0) - (recordCreatedAt(a)?.getTime() || 0)
      )
      setRows(formatted)
      setAdmins(Array.isArray(adminsRes.data?.users) ? adminsRes.data.users : [])
    } catch {
      toast.error('Failed to load support tickets')
      setRows([])
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      fetchIssues()
    })
  }, [])

  useEffect(() => {
    if (METRIC_CARDS.some(card => card.value === requestedStatus)) setStatusFilter(requestedStatus)
  }, [requestedStatus])

  const applyStatus = value => {
    setStatusFilter(value)
    router.replace(value === 'all' ? '/issues' : `/issues?status=${value}`, { scroll: false })
  }

  const stats = useMemo(
    () => ({
      all: rows.length,
      open: rows.filter(r => r.status === 'open').length,
      'in-progress': rows.filter(r => r.status === 'in-progress').length,
      resolved: rows.filter(r => r.status === 'resolved').length,
      closed: rows.filter(r => r.status === 'closed').length,
      unassigned: rows.filter(r => OPEN_STATUSES.has(r.status) && isUnassigned(r)).length,
      overdue: rows.filter(isOverdue).length
    }),
    [rows]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()

    const list = rows.filter(row => {
      let matchesStatus = true
      if (statusFilter === 'unassigned') {
        matchesStatus = OPEN_STATUSES.has(row.status) && isUnassigned(row)
      } else if (statusFilter === 'overdue') {
        matchesStatus = isOverdue(row)
      } else if (statusFilter !== 'all') {
        matchesStatus = row.status === statusFilter
      }
      if (!matchesStatus) return false

      if (typeFilter === 'help-center') {
        const isHelp =
          row.source === 'help-center' ||
          row.type === 'Help Center' ||
          row.type === 'support'
        if (!isHelp) return false
      } else if (typeFilter === 'delete-account') {
        if (row.source !== 'delete-account' && row.type !== 'Account Deletion') return false
      } else if (typeFilter === 'app') {
        if (row.source && row.source !== 'app') return false
        if (row.source === 'help-center' || row.source === 'delete-account') return false
      }

      if (!q) return true

      return (
        row.name?.toLowerCase().includes(q) ||
        row.email?.toLowerCase().includes(q) ||
        row.type?.toLowerCase().includes(q) ||
        row.description?.toLowerCase().includes(q) ||
        row.assigneeName?.toLowerCase().includes(q)
      )
    })

    if (statusFilter === 'overdue' || statusFilter === 'unassigned' || statusFilter === 'open') {
      list.sort((a, b) => ticketAgeMs(b) - ticketAgeMs(a))
    }

    return list
  }, [rows, search, statusFilter, typeFilter])

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

  const requestStatusChange = (id, status) => {
    const meta = STATUS_META[status] || { label: status }
    setStatusTarget({ id, status, label: meta.label })
  }

  const mergeIssue = nextIssue => {
    const normalized = normalizeIssue(nextIssue)
    setRows(prev => prev.map(row => (row.id === normalized.id || row._id === normalized._id ? { ...row, ...normalized } : row)))
    setSelected(prev =>
      prev && (prev.id === normalized.id || prev._id === normalized._id)
        ? { ...prev, ...normalized }
        : prev
    )
  }

  return (
    <>
      <DashboardHeader
        title='Support Tickets'
        description='Help center requests, account deletion requests, and in-app tickets. Assign admins and email progress updates.'
      />

      <main className='flex-1 space-y-4 px-4 py-4 md:px-6 md:pb-6'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <p className='text-sm text-muted-foreground'>
            {statusFilter === 'all'
              ? 'Showing all tickets'
              : statusFilter === 'unassigned'
                ? 'Showing unassigned open tickets'
                : statusFilter === 'overdue'
                  ? 'Showing open tickets waiting 48 hours or more'
                  : `Showing ${STATUS_META[statusFilter]?.label || statusFilter} tickets`}
          </p>
          <div className='flex flex-wrap items-center gap-2'>
            <div className='relative w-full sm:w-64'>
              <Search className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder='Search name, email, type, assignee…'
                className='pl-8'
              />
            </div>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className='h-8 rounded-lg border border-input bg-background px-2.5 text-sm'
            >
              {TYPE_FILTERS.map(item => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <p className='text-sm text-muted-foreground'>
              {filtered.length} of {rows.length}
            </p>
          </div>
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
                onClick={() => applyStatus(card.value)}
                className={cn(
                  'rounded-xl text-left transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selected && 'ring-2 ring-foreground/20'
                )}
              >
                <MetricCard
                  title={card.title}
                  value={stats[card.value] ?? 0}
                  subtitle={selected ? 'Filtering tickets' : card.subtitle}
                  icon={Icon}
                  accentClass={card.accentClass}
                  format='number'
                />
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
                {rows.length === 0 ? 'No support tickets yet.' : 'No matches for your search.'}
              </p>
            ) : (
              <>
                <div className='overflow-x-auto'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className='min-w-[12rem]'>Description</TableHead>
                        <TableHead>Assignee</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Waiting</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className='w-[7.5rem] text-right'>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedItems.map(row => {
                        const meta = STATUS_META[row.status] || {
                          label: row.status,
                          variant: 'outline'
                        }
                        const next = getNextAction(row.status)
                        const NextIcon = next?.icon
                        const isDeletion =
                          row.source === 'delete-account' || row.type === 'Account Deletion'

                        return (
                          <TableRow key={row.id || row._id}>
                            <TableCell className='whitespace-normal text-muted-foreground'>
                              {row.email || '—'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={isDeletion ? 'destructive' : 'outline'}>
                                {formatTicketType(row.type)}
                              </Badge>
                            </TableCell>
                            <TableCell
                              className='max-w-0 whitespace-normal text-muted-foreground'
                              title={row.description}
                            >
                              <p className='line-clamp-2 break-words'>
                                {row.description || '—'}
                              </p>
                            </TableCell>
                            <TableCell className='text-muted-foreground'>
                              {row.assigneeName || 'Unassigned'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={meta.variant} className={meta.className}>
                                {meta.label}
                              </Badge>
                            </TableCell>
                            <TableCell className='whitespace-nowrap text-muted-foreground'>
                              {OPEN_STATUSES.has(row.status) ? formatWaitingAge(recordCreatedAt(row)) : '—'}
                            </TableCell>
                            <TableCell className='whitespace-nowrap text-muted-foreground'>
                              {formatDateTime(recordCreatedAt(row))}
                            </TableCell>
                            <TableCell className='whitespace-nowrap text-right'>
                              <div className='inline-flex items-center gap-0.5'>
                                <Button
                                  variant='ghost'
                                  size='icon-sm'
                                  onClick={() => {
                                    setSelected(row)
                                    setViewOpen(true)
                                  }}
                                  aria-label='View ticket'
                                  title='View'
                                >
                                  <Eye className='size-4' />
                                </Button>
                                {next ? (
                                  <Button
                                    variant='ghost'
                                    size='icon-sm'
                                    onClick={() => requestStatusChange(row.id, next.status)}
                                    aria-label={next.label}
                                    title={next.label}
                                  >
                                    {NextIcon ? <NextIcon className='size-4' /> : null}
                                  </Button>
                                ) : null}
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

      <IssueViewDialog
        open={viewOpen}
        onOpenChange={open => {
          setViewOpen(open)
          if (!open) setSelected(null)
        }}
        issue={selected}
        admins={admins}
        onUpdated={mergeIssue}
        onStatusChange={(id, status) => {
          requestStatusChange(id, status)
        }}
      />

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onOpenChange={open => !open && setStatusTarget(null)}
        title={`Mark ticket as ${statusTarget?.label}?`}
        description={`This will update the ticket status to "${statusTarget?.label}".`}
        confirmText='Update'
        onConfirm={async () => {
          const { id, status, label } = statusTarget
          const res = await api.patch(`/api/problem/${id}`, { status })
          if (res.data?.problem) mergeIssue(res.data.problem)
          else await fetchIssues({ silent: true })
          return `Ticket marked as ${label}`
        }}
      />
    </>
  )
}
