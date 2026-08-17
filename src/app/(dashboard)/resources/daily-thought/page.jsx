'use client'

import { useEffect, useMemo, useState } from 'react'
import { Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/api'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TablePagination, usePagination } from '@/components/common/table-pagination'
import DailyThoughtFormDialog from '@/components/resources/daily-thought-form-dialog'
import DailyThoughtViewDialog from '@/components/resources/daily-thought-view-dialog'
import DashboardHeader from '@/components/layout/dashboard-header'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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

export default function DailyThoughtPage() {
  const [search, setSearch] = useState('')
  const [thoughts, setThoughts] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [viewItem, setViewItem] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const fetchThoughts = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true)
      const res = await api.get('/api/daily-thought/all')
      setThoughts(res.data.dailyThoughts || [])
    } catch {
      toast.error('Failed to load daily thoughts')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      fetchThoughts()
    })
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return thoughts
    return thoughts.filter(
      item =>
        item.title?.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q)
    )
  }, [thoughts, search])

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
        title='Daily Thought'
        description='Daily inspiration content shown in the app.'
      />

      <main className='flex-1 space-y-4 px-4 py-4 md:px-6 md:pb-6'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='relative w-full sm:max-w-sm'>
            <Search className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder='Search title or description…'
              className='pl-8'
            />
          </div>
          <div className='flex items-center gap-2'>
            <p className='text-sm text-muted-foreground'>
              {filtered.length} of {thoughts.length} thoughts
            </p>
            <Button
              onClick={() => {
                setSelected(null)
                setFormOpen(true)
              }}
            >
              <Plus className='size-4' />
              Add daily thought
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
                {thoughts.length === 0 ? 'No daily thoughts yet.' : 'No matches for your search.'}
              </p>
            ) : (
              <>
                <div className='overflow-x-auto'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='w-16'>Image</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className='text-right'>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedItems.map(item => (
                        <TableRow key={item._id}>
                          <TableCell>
                            <Avatar className='size-10 rounded-lg after:rounded-lg'>
                              <AvatarImage src={item.image} alt='' className='rounded-lg' />
                              <AvatarFallback className='rounded-lg'>DT</AvatarFallback>
                            </Avatar>
                          </TableCell>
                          <TableCell className='max-w-56 truncate font-medium' title={item.title}>
                            {item.title || '—'}
                          </TableCell>
                          <TableCell
                            className='max-w-md truncate text-muted-foreground'
                            title={item.description}
                          >
                            {item.description || '—'}
                          </TableCell>
                          <TableCell className='text-right'>
                            <div className='inline-flex gap-1'>
                              <Button
                                variant='ghost'
                                size='icon-sm'
                                onClick={() => setViewItem(item)}
                              >
                                <Eye className='size-4' />
                              </Button>
                              <Button
                                variant='ghost'
                                size='icon-sm'
                                onClick={() => {
                                  setSelected(item)
                                  setFormOpen(true)
                                }}
                              >
                                <Pencil className='size-4' />
                              </Button>
                              <Button
                                variant='ghost'
                                size='icon-sm'
                                onClick={() => setDeleteId(item._id)}
                              >
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

      <DailyThoughtFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        thought={selected}
        onSaved={() => fetchThoughts({ silent: true })}
      />

      <DailyThoughtViewDialog
        open={Boolean(viewItem)}
        onOpenChange={open => !open && setViewItem(null)}
        thought={viewItem}
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={open => !open && setDeleteId(null)}
        title='Delete daily thought?'
        description='Are you sure you want to delete this daily thought?'
        confirmText='Delete'
        destructive
        onConfirm={async () => {
          await api.delete(`/api/daily-thought/delete/${deleteId}`)
          await fetchThoughts({ silent: true })
          return 'Daily thought deleted successfully'
        }}
      />
    </>
  )
}
