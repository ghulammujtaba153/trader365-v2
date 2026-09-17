'use client'

import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TablePagination, usePagination } from '@/components/common/table-pagination'
import AdminFormDialog from '@/components/users/admin-form-dialog'
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

export default function AdminsPage() {
  const { user: currentUser } = useAuth()
  const isSuperAdmin = !!currentUser?.isSuperAdmin
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editAdmin, setEditAdmin] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [statusTarget, setStatusTarget] = useState(null)

  const fetchUsers = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true)
      const res = await api.get('/api/auth/admins')
      setUsers(res.data.users || [])
    } catch {
      toast.error('Failed to load admins')
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
      `${user.name || ''} ${user.email || ''} ${user.phone || ''}`.toLowerCase().includes(q)
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
        title='Admins'
        description={
          isSuperAdmin
            ? 'Assign each admin a role and the dashboard pages they can open.'
            : 'View admin accounts. Creating, editing, or deleting requires super-admin access.'
        }
      />

      <main className='flex-1 space-y-4 px-4 py-4 md:px-6 md:pb-6'>
        {!isSuperAdmin ? (
          <div className='rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground'>
            Viewing only. Creating, editing, or deleting admins requires super-admin access.
          </div>
        ) : null}

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
              {filtered.length} of {users.length} admins
            </p>
            {isSuperAdmin ? (
              <Button
                onClick={() => {
                  setEditAdmin(null)
                  setFormOpen(true)
                }}
              >
                <Plus className='size-4' />
                Add admin
              </Button>
            ) : null}
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
                {users.length === 0 ? 'No admins yet.' : 'No matches for your search.'}
              </p>
            ) : (
              <>
                <div className='overflow-x-auto'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Access</TableHead>
                        <TableHead>Status</TableHead>
                        {isSuperAdmin ? <TableHead className='text-right'>Actions</TableHead> : null}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedItems.map(user => (
                        <TableRow key={user._id}>
                          <TableCell className='font-medium'>{user.name || '—'}</TableCell>
                          <TableCell className='text-muted-foreground'>{user.email || '—'}</TableCell>
                          <TableCell>
                            {user.isSuperAdmin ? (
                              <Badge>Super-admin</Badge>
                            ) : (
                              <Badge variant='outline'>{user.adminLabel || 'Admin'}</Badge>
                            )}
                          </TableCell>
                          <TableCell className='text-muted-foreground'>
                            {user.isSuperAdmin
                              ? 'All pages'
                              : `${resolveDashboardAccess(user).length} pages`}
                          </TableCell>
                          <TableCell>
                            <div className='flex items-center gap-2'>
                              {isSuperAdmin ? (
                                <Switch
                                  checked={user.status === 'active'}
                                  onCheckedChange={() =>
                                    setStatusTarget({
                                      id: user._id,
                                      next: user.status === 'active' ? 'suspended' : 'active'
                                    })
                                  }
                                />
                              ) : null}
                              <Badge variant={user.status === 'active' ? 'default' : 'outline'}>
                                {formatLabel(user.status)}
                              </Badge>
                            </div>
                          </TableCell>
                          {isSuperAdmin ? (
                            <TableCell className='text-right'>
                              {user.isSuperAdmin ? (
                                <span className='text-sm text-muted-foreground'>—</span>
                              ) : (
                                <div className='inline-flex gap-1'>
                                  <Button
                                    variant='ghost'
                                    size='icon-sm'
                                    onClick={() => {
                                      setEditAdmin(user)
                                      setFormOpen(true)
                                    }}
                                  >
                                    <Pencil className='size-4' />
                                  </Button>
                                  <Button
                                    variant='ghost'
                                    size='icon-sm'
                                    onClick={() => setDeleteId(user._id)}
                                  >
                                    <Trash2 className='size-4 text-destructive' />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          ) : null}
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

      {isSuperAdmin ? (
        <AdminFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          admin={editAdmin}
          onSaved={() => fetchUsers({ silent: true })}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={open => !open && setDeleteId(null)}
        title='Permanently delete this admin?'
        description='This hard-deletes the admin account and all linked personal data. This cannot be undone.'
        confirmText='Delete'
        destructive
        onConfirm={async () => {
          await api.delete(`/api/auth/users/${deleteId}`)
          await fetchUsers({ silent: true })
          return 'Admin deleted successfully'
        }}
      />

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onOpenChange={open => !open && setStatusTarget(null)}
        title={statusTarget?.next === 'active' ? 'Activate admin?' : 'Suspend admin?'}
        description={
          statusTarget?.next === 'active'
            ? 'This will restore the admin’s access to the dashboard.'
            : 'This will block the admin from accessing the dashboard.'
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
