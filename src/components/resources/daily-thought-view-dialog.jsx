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
import AudioPlayer from '@/components/media/audio-player'

const formatDuration = seconds => {
  if (seconds === null || seconds === undefined || seconds === '') return '—'
  const mins = Math.round(Number(seconds) / 60)
  if (mins < 1) return `${seconds}s`
  return `${mins} min`
}

export default function DailyThoughtViewDialog({ open, onOpenChange, thought }) {
  if (!thought) return null

  const instructorName =
    typeof thought.instructor === 'object'
      ? thought.instructor?.name || thought.instructor?.email
      : thought.instructor

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-2xl'>
        <div className='scrollbar-thin min-h-0 flex-1 overflow-y-auto'>
        <div className='relative min-h-48 overflow-hidden bg-muted'>
          {thought.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thought.image} alt='' className='absolute inset-0 size-full object-cover' />
          ) : null}
          <div className='absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent' />
          <div className='relative flex flex-wrap items-end gap-2 p-4 pt-24'>
            <Badge>Audio</Badge>
            {instructorName ? <Badge variant='outline'>{instructorName}</Badge> : null}
            {thought.duration ? (
              <Badge variant='outline'>{formatDuration(thought.duration)}</Badge>
            ) : null}
          </div>
        </div>

        <div className='space-y-4 px-4 pb-2'>
          <DialogHeader>
            <DialogTitle>{thought.title || 'Daily thought'}</DialogTitle>
            <DialogDescription>Daily thought details</DialogDescription>
          </DialogHeader>

          {thought.description ? (
            <p className='text-sm leading-relaxed text-muted-foreground'>{thought.description}</p>
          ) : null}

          <div className='grid gap-3 sm:grid-cols-3'>
            <div>
              <p className='text-xs text-muted-foreground'>Instructor</p>
              <p className='text-sm font-medium'>{instructorName || '—'}</p>
            </div>
            <div>
              <p className='text-xs text-muted-foreground'>Duration</p>
              <p className='text-sm font-medium'>{formatDuration(thought.duration)}</p>
            </div>
            <div>
              <p className='text-xs text-muted-foreground'>Created</p>
              <p className='text-sm font-medium'>
                {thought.createdAt ? new Date(thought.createdAt).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>

          {thought.audio ? (
            <AudioPlayer
              src={thought.audio}
              title={thought.title || 'Daily thought'}
              subtitle={instructorName ? `With ${instructorName}` : 'Daily thought'}
              artwork={thought.image}
              active={open}
            />
          ) : null}
        </div>
        </div>

        <DialogFooter className='mx-0 mb-0 shrink-0'>
          <Button variant='outline' onClick={() => onOpenChange?.(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
