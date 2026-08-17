'use client'

import { ImageIcon, Upload } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'

export function MediaUploadField({
  label,
  hint = 'Click to browse or drop a file',
  accept = '*/*',
  required = false,
  imagePreview,
  mediaUrl,
  fileName,
  meta,
  uploading = false,
  progress = 0,
  error,
  onSelect,
  className
}) {
  const handleChange = e => {
    const file = e.target.files?.[0]
    if (file) onSelect?.(file)
    e.target.value = ''
  }

  return (
    <div className={cn('flex min-w-0 flex-1 flex-col gap-2', className)}>
      <div className='flex items-center justify-between gap-2'>
        <p className='text-sm font-medium'>
          {label}
          {required ? <span className='text-destructive'> *</span> : null}
        </p>
        {meta ? <p className='text-xs text-muted-foreground'>{meta}</p> : null}
      </div>

      <label
        className={cn(
          'relative flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-border bg-muted/30 px-3 py-4 text-center transition-colors hover:bg-muted/50',
          error && 'border-destructive/60',
          uploading && 'pointer-events-none opacity-70'
        )}
      >
        <input type='file' accept={accept} className='sr-only' onChange={handleChange} disabled={uploading} />

        {imagePreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagePreview} alt='' className='absolute inset-0 size-full object-cover' />
        ) : mediaUrl || fileName ? (
          <div className='space-y-1'>
            <Upload className='mx-auto size-6 text-muted-foreground' />
            <p className='max-w-[14rem] truncate text-sm font-medium'>{fileName || 'Current media file'}</p>
            {mediaUrl ? (
              <p className='max-w-[14rem] truncate text-xs text-muted-foreground'>{mediaUrl}</p>
            ) : null}
          </div>
        ) : (
          <div className='space-y-1'>
            <ImageIcon className='mx-auto size-6 text-muted-foreground' />
            <p className='text-sm text-muted-foreground'>{hint}</p>
          </div>
        )}

        {imagePreview ? (
          <div className='absolute inset-0 bg-black/35' />
        ) : null}

        {uploading ? (
          <div className='absolute inset-x-3 bottom-3 z-10 space-y-1'>
            <Progress value={progress} className='h-1.5' />
            <p className='text-xs font-medium text-white drop-shadow'>{progress}%</p>
          </div>
        ) : null}
      </label>

      {error ? <p className='text-xs text-destructive'>{error}</p> : null}
    </div>
  )
}
