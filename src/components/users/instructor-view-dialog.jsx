'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { formatDateTime, formatLabel, formatRoleLabel } from '@/lib/format'

function MetaField({ label, value, children }) {
  return (
    <div className='min-w-0'>
      <p className='mb-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
        {label}
      </p>
      {children ?? (
        <p className='break-words text-sm font-semibold' title={value && value !== '—' ? value : undefined}>
          {value || '—'}
        </p>
      )}
    </div>
  )
}

export default function InstructorViewDialog({ open, onOpenChange, instructor }) {
  if (!instructor) return null

  const categories = Array.isArray(instructor.categories) ? instructor.categories : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] flex-col overflow-hidden sm:max-w-lg'>
        <DialogHeader className='shrink-0'>
          <DialogTitle className='pr-6'>{instructor.name || 'Instructor'}</DialogTitle>
          <DialogDescription>Instructor details</DialogDescription>
        </DialogHeader>

        <div className='scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto pr-1'>
          <div className='flex flex-wrap gap-1.5'>
            <Badge variant='outline'>{formatRoleLabel(instructor.role || 'editor')}</Badge>
            <Badge variant={instructor.status === 'active' ? 'default' : 'outline'}>
              {formatLabel(instructor.status)}
            </Badge>
          </div>

          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
            <MetaField label='Name' value={instructor.name || '—'} />
            <MetaField label='Email' value={instructor.email || '—'} />
            <MetaField label='Phone' value={String(instructor.phone || '—')} />
            <MetaField label='Status' value={formatLabel(instructor.status)} />
            <MetaField label='Created' value={formatDateTime(instructor.createdAt)} />
            <MetaField label='Updated' value={formatDateTime(instructor.updatedAt)} />
          </div>

          <div>
            <p className='mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
              Categories
            </p>
            {categories.length ? (
              <div className='flex flex-wrap gap-1.5'>
                {categories.map(cat => (
                  <Badge key={cat} variant='secondary'>
                    {cat}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className='text-sm text-muted-foreground'>No categories assigned.</p>
            )}
          </div>
        </div>

        <DialogFooter className='shrink-0'>
          <Button variant='outline' onClick={() => onOpenChange?.(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
