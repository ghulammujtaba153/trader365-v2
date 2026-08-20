'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Clock,
  CreditCard,
  Download,
  Eye,
  Mail,
  Pencil,
  Plus,
  Search,
  TimerOff,
  Trash2,
  UserMinus,
  UserRoundSearch,
  Users
} from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/api'
import { formatLabel, formatRelativeTime, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TablePagination, usePagination } from '@/components/common/table-pagination'
import UserFormDialog from '@/components/users/user-form-dialog'
import DashboardHeader from '@/components/layout/dashboard-header'
import MetricCard from '@/components/dashboard/metric-card'
import { MetricCardsRowSkeleton } from '@/components/dashboard/skeletons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000
const HIGH_USAGE_SECONDS = 2 * 60 * 60

const activitySeconds = user => Number(user.activityTimeSeconds) || 0

const lastActivityMs = user => {
  if (!user.lastActivity) return 0
  const time = new Date(user.lastActivity).getTime()
  return Number.isNaN(time) ? 0 : time
}

const isInactive = user => {
  const last = lastActivityMs(user)
  if (!last) return true
  return Date.now() - last >= SEVEN_DAYS_MS
}

const needsOutreach = user => {
  const unused = activitySeconds(user) === 0
  const created = user.createdAt ? new Date(user.createdAt).getTime() : 0
  const staleSignup = unused && created && Date.now() - created >= THREE_DAYS_MS
  return (Boolean(user.isPremium) && isInactive(user)) || staleSignup
}

const FILTERS = [
  {
    id: 'all',
    title: 'All users',
    subtitle: 'Every app account',
    icon: Users,
    accentClass: 'bg-muted text-foreground',
    match: () => true
  },
  {
    id: 'never',
    title: 'Never used',
    subtitle: 'No recorded time',
    icon: TimerOff,
    accentClass: 'bg-amber-100 text-amber-800',
    match: user => activitySeconds(user) === 0
  },
  {
    id: 'inactive',
    title: 'Inactive 7d+',
    subtitle: 'No recent activity',
    icon: Clock,
    accentClass: 'bg-muted text-foreground',
    match: isInactive
  },
  {
    id: 'outreach',
    title: 'Needs outreach',
    subtitle: 'Premium idle or unused 3d+',
    icon: UserRoundSearch,
    accentClass: 'bg-amber-100 text-amber-800',
    match: needsOutreach
  },
  {
    id: 'high',
    title: 'High usage',
    subtitle: '2h+ in the app',
    icon: Clock,
    accentClass: 'bg-muted text-foreground',
    match: user => activitySeconds(user) >= HIGH_USAGE_SECONDS
  },
  {
    id: 'premium',
    title: 'Premium',
    subtitle: 'Paid or granted',
    icon: CreditCard,
    accentClass: 'bg-muted text-foreground',
    match: user => Boolean(user.isPremium)
  },
  {
    id: 'newsletter',
    title: 'Newsletter',
    subtitle: 'Consented to emails',
    icon: Mail,
    accentClass: 'bg-muted text-foreground',
    match: user => Boolean(user.newsLetterConsent)
  },
  {
    id: 'suspended',
    title: 'Suspended',
    subtitle: 'Blocked accounts',
    icon: UserMinus,
    accentClass: 'bg-muted text-foreground',
    match: user => user.status === 'suspended'
  }
]

