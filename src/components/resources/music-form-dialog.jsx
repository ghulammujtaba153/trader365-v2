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

export default function MusicFormDialog({ open, onOpenChange, resource, onSaved }) {
  const [form, setForm] = useState(emptyForm)
  const [pillars, setPillars] = useState([])
  const [tags, setTags] = useState([])
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [thumbnailPreview, setThumbnailPreview] = useState('')
  const [thumbnailUploading, setThumbnailUploading] = useState(false)
  const [thumbnailProgress, setThumbnailProgress] = useState(0)
  const [audioFileName, setAudioFileName] = useState('')
  const [audioUploading, setAudioUploading] = useState(false)
  const [audioProgress, setAudioProgress] = useState(0)
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
        const [pillarsRes, tagsRes] = await Promise.all([
          api.get('/api/pillars/categories'),
          api.get('/api/tags')
        ])
        setPillars(Array.isArray(pillarsRes.data) ? pillarsRes.data : [])
        const tagList = Array.isArray(tagsRes.data) ? tagsRes.data : []
        setTags([...tagList, 'daily thought'].filter((t, i, arr) => arr.indexOf(t) === i))
      } catch {
        toast.error('Failed to load form options')
      }
    }

    loadMeta()

    if (resource) {
      setForm({
        title: resource.title || '',
        description: resource.description || '',
        type: 'audio',
        pillar: resource.pillar || '',
        category: resource.category || '',
        tags: Array.isArray(resource.tags) ? resource.tags : [],
        isPremium: Boolean(resource.isPremium),
        thumbnail: resource.thumbnail || '',
        url: resource.url || '',
        duration: Number(resource.duration) || 0
      })
      setThumbnailPreview(resource.thumbnail || '')
      setAudioFileName(resource.url ? 'Current audio file' : '')
    } else {
      setForm(emptyForm)
      setThumbnailPreview('')
      setAudioFileName('')
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
    if (!form.pillar) next.pillar = 'Pillar is required'
    if (!form.category) next.category = 'Category is required'
    if (!form.thumbnail) next.thumbnail = 'Thumbnail is required'
    if (!form.url) {
      next.url = 'Audio file is required'
    } else if (!Number.isFinite(Number(form.duration)) || Number(form.duration) <= 0) {
      next.url = 'Wait for the audio file to finish processing (duration required)'
    }
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

  const uploadAudio = async file => {
    setAudioUploading(true)
    setAudioProgress(0)
    try {
      const { fileUrl } = await uploadToS3(file, setAudioProgress)
      setForm(prev => ({ ...prev, url: fileUrl }))
      setErrors(prev => ({ ...prev, url: '' }))
      toast.success('Audio file uploaded successfully')
    } catch {
      toast.error('Audio upload failed')
    } finally {
      setAudioUploading(false)
      setAudioProgress(0)
    }
  }

  const handleAudioSelect = async file => {
    if (!file) return
    if (!file.type.startsWith('audio/')) {
      toast.error('Please select a valid audio file')
      return
    }

    setAudioFileName(file.name)

    const audio = document.createElement('audio')
    audio.preload = 'metadata'

    audio.onloadedmetadata = async () => {
      const rawDuration = audio.duration
      window.URL.revokeObjectURL(audio.src)
      const durationInSeconds =
        Number.isFinite(rawDuration) && rawDuration > 0 ? Math.round(rawDuration) : 0

      if (!durationInSeconds) {
        toast.error('Could not read audio duration. Try another file.')
        setAudioFileName('')
        return
      }

      setForm(prev => ({ ...prev, duration: durationInSeconds }))
      await uploadAudio(file)
    }

    audio.onerror = () => {
      toast.error('Invalid audio file or corrupted file')
      setAudioFileName('')
    }

    audio.src = URL.createObjectURL(file)
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!validate()) return
    if (thumbnailUploading || audioUploading) {
      toast.error('Please wait for uploads to finish')
      return
    }

    if (saving || confirmOpen) return
    setConfirmOpen(true)
  }

  const confirmAction = async () => {
    setSaving(true)
    try {
      const payload = { ...form, type: 'audio' }
      if (isEdit) {
        await api.put(`/api/music/${resource._id}`, payload)
        onSaved?.()
        onOpenChange?.(false)
        return 'Music updated successfully'
      }
      await api.post('/api/music', payload)
      onSaved?.()
      onOpenChange?.(false)
      return 'Music created successfully'
    } catch (err) {
      throw err
    } finally {
      setSaving(false)
    }
  }

  const audioMeta = form.duration > 0 ? `${Math.round(form.duration / 60)} min` : undefined

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] flex-col overflow-hidden sm:max-w-2xl'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>{isEdit ? 'Edit music' : 'Add music'}</DialogTitle>
          <DialogDescription>Track details, classification, and audio file.</DialogDescription>
        </DialogHeader>

        <form
          id='music-form'
          onSubmit={handleSubmit}
          className='scrollbar-thin grid min-h-0 flex-1 gap-4 overflow-y-auto pr-1'
        >
          <div className='space-y-1.5'>
            <Label htmlFor='music-title'>Title</Label>
            <Input
              id='music-title'
              value={form.title}
              onChange={e => update('title', e.target.value)}
              required
            />
            {errors.title ? <p className='text-xs text-destructive'>{errors.title}</p> : null}
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='music-description'>Description</Label>
            <Textarea
              id='music-description'
              value={form.description}
              onChange={e => update('description', e.target.value)}
              rows={3}
              required
            />
            {errors.description ? <p className='text-xs text-destructive'>{errors.description}</p> : null}
          </div>

          <div className='grid gap-3 sm:grid-cols-2'>
            <div className='space-y-1.5'>
              <Label htmlFor='music-pillar'>Pillar</Label>
              <select
                id='music-pillar'
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
              <Label htmlFor='music-category'>Category</Label>
              <select
                id='music-category'
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
              label='Audio file'
              hint='Add audio track'
              accept='audio/*'
              required={!isEdit}
              mediaUrl={form.url || undefined}
              fileName={audioFileName || (form.url ? 'Current audio file' : undefined)}
              meta={audioMeta}
              uploading={audioUploading}
              progress={audioProgress}
              error={errors.url}
              onSelect={handleAudioSelect}
            />
          </div>
        </form>

        <DialogFooter className='shrink-0'>
          <Button
            variant='outline'
            onClick={() => onOpenChange?.(false)}
            disabled={saving || thumbnailUploading || audioUploading}
          >
            Cancel
          </Button>
          <Button
            type='submit'
            form='music-form'
            disabled={saving || confirmOpen || thumbnailUploading || audioUploading}
          >
            {saving ? 'Saving…' : isEdit ? 'Update' : 'Add music'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      title={isEdit ? 'Update music?' : 'Add music?'}
      description={isEdit ? 'This will update the existing music item.' : 'This will create a new music item.'}
      confirmText={isEdit ? 'Update' : 'Create'}
      destructive={false}
      onConfirm={confirmAction}
    />
    </>
  )
}
