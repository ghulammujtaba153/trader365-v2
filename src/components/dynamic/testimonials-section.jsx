'use client'

import { useEffect, useMemo, useState } from 'react'
import { Eye, Pencil, Plus, Search, Star, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/api'
import TestimonialFormDialog from '@/components/dynamic/testimonial-form-dialog'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TablePagination, usePagination } from '@/components/common/table-pagination'
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

export default function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState([])
  const [hasParentDoc, setHasParentDoc] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('add')
  const [selected, setSelected] = useState(null)
  const [editingIndex, setEditingIndex] = useState(null)
  const [deleteIndex, setDeleteIndex] = useState(null)

  const fetchData = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true)
      const res = await api.get('/api/testimonials')
      if (res.data) {
        setHasParentDoc(true)
        setTestimonials(Array.isArray(res.data.testimonials) ? res.data.testimonials : [])
      } else {
        setHasParentDoc(false)
        setTestimonials([])
      }
    } catch {
      toast.error('Failed to load testimonials')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      fetchData()
    })
  }, [])

  const filtered = useMemo(() => {
    const withIndex = testimonials.map((item, index) => ({ ...item, rowIndex: index }))
    const q = search.trim().toLowerCase()
    if (!q) return withIndex
    return withIndex.filter(
      item =>
        item.name?.toLowerCase().includes(q) ||
        item.designation?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q)
    )
  }, [testimonials, search])

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

  const openForm = (mode, item = null, index = null) => {
    setFormMode(mode)
    setSelected(item)
    setEditingIndex(index)
    setFormOpen(true)
  }

  const handleSave = async payload => {
    if (formMode === 'edit' && editingIndex !== null) {
      await api.put(`/api/testimonials/${editingIndex}`, payload)
      toast.success('Testimonial updated successfully')
      await fetchData({ silent: true })
      return
    }

    if (!hasParentDoc) {
      await api.post('/api/testimonials', {
        title: 'Testimonials',
        description: '',
        image: '',
        testimonials: [payload]
      })
    } else {
      await api.post('/api/testimonials/user', payload)
    }

    toast.success('Testimonial added successfully')
    await fetchData({ silent: true })
  }

  return (
    <div className='space-y-4'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='relative w-full sm:max-w-sm'>
          <Search className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder='Search name, role, or quote…'
            className='pl-8'
          />
        </div>
        <div className='flex items-center gap-2'>
          <p className='text-sm text-muted-foreground'>
            {filtered.length} of {testimonials.length} quotes
          </p>
          <Button onClick={() => openForm('add')}>
            <Plus className='size-4' />
            Add quote
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className='p-0'>
          {loading ? (
            <div className='space-y-3 p-4'>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className='h-12 w-full' />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className='space-y-3 py-12 text-center'>
              <p className='text-sm text-muted-foreground'>
                {testimonials.length === 0
                  ? 'No testimonials yet.'
                  : 'No matches for your search.'}
              </p>
              {testimonials.length === 0 ? (
                <Button onClick={() => openForm('add')}>
                  <Plus className='size-4' />
                  Add quote
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-[28%] min-w-[10rem]'>Person</TableHead>
                    <TableHead className='w-24'>Rating</TableHead>
                    <TableHead>Quote</TableHead>
                    <TableHead className='w-[7.5rem] text-right'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map(item => (
                    <TableRow key={`${item.rowIndex}-${item.name}`}>
                      <TableCell className='whitespace-normal'>
                        <div className='flex min-w-0 items-center gap-2.5'>
                          <Avatar>
                            {item.image ? (
                              <AvatarImage src={item.image} alt={item.name} />
                            ) : null}
                            <AvatarFallback>
                              {(item.name || '?').slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className='min-w-0'>
                            <p className='truncate font-medium'>{item.name || 'Unnamed'}</p>
                            <p className='truncate text-xs text-muted-foreground'>
                              {item.designation || 'No designation'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className='whitespace-nowrap'>
                        <span className='inline-flex items-center gap-1 text-sm font-medium'>
                          <Star className='size-3.5 fill-amber-400 text-amber-400' />
                          {Number(item.rating) || 0}
                        </span>
                      </TableCell>
                      <TableCell
                        className='max-w-0 whitespace-normal text-muted-foreground'
                        title={item.description}
                      >
                        <p className='line-clamp-2 break-words'>{item.description || '—'}</p>
                      </TableCell>
                      <TableCell className='whitespace-nowrap text-right'>
                        <div className='inline-flex items-center gap-0.5'>
                          <Button
                            variant='ghost'
                            size='icon-sm'
                            onClick={() => openForm('view', item, item.rowIndex)}
                            aria-label='View quote'
                          >
                            <Eye className='size-4' />
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon-sm'
                            onClick={() => openForm('edit', item, item.rowIndex)}
                            aria-label='Edit quote'
                          >
                            <Pencil className='size-4' />
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon-sm'
                            onClick={() => setDeleteIndex(item.rowIndex)}
                            aria-label='Delete quote'
                          >
                            <Trash2 className='size-4 text-destructive' />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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

      <TestimonialFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        testimonial={selected}
        onSubmit={handleSave}
      />

      <ConfirmDialog
        open={deleteIndex !== null}
        onOpenChange={open => !open && setDeleteIndex(null)}
        title='Delete testimonial?'
        description='Are you sure you want to delete this testimonial?'
        confirmText='Delete'
        destructive
        onConfirm={async () => {
          await api.delete(`/api/testimonials/${deleteIndex}`)
          await fetchData({ silent: true })
          return 'Testimonial deleted successfully'
        }}
      />
    </div>
  )
}