const csvEscape = value => {
  const text = value == null ? '' : String(value)
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

const exportNewsletterCsv = users => {
  const consenting = users.filter(user => Boolean(user.newsLetterConsent))
  const headers = [
    'name',
    'email',
    'phone',
    'newsLetterConsent',
    'newsLetterConsentAt',
    'status',
    'isPremium',
    'createdAt'
  ]
  const rows = consenting.map(user =>
    [
      user.name || '',
      user.email || '',
      user.phone ?? '',
      user.newsLetterConsent ? 'true' : 'false',
      user.newsLetterConsentAt
        ? new Date(user.newsLetterConsentAt).toISOString()
        : '',
      user.status || '',
      user.isPremium ? 'true' : 'false',
      user.createdAt ? new Date(user.createdAt).toISOString() : ''
    ]
      .map(csvEscape)
      .join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `newsletter-consenting-users-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  return consenting.length
}

function UsersPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedFilter = searchParams.get('filter') || 'all'
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState(
    FILTERS.some(item => item.id === requestedFilter) ? requestedFilter : 'all'
  )
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [statusTarget, setStatusTarget] = useState(null)

  const fetchUsers = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true)
      const res = await api.get('/api/auth/users')
      setUsers(res.data.users || [])
    } catch {
      toast.error('Failed to load users')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    if (FILTERS.some(item => item.id === requestedFilter)) setFilter(requestedFilter)
  }, [requestedFilter])

  const applyFilter = id => {
    setFilter(id)
    router.replace(id === 'all' ? '/users' : `/users?filter=${id}`, { scroll: false })
  }

  const counts = useMemo(() => {
    const next = {}
    for (const item of FILTERS) {
      next[item.id] = users.filter(item.match).length
    }
    return next
  }, [users])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const matcher = FILTERS.find(item => item.id === filter)?.match || (() => true)

    return users
      .filter(matcher)
      .filter(user => {
        if (!q) return true
        return (
          user.name?.toLowerCase().includes(q) ||
          user.email?.toLowerCase().includes(q) ||
          user.phone?.toString().includes(q)
        )
      })
      .sort((a, b) => {
        const lastDiff = lastActivityMs(b) - lastActivityMs(a)
        if (lastDiff) return lastDiff
        return activitySeconds(b) - activitySeconds(a)
      })
  }, [users, search, filter])

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
        title='Users'
        description='See who is using the app, how long they spend, and who needs follow-up.'
      />

      <main className='flex-1 space-y-4 px-4 py-4 md:px-6 md:pb-6'>
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {FILTERS.map(item => {
            const selected = filter === item.id
            return (
              <button
                key={item.id}
                type='button'
                onClick={() => applyFilter(item.id)}
                className={cn(
                  'rounded-xl text-left transition-shadow',
                  selected ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background' : 'hover:shadow-sm'
                )}
              >
                <MetricCard
                  title={item.title}
                  value={counts[item.id] || 0}
                  subtitle={item.subtitle}
                  icon={item.icon}
                  accentClass={item.accentClass}
                  format='number'
                />
              </button>
            )
          })}
        </div>

        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='relative w-full sm:max-w-sm'>
            <Search className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder='Search name, email, phone…'
              className='pl-8'
            />
          </div>
          <div className='flex items-center gap-2'>
            <p className='text-sm text-muted-foreground'>
              {filtered.length} of {users.length} users
            </p>
            <Button
              variant='outline'
              onClick={() => {
                const count = exportNewsletterCsv(users)
                if (count === 0) toast.message('No consenting users to export')
                else toast.success(`Exported ${count} consenting user${count === 1 ? '' : 's'}`)
              }}
            >
              <Download className='size-4' />
              Export newsletter CSV
            </Button>
            <Button
              onClick={() => {
                setSelectedUser(null)
                setFormOpen(true)
              }}
            >
              <Plus className='size-4' />
              Add user
            </Button>
          </div>
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
                {users.length === 0 ? 'No users yet.' : 'No matches for this filter.'}
              </p>
            ) : (
              <>
                <div className='overflow-x-auto'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Activity time</TableHead>
                        <TableHead>Last active</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Newsletter</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className='text-right'>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedItems.map(user => (
                        <TableRow key={user._id}>
                          <TableCell className='font-medium'>{user.name || '—'}</TableCell>
                          <TableCell className='text-muted-foreground'>{user.email || '—'}</TableCell>
                          <TableCell>
                            <div>
                              <p className='font-medium'>{formatTime(activitySeconds(user))}</p>
                              <p className='text-xs text-muted-foreground'>
                                {user.sessionsCount || 0} session{(user.sessionsCount || 0) === 1 ? '' : 's'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p>{formatRelativeTime(user.lastActivity)}</p>
                            {user.lastActivity ? (
                              <p className='text-xs text-muted-foreground'>
                                {new Date(user.lastActivity).toLocaleDateString()}
                              </p>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isPremium ? 'default' : 'outline'}>
                              {user.isPremium ? 'Premium' : 'Free'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <Badge variant={user.newsLetterConsent ? 'default' : 'outline'}>
                                {user.newsLetterConsent ? 'Yes' : 'No'}
                              </Badge>
                              {user.newsLetterConsentAt ? (
                                <p className='mt-1 text-xs text-muted-foreground'>
                                  {new Date(user.newsLetterConsentAt).toLocaleDateString()}
                                </p>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className='flex items-center gap-2'>
                              <Switch
                                checked={user.status === 'active'}
                                onCheckedChange={() =>
                                  setStatusTarget({
                                    id: user._id,
                                    next: user.status === 'active' ? 'suspended' : 'active'
                                  })
                                }
                              />
                              <Badge variant={user.status === 'active' ? 'default' : 'outline'}>
                                {formatLabel(user.status)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className='text-right'>
                            <div className='inline-flex gap-1'>
                              <Button
                                variant='ghost'
                                size='icon-sm'
                                onClick={() => router.push(`/users/${user._id}`)}
                              >
                                <Eye className='size-4' />
                              </Button>
                              <Button
                                variant='ghost'
                                size='icon-sm'
                                onClick={() => {
                                  setSelectedUser(user)
                                  setFormOpen(true)
                                }}
                              >
                                <Pencil className='size-4' />
                              </Button>
                              <Button variant='ghost' size='icon-sm' onClick={() => setDeleteId(user._id)}>
                                <Trash2 className='size-4 text-destructive' />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
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

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        user={selectedUser}
        onSaved={() => fetchUsers({ silent: true })}
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={open => !open && setDeleteId(null)}
        title='Permanently delete this user?'
        description='This hard-deletes the account and all linked data: trades, sessions, chats, habits, moods, subscriptions, tickets, and more. This cannot be undone.'
        confirmText='Delete forever'
        destructive
        onConfirm={async () => {
          await api.delete(`/api/auth/users/${deleteId}`)
          await fetchUsers({ silent: true })
          return 'User and linked data permanently deleted'
        }}
      />

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onOpenChange={open => !open && setStatusTarget(null)}
        title={statusTarget?.next === 'active' ? 'Activate user?' : 'Suspend user?'}
        description={
          statusTarget?.next === 'active'
            ? 'This will restore the user’s access to the app.'
            : 'This will block the user from accessing the app.'
        }
        confirmText={statusTarget?.next === 'active' ? 'Activate' : 'Suspend'}
        destructive={statusTarget?.next === 'suspended'}
        onConfirm={async () => {
          await api.patch(`/api/auth/users/${statusTarget.id}/status`, { status: statusTarget.next })
          await fetchUsers({ silent: true })
          return `User status updated to ${statusTarget.next}`
        }}
      />
    </>
  )
}

export default function UsersPage() {
  return (
    <Suspense
      fallback={
        <>
          <DashboardHeader
            title='Users'
            description='See who is using the app, how long they spend, and who needs follow-up.'
          />
          <main className='flex-1 space-y-4 px-4 py-4 md:px-6 md:pb-6'>
            <MetricCardsRowSkeleton count={4} />
          </main>
        </>
      }
    >
      <UsersPageContent />
    </Suspense>
  )
}
