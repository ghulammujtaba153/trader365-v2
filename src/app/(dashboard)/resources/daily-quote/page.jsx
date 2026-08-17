'use client'

import { useEffect, useMemo, useState } from 'react'
import { Eye, Pencil, Plus, Quote, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/api'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TablePagination, usePagination } from '@/components/common/table-pagination'
import QuoteFormDialog from '@/components/resources/quote-form-dialog'
import DashboardHeader from '@/components/layout/dashboard-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
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

export default function DailyQuotePage() {
  const [search, setSearch] = useState('')
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState(null)
  const [viewQuote, setViewQuote] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const fetchQuotes = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true)
      const res = await api.get('/api/daily-quote/all')
      setQuotes(Array.isArray(res.data) ? res.data : res.data ? [res.data] : [])
    } catch {
      toast.error('Failed to load daily quotes')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      fetchQuotes()
    })
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return quotes
    return quotes.filter(item => item.quote?.toLowerCase().includes(q))
  }, [quotes, search])

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
      <DashboardHeader title='Daily Quote' description='Quotes featured for users each day.' />

      <main className='flex-1 space-y-4 px-4 py-4 md:px-6 md:pb-6'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='relative w-full sm:max-w-sm'>
            <Search className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder='Search quote…'
              className='pl-8'
            />
          </div>
          <div className='flex items-center gap-2'>
            <p className='text-sm text-muted-foreground'>
              {filtered.length} of {quotes.length} quotes
            </p>
            <Button
              onClick={() => {
                setSelectedQuote(null)
                setFormOpen(true)
              }}
            >
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
                  <Skeleton key={i} className='h-10 w-full' />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className='py-12 text-center text-sm text-muted-foreground'>
                {quotes.length === 0 ? 'No daily quotes yet.' : 'No matches for your search.'}
              </p>
            ) : (
              <>
                <div className='overflow-x-auto'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quote</TableHead>
                        <TableHead className='text-right'>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedItems.map(item => (
                        <TableRow key={item._id}>
                          <TableCell className='max-w-xl truncate font-medium' title={item.quote}>
                            {item.quote || '—'}
                          </TableCell>
                          <TableCell className='text-right'>
                            <div className='inline-flex gap-1'>
                              <Button variant='ghost' size='icon-sm' onClick={() => setViewQuote(item)}>
                                <Eye className='size-4' />
                              </Button>
                              <Button
                                variant='ghost'
                                size='icon-sm'
                                onClick={() => {
                                  setSelectedQuote(item)
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

      <QuoteFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        quote={selectedQuote}
        onSaved={() => fetchQuotes({ silent: true })}
      />

      <Dialog open={Boolean(viewQuote)} onOpenChange={open => !open && setViewQuote(null)}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>Daily quote</DialogTitle>
            <DialogDescription>
              {viewQuote?.author ? `By ${viewQuote.author}` : 'Inspiration of the day'}
            </DialogDescription>
          </DialogHeader>
          <div className='flex flex-col items-center gap-4 px-2 py-6 text-center'>
            <div className='grid size-12 place-items-center rounded-full bg-primary/10 text-primary'>
              <Quote className='size-5' />
            </div>
            <p className='max-w-md text-lg leading-relaxed font-medium italic'>
              &ldquo;{viewQuote?.quote}&rdquo;
            </p>
            {viewQuote?.author ? (
              <p className='text-sm font-medium text-muted-foreground'>{viewQuote.author}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setViewQuote(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={open => !open && setDeleteId(null)}
        title='Delete quote?'
        description='Are you sure you want to delete this quote?'
        confirmText='Delete'
        destructive
        onConfirm={async () => {
          await api.delete(`/api/daily-quote/${deleteId}`)
          await fetchQuotes({ silent: true })
          return 'Quote deleted successfully'
        }}
      />
    </>
  )
}
