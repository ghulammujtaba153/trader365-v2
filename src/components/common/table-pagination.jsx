'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]

export function usePagination(items = [], initialPageSize = 10) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const itemsKey = Array.isArray(items) ? `${items.length}:${items[0]?._id || items[0]?.screen || ''}:${items[items.length - 1]?._id || items[items.length - 1]?.screen || ''}` : '0'

  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize) || 1)

  useEffect(() => {
    setPage(1)
  }, [itemsKey, pageSize])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const currentPage = Math.min(page, totalPages)

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, currentPage, pageSize])

  const from = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const to = Math.min(currentPage * pageSize, totalItems)

  return {
    page: currentPage,
    pageSize,
    totalItems,
    totalPages,
    from,
    to,
    paginatedItems,
    goToPage: nextPage => setPage(Math.min(Math.max(1, nextPage), totalPages)),
    changePageSize: nextSize => {
      setPageSize(nextSize)
      setPage(1)
    }
  }
}

export function TablePagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  from,
  to,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  className
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <p className='text-center text-sm text-muted-foreground sm:text-left'>
        {totalItems === 0 ? 'No results' : `Showing ${from}–${to} of ${totalItems}`}
      </p>

      <div className='flex flex-wrap items-center justify-center gap-3 sm:justify-end'>
        <label className='flex items-center gap-2 text-sm text-muted-foreground'>
          Rows
          <select
            value={pageSize}
            onChange={e => onPageSizeChange?.(Number(e.target.value))}
            className='h-8 rounded-lg border border-input bg-background px-2 text-sm text-foreground'
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className='flex items-center gap-1'>
          <Button
            variant='outline'
            size='icon-sm'
            className='hidden sm:inline-flex'
            disabled={page <= 1}
            onClick={() => onPageChange?.(1)}
            aria-label='First page'
          >
            <ChevronsLeft className='size-4' />
          </Button>
          <Button
            variant='outline'
            size='icon-sm'
            disabled={page <= 1}
            onClick={() => onPageChange?.(page - 1)}
            aria-label='Previous page'
          >
            <ChevronLeft className='size-4' />
          </Button>
          <span className='min-w-20 px-1 text-center text-sm tabular-nums sm:min-w-24 sm:px-2'>
            {page}/{totalPages}
          </span>
          <Button
            variant='outline'
            size='icon-sm'
            disabled={page >= totalPages}
            onClick={() => onPageChange?.(page + 1)}
            aria-label='Next page'
          >
            <ChevronRight className='size-4' />
          </Button>
          <Button
            variant='outline'
            size='icon-sm'
            className='hidden sm:inline-flex'
            disabled={page >= totalPages}
            onClick={() => onPageChange?.(totalPages)}
            aria-label='Last page'
          >
            <ChevronsRight className='size-4' />
          </Button>
        </div>
      </div>
    </div>
  )
}
