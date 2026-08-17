'use client'

import { useEffect, useMemo, useState } from 'react'
import { Pencil, Search, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/api'
import { TablePagination, usePagination } from '@/components/common/table-pagination'
import AssignCategoryDialog from '@/components/resources/assign-category-dialog'
import EditCategoriesDialog from '@/components/resources/edit-categories-dialog'
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

const formatLabel = value => {
  if (!value || typeof value !== 'string') return '—'
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ')
}

export default function ContentPermissionsPage() {
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [assignUser, setAssignUser] = useState(null)
  const [editUser, setEditUser] = useState(null)

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
    queueMicrotask(() => {
      fetchUsers()
    })
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      user =>
        user.name?.toLowerCase().includes(q) ||
        user.email?.toLowerCase().includes(q)
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
        title='Content Permissions'
        description='Assign categories to instructors for content access.'
      />

      <main className='flex-1 space-y-4 px-4 py-4 md:px-6 md:pb-6'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='relative w-full sm:max-w-sm'>
            <Search className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder='Search name or email…'
              className='pl-8'
            />
          </div>
          <p className='text-sm text-muted-foreground'>
              {filtered.length} of {users.length} instructors
          </p>
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
                        <TableHead>Categories</TableHead>
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
                                <span className='text-muted-foreground'>No categories</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.status === 'active' ? 'default' : 'outline'}>
                                {formatLabel(user.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className='text-right'>
                              <div className='inline-flex gap-1'>
                                <Button
                                  variant='ghost'
                                  size='icon-sm'
                                  title='Assign category'
                                  onClick={() => setAssignUser(user)}
                                >
                                  <UserPlus className='size-4' />
                                </Button>
                                <Button
                                  variant='ghost'
                                  size='icon-sm'
                                  title='Edit categories'
                                  onClick={() => setEditUser(user)}
                                >
                                  <Pencil className='size-4' />
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

      <AssignCategoryDialog
        open={Boolean(assignUser)}
        onOpenChange={open => !open && setAssignUser(null)}
        user={assignUser}
        onSaved={() => fetchUsers({ silent: true })}
      />

      <EditCategoriesDialog
        open={Boolean(editUser)}
        onOpenChange={open => !open && setEditUser(null)}
        user={editUser}
        onSaved={() => fetchUsers({ silent: true })}
      />
    </>
  )
}
