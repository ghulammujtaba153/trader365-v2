'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import api from '@/lib/api'
import { uploadToS3 } from '@/lib/upload'
import { MediaUploadField } from '@/components/resources/media-upload-field'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
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
import { cn } from '@/lib/utils'

const emptyForm = {
  title: '',
  description: '',
  instructor: '',
  type: 'audio',
  pillar: '',
  category: '',
  tags: [],
  isPremium: false,
  thumbnail: '',
  url: '',
  duration: 0
}

const selectClass =
  'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

export default function ResourceFormDialog({ open, onOpenChange, resource, onSaved }) {
  const [form, setForm] = useState(emptyForm)
  const [pillars, setPillars] = useState([])
  const [tags, setTags] = useState([])
  const [instructors, setInstructors] = useState([])
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [thumbnailPreview, setThumbnailPreview] = useState('')
  const [thumbnailUploading, setThumbnailUploading] = useState(false)
  const [thumbnailProgress, setThumbnailProgress] = useState(0)
  const [mediaFileName, setMediaFileName] = useState('')
  const [mediaUploading, setMediaUploading] = useState(false)
  const [mediaProgress, setMediaProgress] = useState(0)
  const [errors, setErrors] = useState({})
  const isEdit = Boolean(resource)

  const categories = useMemo(() => {
    const pillar = pillars.find(p => p.name === form.pillar)
    return pillar?.categories || []
  }, [pillars, form.pillar])

  useEffect(() => {
    if (!open) return

    const loadMeta = async () => {
      try {
        const [pillarsRes, tagsRes, editorsRes] = await Promise.all([
          api.get('/api/pillars/categories'),
          api.get('/api/tags'),
          api.get('/api/auth/editors')
        ])
        setPillars(Array.isArray(pillarsRes.data) ? pillarsRes.data : [])
        const tagList = Array.isArray(tagsRes.data) ? tagsRes.data : []
        setTags([...tagList, 'daily thought'].filter((t, i, arr) => arr.indexOf(t) === i))
        setInstructors(editorsRes.data?.users || [])
      } catch {
        toast.error('Failed to load form options')
      }
    }

    loadMeta()

    if (resource) {
      const instructorId =
        typeof resource.instructor === 'object' && resource.instructor
          ? resource.instructor._id || ''
          : resource.instructor || ''

      setForm({
        title: resource.title || '',
        description: resource.description || '',
        instructor: instructorId,
        type: resource.type || 'audio',
        pillar: resource.pillar || '',
        category: resource.category || '',
        tags: Array.isArray(resource.tags) ? resource.tags : [],
        isPremium: Boolean(resource.isPremium),
        thumbnail: resource.thumbnail || '',
        url: resource.url || '',
        duration: Number(resource.duration) || 0
      })
      setThumbnailPreview(resource.thumbnail || '')
      setMediaFileName(resource.url ? 'Current media file' : '')
    } else {
      setForm(emptyForm)
      setThumbnailPreview('')
      setMediaFileName('')
    }
    setErrors({})
  }, [open, resource])

  useEffect(() => {
    return () => {
      if (thumbnailPreview?.startsWith('blob:')) URL.revokeObjectURL(thumbnailPreview)
    }
  }, [thumbnailPreview])

  const update = (key, value) => {
    setForm(prev => ({
      ...prev,
      [key]: value,
      ...(key === 'pillar' ? { category: '' } : {})
    }))
  }

  const toggleTag = tag => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag]
    }))
  }

  const validate = () => {
    const next = {}
    if (!form.title.trim()) next.title = 'Title is required'
    if (!form.description.trim()) next.description = 'Description is required'
    if (!form.instructor) next.instructor = 'Instructor is required'
    if (!form.pillar) next.pillar = 'Pillar is required'
    if (!form.category) next.category = 'Category is required'
    if (!form.thumbnail) next.thumbnail = 'Thumbnail is required'
    if (!isEdit && !form.url) next.url = 'Media file is required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleThumbnailSelect = async file => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file')
      return
    }

    const preview = URL.createObjectURL(file)
    setThumbnailPreview(preview)
    setThumbnailUploading(true)
    setThumbnailProgress(0)

    try {
      const { fileUrl } = await uploadToS3(file, setThumbnailProgress)
      update('thumbnail', fileUrl)
      setErrors(prev => ({ ...prev, thumbnail: '' }))
      toast.success('Thumbnail uploaded successfully')
    } catch {
      toast.error('Thumbnail upload failed')
      setThumbnailPreview(resource?.thumbnail || '')
    } finally {
      setThumbnailUploading(false)
      setThumbnailProgress(0)
    }
  }

  const uploadMedia = async file => {
    setMediaUploading(true)
    setMediaProgress(0)
    try {
      const { fileUrl } = await uploadToS3(file, setMediaProgress)
      setForm(prev => ({ ...prev, url: fileUrl }))
      setErrors(prev => ({ ...prev, url: '' }))
      toast.success('Media file uploaded successfully')
    } catch {
      toast.error('Media upload failed')
    } finally {
      setMediaUploading(false)
      setMediaProgress(0)
    }
  }

  const handleMediaSelect = async file => {
    if (!file) return
    setMediaFileName(file.name)

    if (form.type === 'audio') {
      const audio = document.createElement('audio')
      audio.preload = 'metadata'
      audio.onloadedmetadata = async () => {
        window.URL.revokeObjectURL(audio.src)
        const durationInSeconds = Math.round(audio.duration) || 0
        setForm(prev => ({ ...prev, duration: durationInSeconds }))
        await uploadMedia(file)
      }
      audio.onerror = () => {
        toast.error('Could not read audio file')
        setMediaFileName('')
      }
      audio.src = URL.createObjectURL(file)
      return
    }

    await uploadMedia(file)
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!validate()) return
    if (thumbnailUploading || mediaUploading) {
      toast.error('Please wait for uploads to finish')
      return
    }

    if (saving || confirmOpen) return
    setConfirmOpen(true)
  }

  const confirmAction = async () => {
    setSaving(true)
    try {
      if (isEdit) {
        await api.put(`/api/resources/${resource._id}`, form)
        onSaved?.()
        onOpenChange?.(false)
        return 'Resource updated successfully'
      }

      await api.post('/api/resources', form)
      onSaved?.()
      onOpenChange?.(false)
      return 'Resource created successfully'
    } catch (err) {
      throw err
    } finally {
      setSaving(false)
    }
  }

  const mediaMeta = form.duration > 0 ? `${Math.round(form.duration / 60)} min` : undefined

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] flex-col overflow-hidden sm:max-w-2xl'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>{isEdit ? 'Edit resource' : 'Add resource'}</DialogTitle>
          <DialogDescription>Details, classification, and media for this learning item.</DialogDescription>
        </DialogHeader>

        <form
          id='resource-form'
          onSubmit={handleSubmit}
          className='scrollbar-thin grid min-h-0 flex-1 gap-4 overflow-y-auto pr-1'
        >
          <div className='space-y-1.5'>
            <Label htmlFor='resource-title'>Title</Label>
            <Input
              id='resource-title'
              value={form.title}
              onChange={e => update('title', e.target.value)}
              required
            />
            {errors.title ? <p className='text-xs text-destructive'>{errors.title}</p> : null}
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='resource-description'>Description</Label>
            <Textarea
              id='resource-description'
              value={form.description}
              onChange={e => update('description', e.target.value)}
              rows={3}
              required
            />
            {errors.description ? <p className='text-xs text-destructive'>{errors.description}</p> : null}
          </div>

          <div className='grid gap-3 sm:grid-cols-2'>
            <div className='space-y-1.5'>
              <Label htmlFor='resource-instructor'>Instructor</Label>
              <select
                id='resource-instructor'
                className={selectClass}
                value={form.instructor}
                onChange={e => update('instructor', e.target.value)}
                required
              >
                <option value=''>Select instructor</option>
                {instructors.map(user => (
                  <option key={user._id} value={user._id}>
                    {user.name}
                  </option>
                ))}
              </select>
              {errors.instructor ? <p className='text-xs text-destructive'>{errors.instructor}</p> : null}
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='resource-type'>Type</Label>
              <select
                id='resource-type'
                className={selectClass}
                value={form.type}
                onChange={e => update('type', e.target.value)}
              >
                <option value='audio'>Audio</option>
                <option value='video'>Video</option>
              </select>
            </div>
          </div>

          <div className='grid gap-3 sm:grid-cols-2'>
            <div className='space-y-1.5'>
              <Label htmlFor='resource-pillar'>Pillar</Label>
              <select
                id='resource-pillar'
                className={selectClass}
                value={form.pillar}
                onChange={e => update('pillar', e.target.value)}
                required
              >
                <option value=''>Select pillar</option>
                {pillars.map(p => (
                  <option key={p._id || p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
              {errors.pillar ? <p className='text-xs text-destructive'>{errors.pillar}</p> : null}
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='resource-category'>Category</Label>
              <select
                id='resource-category'
                className={selectClass}
                value={form.category}
                onChange={e => update('category', e.target.value)}
                disabled={!form.pillar}
                required
              >
                <option value=''>Select category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.category ? <p className='text-xs text-destructive'>{errors.category}</p> : null}
            </div>
          </div>

          <div className='space-y-2'>
            <Label>Tags</Label>
            <div className='flex flex-wrap gap-1.5'>
              {tags.length === 0 ? (
                <p className='text-sm text-muted-foreground'>No tags available</p>
              ) : (
                tags.map(tag => {
                  const selected = form.tags.includes(tag)
                  return (
                    <button
                      key={tag}
                      type='button'
                      onClick={() => toggleTag(tag)}
                      className='rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    >
                      <Badge
                        variant={selected ? 'default' : 'outline'}
                        className={cn('cursor-pointer', selected && 'hover:bg-primary/90')}
                      >
                        {tag}
                      </Badge>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          <label className='flex items-center gap-2 text-sm'>
            <input
              type='checkbox'
              checked={form.isPremium}
              onChange={e => update('isPremium', e.target.checked)}
            />
            Premium content
          </label>

          <div className='grid gap-3 sm:grid-cols-2'>
            <MediaUploadField
              label='Thumbnail'
              hint='Add cover image'
              accept='image/*'
              required
              imagePreview={thumbnailPreview || form.thumbnail || undefined}
              uploading={thumbnailUploading}
              progress={thumbnailProgress}
              error={errors.thumbnail}
              onSelect={handleThumbnailSelect}
            />

            <MediaUploadField
              label={form.type === 'audio' ? 'Audio file' : 'Video file'}
              hint={form.type === 'audio' ? 'Add audio track' : 'Add video file'}
              accept={form.type === 'audio' ? 'audio/*' : 'video/*'}
              required={!isEdit}
              mediaUrl={form.url || undefined}
              fileName={mediaFileName || (form.url ? 'Current media file' : undefined)}
              meta={mediaMeta}
              uploading={mediaUploading}
              progress={mediaProgress}
              error={errors.url}
              onSelect={handleMediaSelect}
            />
          </div>
        </form>

        <DialogFooter className='shrink-0'>
          <Button
            variant='outline'
            onClick={() => onOpenChange?.(false)}
            disabled={saving || thumbnailUploading || mediaUploading}
          >
            Cancel
          </Button>
          <Button
            type='submit'
            form='resource-form'
            disabled={saving || confirmOpen || thumbnailUploading || mediaUploading}
          >
            {saving ? 'Saving…' : isEdit ? 'Update' : 'Add resource'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      title={isEdit ? 'Update resource?' : 'Add resource?'}
      description={isEdit ? 'This will update the resource in the system.' : 'This will create a new resource.'}
      confirmText={isEdit ? 'Update' : 'Create'}
      destructive={false}
      onConfirm={confirmAction}
    />
    </>
  )
}
