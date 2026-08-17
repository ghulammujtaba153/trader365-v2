'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { uploadToS3 } from '@/lib/upload'
import { MediaUploadField } from '@/components/resources/media-upload-field'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const emptyForm = {
  name: '',
  designation: '',
  image: '',
  rating: 5,
  description: ''
}

export default function TestimonialFormDialog({
  open,
  onOpenChange,
  mode = 'add',
  testimonial,
  onSubmit
}) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const isView = mode === 'view'
  const isEdit = mode === 'edit'

  useEffect(() => {
    if (!open) return
    if ((isEdit || isView) && testimonial) {
      setForm({
        name: testimonial.name || '',
        designation: testimonial.designation || '',
        image: testimonial.image || '',
        rating: Number(testimonial.rating) || 5,
        description: testimonial.description || ''
      })
    } else {
      setForm(emptyForm)
    }
    setUploading(false)
    setProgress(0)
  }, [open, mode, testimonial, isEdit, isView])

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const handleImageSelect = async file => {
    if (!file || isView) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should not exceed 5MB')
      return
    }

    setUploading(true)
    setProgress(0)
    try {
      const { fileUrl } = await uploadToS3(file, percent => setProgress(percent))
      update('image', fileUrl)
      toast.success('Image uploaded')
    } catch {
      toast.error('Failed to upload image')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (isView) return

    const name = form.name.trim()
    const description = form.description.trim()
    if (!name || !description) {
      toast.error('Name and quote are required')
      return
    }

    const payload = {
      name,
      designation: form.designation.trim(),
      image: form.image || '',
      rating: Number(form.rating) || 5,
      description
    }

    setSaving(true)
    try {
      await onSubmit?.(payload)
      onOpenChange?.(false)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save testimonial')
    } finally {
      setSaving(false)
    }
  }

  const title = isView ? 'View testimonial' : isEdit ? 'Edit testimonial' : 'Add testimonial'
  const description = isView
    ? 'Customer quote details'
    : 'Customer feedback shown on marketing surfaces.'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] flex-col overflow-hidden sm:max-w-lg'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {isView ? (
          <div className='scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto pr-1'>
            <div className='flex items-center gap-3'>
              <Avatar size='lg'>
                {form.image ? <AvatarImage src={form.image} alt={form.name} /> : null}
                <AvatarFallback>
                  {(form.name || '?').slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className='min-w-0'>
                <p className='truncate text-base font-semibold'>{form.name || 'Unnamed'}</p>
                <p className='truncate text-sm text-muted-foreground'>
                  {form.designation || 'No designation'}
                </p>
                <p className='mt-1 text-sm font-medium'>{Number(form.rating) || 0} / 5</p>
              </div>
            </div>
            <p className='whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground'>
              {form.description || 'No quote text'}
            </p>
          </div>
        ) : (
          <form id='testimonial-form' onSubmit={handleSubmit} className='scrollbar-thin min-h-0 flex-1 space-y-3 overflow-y-auto pr-1'>
            <div className='space-y-1.5'>
              <Label htmlFor='testimonial-name'>
                Name <span className='text-destructive'>*</span>
              </Label>
              <Input
                id='testimonial-name'
                value={form.name}
                onChange={e => update('name', e.target.value)}
                required
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='testimonial-designation'>Designation</Label>
              <Input
                id='testimonial-designation'
                value={form.designation}
                onChange={e => update('designation', e.target.value)}
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='testimonial-rating'>Rating</Label>
              <select
                id='testimonial-rating'
                className='h-8 w-full rounded-lg border border-input bg-background px-2 text-sm'
                value={form.rating}
                onChange={e => update('rating', Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5].map(n => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='testimonial-description'>
                Quote <span className='text-destructive'>*</span>
              </Label>
              <Textarea
                id='testimonial-description'
                value={form.description}
                onChange={e => update('description', e.target.value)}
                rows={4}
                required
              />
            </div>
            <MediaUploadField
              label='Photo'
              hint='Add profile photo'
              accept='image/*'
              imagePreview={form.image || undefined}
              uploading={uploading}
              progress={progress}
              onSelect={handleImageSelect}
            />
          </form>
        )}

        <DialogFooter className='shrink-0'>
          <Button
            variant='outline'
            onClick={() => onOpenChange?.(false)}
            disabled={saving || uploading}
          >
            {isView ? 'Close' : 'Cancel'}
          </Button>
          {!isView ? (
            <Button type='submit' form='testimonial-form' disabled={saving || uploading}>
              {saving ? 'Saving…' : isEdit ? 'Update' : 'Add'}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
