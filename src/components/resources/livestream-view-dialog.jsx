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

const PLATFORM_LABELS = {
  youtube: 'YouTube',
  facebook: 'Facebook',
  instagram: 'Instagram',
  twitter: 'Twitter',
  twitch: 'Twitch',
  vimeo: 'Vimeo',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  rumble: 'Rumble'
}

export default function LivestreamViewDialog({ open, onOpenChange, livestream }) {
  if (!livestream) return null

  const platforms = Array.isArray(livestream.platform) ? livestream.platform : []
  const hostName = livestream.user?.name || livestream.user?.email || 'Unknown'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-4xl'>
        <div className='scrollbar-thin min-h-0 flex-1 overflow-y-auto'>
        <div className='relative min-h-48 overflow-hidden bg-muted'>
          {livestream.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={livestream.thumbnail}
              alt=''
              className='absolute inset-0 size-full object-cover'
            />
          ) : null}
          <div className='absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent' />
          <div className='relative flex flex-wrap items-end gap-2 p-4 pt-24'>
            <Badge>Livestream</Badge>
            {platforms.map((platform, index) => (
              <Badge
                key={`${platform.type}-${index}`}
                variant='outline'
                className={platform.url ? 'cursor-pointer' : undefined}
                onClick={() => {
                  if (platform.url) window.open(platform.url, '_blank', 'noopener,noreferrer')
                }}
              >
                {PLATFORM_LABELS[platform.type] || platform.type}
              </Badge>
            ))}
          </div>
        </div>

        <div className='space-y-4 px-4 pb-2'>
          <DialogHeader>
            <DialogTitle>{livestream.title || 'Livestream'}</DialogTitle>
            <DialogDescription>Livestream details</DialogDescription>
          </DialogHeader>

          {livestream.description ? (
            <p className='text-sm leading-relaxed text-muted-foreground'>
              {livestream.description}
            </p>
          ) : null}

          <div className='grid gap-3 sm:grid-cols-2'>
            <div>
              <p className='text-xs text-muted-foreground'>Starts</p>
              <p className='text-sm font-medium'>
                {livestream.startDateTime
                  ? new Date(livestream.startDateTime).toLocaleString()
                  : '—'}
              </p>
            </div>
            <div>
              <p className='text-xs text-muted-foreground'>Ends</p>
              <p className='text-sm font-medium'>
                {livestream.endDateTime ? new Date(livestream.endDateTime).toLocaleString() : '—'}
              </p>
            </div>
            <div>
              <p className='text-xs text-muted-foreground'>Host</p>
              <p className='text-sm font-medium'>{hostName}</p>
            </div>
            <div>
              <p className='text-xs text-muted-foreground'>Created</p>
              <p className='text-sm font-medium'>
                {livestream.createdAt
                  ? new Date(livestream.createdAt).toLocaleString()
                  : '—'}
              </p>
            </div>
          </div>

          {platforms.length > 0 ? (
            <div className='space-y-2 border-t pt-4'>
              <p className='text-sm font-medium'>Platforms</p>
              <div className='space-y-2'>
                {platforms.map((platform, index) => (
                  <div
                    key={`${platform.type}-url-${index}`}
                    className='flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2'
                  >
                    <p className='text-sm font-medium'>
                      {PLATFORM_LABELS[platform.type] || platform.type}
                    </p>
                    {platform.url ? (
                      <a
                        href={platform.url}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='max-w-[60%] truncate text-sm text-primary hover:underline'
                      >
                        {platform.url}
                      </a>
                    ) : (
                      <span className='text-xs text-muted-foreground'>No URL</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
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
