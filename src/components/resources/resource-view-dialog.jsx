'use client'

import { useMemo, useRef } from 'react'

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

export default function ResourceViewDialog({ open, onOpenChange, resource }) {
  const videoRef = useRef(null)

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

  const isAudio = resource.type === 'audio'
  const storageKey = `video-progress-${resource._id}`
  const subtitle = [resource.pillar, resource.category].filter(Boolean).join(' · ')

  const handleLoadedMetadata = () => {
    const savedTime = localStorage.getItem(storageKey)
    if (videoRef.current && savedTime) {
      videoRef.current.currentTime = parseFloat(savedTime)
    }
  }

  const persistTime = () => {
    if (videoRef.current) {
      localStorage.setItem(storageKey, String(videoRef.current.currentTime))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] flex-col overflow-hidden sm:max-w-4xl'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>{resource.title}</DialogTitle>
          <DialogDescription>
            {[isAudio ? 'Audio' : 'Video', resource.pillar, resource.category].filter(Boolean).join(' · ')}
          </DialogDescription>
        </DialogHeader>

        <div className='scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto pr-1'>
          {isAudio ? (
            <AudioPlayer
              src={resource.url}
              title={resource.title}
              subtitle={subtitle}
              artwork={resource.thumbnail}
              active={open}
            />
          ) : resource.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resource.thumbnail}
              alt={resource.title || 'Thumbnail'}
              className='h-44 w-full rounded-lg object-cover'
            />
          ) : null}

          <div className='flex flex-wrap gap-1.5'>
            <Badge className='capitalize'>{isAudio ? 'Audio' : 'Video'}</Badge>
            <Badge variant={resource.isPremium ? 'default' : 'outline'}>
              {resource.isPremium ? 'Premium' : 'Free'}
            </Badge>
            {resource.pillar ? <Badge variant='outline'>{resource.pillar}</Badge> : null}
            {resource.category ? <Badge variant='outline'>{resource.category}</Badge> : null}
          </div>

          {resource.description ? (
            <p className='text-sm leading-relaxed text-muted-foreground'>{resource.description}</p>
          ) : null}

          <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
            <MetaField label='Type' value={resource.type} />
            <MetaField label='Pillar' value={resource.pillar} />
            <MetaField label='Category' value={resource.category} />
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

          {!isAudio ? (
            <div className='border-t pt-4'>
              <p className='mb-2 text-sm font-semibold'>Watch</p>
              {resource.url ? (
                <div className='overflow-hidden rounded-lg border bg-muted/40 p-1'>
                  <video
                    ref={videoRef}
                    controls
                    poster={resource.thumbnail || undefined}
                    className='max-h-90 w-full rounded-md bg-black'
                    onLoadedMetadata={handleLoadedMetadata}
                    onTimeUpdate={persistTime}
                    onPause={persistTime}
                  >
                    <source src={resource.url} type='video/mp4' />
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : (
                <p className='text-sm text-destructive'>No media URL saved for this resource.</p>
              )}
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
