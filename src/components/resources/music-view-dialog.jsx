'use client'

import { useMemo } from 'react'

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

function MetaField({ label, value }) {
  return (
    <div>
      <p className='mb-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>{label}</p>
      <p className='text-sm font-semibold'>{value || '—'}</p>
    </div>
  )
}

function formatDuration(seconds) {
  if (!seconds) return '—'
  return `${Math.round(seconds / 60)} min`
}

export default function MusicViewDialog({ open, onOpenChange, resource }) {
  const tags = useMemo(() => {
    if (!resource) return []
    if (Array.isArray(resource.tags)) return resource.tags.filter(Boolean)
    if (typeof resource.tags === 'string' && resource.tags.trim()) {
      return resource.tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
    }
    return []
  }, [resource])

  if (!resource) return null

  const subtitle = [resource.pillar, resource.category].filter(Boolean).join(' · ')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] flex-col overflow-hidden sm:max-w-2xl'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>{resource.title}</DialogTitle>
          <DialogDescription>
            {['Music', resource.pillar, resource.category].filter(Boolean).join(' · ')}
          </DialogDescription>
        </DialogHeader>

        <div className='scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto pr-1'>
          <AudioPlayer
            src={resource.url}
            title={resource.title}
            subtitle={subtitle || 'Music'}
            artwork={resource.thumbnail}
            active={open}
          />

          <div className='flex flex-wrap gap-1.5'>
            <Badge>Music</Badge>
            <Badge variant={resource.isPremium ? 'default' : 'outline'}>
              {resource.isPremium ? 'Premium' : 'Free'}
            </Badge>
            <Badge variant='outline'>{formatDuration(resource.duration)}</Badge>
            {resource.pillar ? <Badge variant='outline'>{resource.pillar}</Badge> : null}
            {resource.category ? <Badge variant='outline'>{resource.category}</Badge> : null}
          </div>

          {resource.description ? (
            <p className='text-sm leading-relaxed text-muted-foreground'>{resource.description}</p>
          ) : null}

          <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
            <MetaField label='Pillar' value={resource.pillar} />
            <MetaField label='Category' value={resource.category} />
            <MetaField label='Duration' value={formatDuration(resource.duration)} />
            <MetaField label='Access' value={resource.isPremium ? 'Premium' : 'Free'} />
          </div>

          {tags.length > 0 ? (
            <div>
              <p className='mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>Tags</p>
              <div className='flex flex-wrap gap-1.5'>
                {tags.map(tag => (
                  <Badge key={tag} variant='outline'>
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
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
