'use client'

import { useEffect, useMemo, useState } from 'react'
import { Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/api'
import FaqFormDialog from '@/components/dynamic/faq-form-dialog'
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

export default function FaqsSection() {
  const [faqs, setFaqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('add')
  const [selectedFaq, setSelectedFaq] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const fetchFaqs = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true)
      const res = await api.get('/api/faq')
      setFaqs(Array.isArray(res.data) ? res.data : [])
    } catch {
      toast.error('Failed to load FAQs')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      fetchFaqs()
    })
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return faqs
    return faqs.filter(
      item =>
        item.question?.toLowerCase().includes(q) || item.answer?.toLowerCase().includes(q)
    )
  }, [faqs, search])

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

  const openForm = (mode, item = null) => {
    setFormMode(mode)
    setSelectedFaq(item)
    setFormOpen(true)
  }

  return (
    <div className='space-y-4'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='relative w-full sm:max-w-sm'>
          <Search className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder='Search question or answer…'
            className='pl-8'
          />
        </div>
        <div className='flex items-center gap-2'>
          <p className='text-sm text-muted-foreground'>
            {filtered.length} of {faqs.length} FAQs
          </p>
          <Button onClick={() => openForm('add')}>
            <Plus className='size-4' />
            Add FAQ
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
            <div className='space-y-3 py-12 text-center'>
              <p className='text-sm text-muted-foreground'>
                {faqs.length === 0 ? 'No FAQs yet.' : 'No matches for your search.'}
              </p>
              {faqs.length === 0 ? (
                <Button onClick={() => openForm('add')}>
                  <Plus className='size-4' />
                  Add FAQ
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-[32%] min-w-[10rem]'>Question</TableHead>
                    <TableHead>Answer</TableHead>
                    <TableHead className='w-[7.5rem] text-right'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map(item => (
                    <TableRow key={item._id}>
                      <TableCell
                        className='max-w-0 whitespace-normal font-medium'
                        title={item.question}
                      >
                        <p className='line-clamp-2 break-words'>{item.question || '—'}</p>
                      </TableCell>
                      <TableCell
                        className='max-w-0 whitespace-normal text-muted-foreground'
                        title={item.answer}
                      >
                        <p className='line-clamp-2 break-words'>{item.answer || '—'}</p>
                      </TableCell>
                      <TableCell className='whitespace-nowrap text-right'>
                        <div className='inline-flex items-center gap-0.5'>
                          <Button
                            variant='ghost'
                            size='icon-sm'
                            onClick={() => openForm('view', item)}
                            aria-label='View FAQ'
                          >
                            <Eye className='size-4' />
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon-sm'
                            onClick={() => openForm('edit', item)}
                            aria-label='Edit FAQ'
                          >
                            <Pencil className='size-4' />
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon-sm'
                            onClick={() => setDeleteId(item._id)}
                            aria-label='Delete FAQ'
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

      <FaqFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        faq={selectedFaq}
        onSaved={() => fetchFaqs({ silent: true })}
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={open => !open && setDeleteId(null)}
        title='Delete FAQ?'
        description='Are you sure you want to delete this FAQ?'
        confirmText='Delete'
        destructive
        onConfirm={async () => {
          await api.delete(`/api/faq/${deleteId}`)
          await fetchFaqs({ silent: true })
          return 'FAQ deleted successfully'
        }}
      />
    </div>
  )
}
