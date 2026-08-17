'use client'

import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/api'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TablePagination, usePagination } from '@/components/common/table-pagination'
import PillarFormDialog from '@/components/resources/pillar-form-dialog'
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

const normalizeCategories = value => {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map(part => part.trim()).filter(Boolean)
  }
  return []
}

export default function PillarsPage() {
  const [search, setSearch] = useState('')
  const [pillars, setPillars] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [selectedPillar, setSelectedPillar] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const fetchPillars = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true)
      const res = await api.get('/api/pillars/categories')
      const rows = Array.isArray(res.data) ? res.data : []
      setPillars(
        rows.map(item => ({
          ...item,
          categories: normalizeCategories(item.categories)
        }))
      )
    } catch {
      toast.error('Failed to load pillars')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      fetchPillars()
    })
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return pillars
    return pillars.filter(
      item =>
        item.name?.toLowerCase().includes(q) ||
        item.categories?.some(cat => String(cat).toLowerCase().includes(q))
    )
  }, [pillars, search])

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
        title='Pillars'
        description='Organize content pillars and their categories.'
      />

      <main className='flex-1 space-y-4 px-4 py-4 md:px-6 md:pb-6'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='relative w-full sm:max-w-sm'>
            <Search className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder='Search name, categories…'
              className='pl-8'
            />
          </div>
          <div className='flex items-center gap-2'>
            <p className='text-sm text-muted-foreground'>
              {filtered.length} of {pillars.length} pillars
            </p>
            <Button
              onClick={() => {
                setSelectedPillar(null)
                setFormOpen(true)
              }}
            >
              <Plus className='size-4' />
              Add pillar
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
                {pillars.length === 0 ? 'No pillars yet.' : 'No matches for your search.'}
              </p>
            ) : (
              <>
                <div className='overflow-x-auto'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Categories</TableHead>
                        <TableHead className='text-right'>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedItems.map(item => (
                        <TableRow key={item._id}>
                          <TableCell className='font-medium'>{item.name || '—'}</TableCell>
                          <TableCell>
                            {item.categories?.length ? (
                              <div className='flex flex-wrap gap-1'>
                                {item.categories.map(cat => (
                                  <Badge key={`${item._id}-${cat}`} variant='secondary'>
                                    {cat}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className='text-muted-foreground'>—</span>
                            )}
                          </TableCell>
                          <TableCell className='text-right'>
                            <div className='inline-flex gap-1'>
                              <Button
                                variant='ghost'
                                size='icon-sm'
                                onClick={() => {
                                  setSelectedPillar(item)
                                  setFormOpen(true)
                                }}
                              >
                                <Pencil className='size-4' />
                              </Button>
                              <Button variant='ghost' size='icon-sm' onClick={() => setDeleteId(item._id)}>
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

      <PillarFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        pillar={selectedPillar}
        onSaved={() => fetchPillars({ silent: true })}
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={open => !open && setDeleteId(null)}
        title='Delete pillar?'
        description='Are you sure you want to delete this pillar?'
        confirmText='Delete'
        destructive
        onConfirm={async () => {
          await api.delete(`/api/pillars/categories/${deleteId}`)
          await fetchPillars({ silent: true })
          return 'Pillar deleted successfully'
        }}
      />
    </>
  )
}
