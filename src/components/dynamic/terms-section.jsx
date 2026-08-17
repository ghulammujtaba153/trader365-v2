'use client'

import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/api'
import TermsFormDialog from '@/components/dynamic/terms-form-dialog'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TablePagination, usePagination } from '@/components/common/table-pagination'
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

const formatUpdated = item => {
  const value = item?.updatedAt || item?.createdAt
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return '—'
  }
}

export default function TermsSection() {
  const [terms, setTerms] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const fetchTerms = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true)
      const res = await api.get('/api/terms')
      setTerms(Array.isArray(res.data) ? res.data : [])
    } catch {
      toast.error('Failed to load terms')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      fetchTerms()
    })
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return terms
    return terms.filter(item => item.title?.toLowerCase().includes(q))
  }, [terms, search])

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
      <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='relative w-full sm:max-w-sm'>
          <Search className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder='Search terms…'
            className='pl-8'
          />
        </div>
        <div className='flex items-center gap-2'>
          <p className='text-sm text-muted-foreground'>
            {filtered.length} of {terms.length} documents
          </p>
          <Button
            onClick={() => {
              setSelected(null)
              setFormOpen(true)
            }}
          >
            <Plus className='size-4' />
            Add terms
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
              {terms.length === 0 ? 'No terms documents yet.' : 'No matches for your search.'}
            </p>
          ) : (
            <>
              <div className='overflow-x-auto'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className='text-right'>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map(item => (
                      <TableRow key={item._id}>
                        <TableCell className='font-medium'>{item.title || '—'}</TableCell>
                        <TableCell className='text-muted-foreground'>{formatUpdated(item)}</TableCell>
                        <TableCell className='text-right'>
                          <div className='inline-flex items-center gap-1'>
                            <Button
                              variant='ghost'
                              size='icon-sm'
                              onClick={() => {
                                setSelected(item)
                                setFormOpen(true)
                              }}
                              aria-label='Edit'
                            >
                              <Pencil className='size-4' />
                            </Button>
                            <Button
                              variant='ghost'
                              size='icon-sm'
                              className='text-destructive hover:text-destructive'
                              onClick={() => setDeleteId(item._id)}
                              aria-label='Delete'
                            >
                              <Trash2 className='size-4' />
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

      <TermsFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        term={selected}
        onSaved={() => fetchTerms({ silent: true })}
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={open => !open && setDeleteId(null)}
        title='Delete terms?'
        description='Are you sure you want to delete this terms document?'
        confirmText='Delete'
        destructive
        onConfirm={async () => {
          await api.delete(`/api/terms/${deleteId}`)
          await fetchTerms({ silent: true })
          return 'Terms deleted successfully'
        }}
      />
    </>
  )
}
