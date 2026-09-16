'use client'

import { useEffect, useMemo, useState } from 'react'
import { Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/api'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TablePagination, usePagination } from '@/components/common/table-pagination'
import InstructorFormDialog from '@/components/users/instructor-form-dialog'
import InstructorViewDialog from '@/components/users/instructor-view-dialog'
import DashboardHeader from '@/components/layout/dashboard-header'
import { resolveDashboardAccess } from '@/lib/dashboard-access'
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

const formatLabel = value => {
  if (!value || typeof value !== 'string') return '—'
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ')
}

export default function InstructorsPage() {
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [selectedInstructor, setSelectedInstructor] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [statusTarget, setStatusTarget] = useState(null)

  const fetchUsers = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true)
      const res = await api.get('/api/auth/editors')
      setUsers(res.data.users || [])
    } catch {
      toast.error('Failed to load instructors')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(user =>
      `${user.name || ''} ${user.email || ''} ${user.phone || ''} ${(user.categories || []).join(' ')}`
        .toLowerCase()
        .includes(q)
    )
  }, [users, search])

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
        title='Instructors'
        description='Manage instructor accounts, content categories, and which dashboard pages each instructor can open.'
      />

      <main className='flex-1 space-y-4 px-4 py-4 md:px-6 md:pb-6'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='relative w-full sm:max-w-sm'>
            <Search className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder='Search name, email, phone, category…'
              className='pl-8'
            />
          </div>
          <div className='flex items-center gap-2'>
            <p className='text-sm text-muted-foreground'>
              {filtered.length} of {users.length} instructors
            </p>
            <Button
              onClick={() => {
                setSelectedInstructor(null)
                setFormOpen(true)
              }}
            >
              <Plus className='size-4' />
              Add instructor
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className='p-0'>
            {loading ? (
              <div className='space-y-3 p-4'>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className='h-10 w-full' />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className='py-12 text-center text-sm text-muted-foreground'>
                {users.length === 0 ? 'No instructors yet.' : 'No matches for your search.'}
              </p>
            ) : (
              <>
                <div className='overflow-x-auto'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Categories</TableHead>
                        <TableHead>Access</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className='text-right'>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedItems.map(user => {
                        const categories = Array.isArray(user.categories) ? user.categories : []
                        return (
                          <TableRow key={user._id}>
                            <TableCell className='font-medium'>{user.name || '—'}</TableCell>
                            <TableCell className='text-muted-foreground'>{user.email || '—'}</TableCell>
                            <TableCell className='text-muted-foreground'>{user.phone || '—'}</TableCell>
                            <TableCell>
                              {categories.length ? (
                                <div className='flex flex-wrap gap-1'>
                                  {categories.map(cat => (
                                    <Badge key={`${user._id}-${cat}`} variant='secondary'>
                                      {cat}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className='text-muted-foreground'>None</span>
                              )}
                            </TableCell>
                            <TableCell className='text-muted-foreground'>
                              {`${resolveDashboardAccess({ ...user, role: 'editor' }).length} pages`}
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
                                  title='View'
                                  onClick={() => {
                                    setSelectedInstructor(user)
                                    setViewOpen(true)
                                  }}
                                >
                                  <Eye className='size-4' />
                                </Button>
                                <Button
                                  variant='ghost'
                                  size='icon-sm'
                                  title='Edit'
                                  onClick={() => {
                                    setSelectedInstructor(user)
                                    setFormOpen(true)
                                  }}
                                >
                                  <Pencil className='size-4' />
                                </Button>
                                <Button
                                  variant='ghost'
                                  size='icon-sm'
                                  title='Delete'
                                  onClick={() => setDeleteId(user._id)}
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

      <InstructorViewDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        instructor={selectedInstructor}
      />

      <InstructorFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        instructor={selectedInstructor}
        onSaved={() => fetchUsers({ silent: true })}
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={open => !open && setDeleteId(null)}
        title='Permanently delete this instructor?'
        description='This hard-deletes the instructor account. Content that referenced them may lose its instructor assignment.'
        confirmText='Delete'
        destructive
        onConfirm={async () => {
          await api.delete(`/api/auth/users/${deleteId}`)
          await fetchUsers({ silent: true })
          return 'Instructor deleted successfully'
        }}
      />

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onOpenChange={open => !open && setStatusTarget(null)}
        title={statusTarget?.next === 'active' ? 'Activate instructor?' : 'Suspend instructor?'}
        description={
          statusTarget?.next === 'active'
            ? 'This will restore the instructor’s access.'
            : 'This will block the instructor from accessing the app.'
        }
        confirmText={statusTarget?.next === 'active' ? 'Activate' : 'Suspend'}
        destructive={statusTarget?.next === 'suspended'}
        onConfirm={async () => {
          await api.patch(`/api/auth/users/${statusTarget.id}/status`, { status: statusTarget.next })
          await fetchUsers({ silent: true })
          return `Instructor status updated to ${statusTarget.next}`
        }}
      />
    </>
  )
}
