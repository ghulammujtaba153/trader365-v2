'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/api'
import { uploadToS3 } from '@/lib/upload'
import { MediaUploadField } from '@/components/resources/media-upload-field'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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

const PLATFORM_OPTIONS = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'twitch', label: 'Twitch' },
  { value: 'vimeo', label: 'Vimeo' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'rumble', label: 'Rumble' }
]

const NOTIFICATION_OPTIONS = [
  '2 hours before',
  '1 hour before',
  '30 minutes before',
  '10 minutes before',
  'At start time'
]

const emptyForm = () => ({
  title: '',
  description: '',
  platform: [],
  startDateTime: '',
  endDateTime: '',
  user: '',
  tags: [],
  thumbnail: '',
  sendNotification: []
})

function toDatetimeLocalValue(value) {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function defaultSchedule() {
  const start = new Date()
  start.setSeconds(0, 0)
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  return {
    startDateTime: toDatetimeLocalValue(start),
    endDateTime: toDatetimeLocalValue(end)
  }
}

export default function LivestreamFormDialog({ open, onOpenChange, livestream, onSaved }) {
  const [form, setForm] = useState(emptyForm)
  const [hosts, setHosts] = useState([])
  const [tags, setTags] = useState([])
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [newPlatform, setNewPlatform] = useState({ type: '', url: '' })
  const [platformErrors, setPlatformErrors] = useState({ type: false, url: false })
  const isEdit = Boolean(livestream)

  const clearError = key => {
    setErrors(prev => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const update = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
    clearError(key)
  }

  const fetchHosts = useCallback(async () => {
    try {
      const [adminsRes, editorsRes, meRes] = await Promise.all([
        api.get('/api/auth/admins'),
        api.get('/api/auth/editors'),
        api.get('/api/auth/me')
      ])

      const admins = adminsRes.data.users || []
      const editors = editorsRes.data.users || []
      const merged = [...admins, ...editors]
      const seen = new Set()
      const unique = merged.filter(u => {
        if (!u?._id || seen.has(u._id)) return false
        seen.add(u._id)
        return true
      })

      setHosts(unique)

      const currentUser = meRes.data.user
      if (!livestream && currentUser && unique.some(u => u._id === currentUser._id)) {
        setForm(prev => (prev.user ? prev : { ...prev, user: currentUser._id }))
      }
    } catch {
      toast.error('Failed to load hosts')
    }
  }, [livestream])

  const fetchTags = async () => {
    try {
      const res = await api.get('/api/tags')
      setTags(Array.isArray(res.data) ? res.data : [])
    } catch {
      toast.error('Failed to load tags')
    }
  }

  useEffect(() => {
    if (!open) return
    fetchHosts()
    fetchTags()
  }, [open, fetchHosts])

  useEffect(() => {
    if (!open) return

    if (livestream) {
      setForm({
        title: livestream.title || '',
        description: livestream.description || '',
        platform: livestream.platform || [],
        startDateTime: toDatetimeLocalValue(livestream.startDateTime),
        endDateTime: toDatetimeLocalValue(livestream.endDateTime),
        user: livestream.user?._id || livestream.user || '',
        tags: livestream.tags || [],
        thumbnail: livestream.thumbnail || '',
        sendNotification: livestream.sendNotification || []
      })
    } else {
      setForm({
        ...emptyForm(),
        ...defaultSchedule()
      })
    }

    setErrors({})
    setNewPlatform({ type: '', url: '' })
    setPlatformErrors({ type: false, url: false })
    setUploading(false)
    setProgress(0)
  }, [open, livestream])

  const validate = () => {
    const next = {}
    if (!form.title.trim()) next.title = 'Title is required'
    if (!form.description.trim()) next.description = 'Description is required'
    if (!form.user) next.user = 'Host is required'
    if (!form.thumbnail) next.thumbnail = 'Thumbnail is required'
    if (!form.startDateTime) next.startDateTime = 'Start date & time is required'
    if (!form.endDateTime) next.endDateTime = 'End date & time is required'
    if (!form.platform.length) {
      next.platform = 'At least one platform is required'
      setPlatformErrors({
        type: !newPlatform.type,
        url: !newPlatform.url
      })
    }
    if (!form.sendNotification.length) {
      next.sendNotification = 'At least one notification time is required'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleThumbnail = async file => {
    if (!file) return
    if (!file.type?.startsWith('image/')) {
      toast.error('Please select a valid image file')
      return
    }

    setUploading(true)
    setProgress(0)
    try {
      const { fileUrl } = await uploadToS3(file, percent => setProgress(percent))
      update('thumbnail', fileUrl)
      toast.success('Thumbnail uploaded successfully')
    } catch {
      toast.error('Thumbnail upload failed')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const handleAddPlatform = () => {
    const nextErrors = { type: !newPlatform.type, url: !newPlatform.url.trim() }
    setPlatformErrors(nextErrors)
    if (nextErrors.type || nextErrors.url) {
      toast.error(
        nextErrors.type && nextErrors.url
          ? 'Please select platform type and enter URL'
          : nextErrors.type
            ? 'Please select a platform type'
            : 'Please enter a platform URL'
      )
      return
    }

    setForm(prev => ({
      ...prev,
      platform: [...prev.platform, { type: newPlatform.type, url: newPlatform.url.trim() }]
    }))
    setNewPlatform({ type: '', url: '' })
    setPlatformErrors({ type: false, url: false })
    clearError('platform')
  }

  const handleRemovePlatform = index => {
    setForm(prev => ({
      ...prev,
      platform: prev.platform.filter((_, i) => i !== index)
    }))
  }

  const toggleNotification = option => {
    setForm(prev => {
      const exists = prev.sendNotification.includes(option)
      return {
        ...prev,
        sendNotification: exists
          ? prev.sendNotification.filter(item => item !== option)
          : [...prev.sendNotification, option]
      }
    })
    clearError('sendNotification')
  }

  const toggleTag = tag => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag]
    }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!validate()) {
      toast.error(
        !form.platform.length
          ? 'Please add at least one platform before submitting'
          : 'Please fill in all required fields'
      )
      return
    }
    if (saving || confirmOpen) return
    setConfirmOpen(true)
  }

  const confirmAction = async () => {
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        platform: form.platform,
        startDateTime: new Date(form.startDateTime).toISOString(),
        endDateTime: new Date(form.endDateTime).toISOString(),
        user: form.user,
        tags: form.tags,
        thumbnail: form.thumbnail,
        sendNotification: form.sendNotification
      }

      if (isEdit) {
        await api.put(`/api/livestream/update/${livestream._id}`, payload)
        onSaved?.()
        onOpenChange?.(false)
        return 'Livestream updated successfully'
      }

      await api.post('/api/livestream/create', payload)
      onSaved?.()
      onOpenChange?.(false)
      return 'Livestream added successfully'
    } catch (err) {
      throw new Error(
        err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          'Failed to save livestream'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] flex-col overflow-hidden sm:max-w-4xl'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>{isEdit ? 'Edit livestream' : 'Add livestream'}</DialogTitle>
          <DialogDescription>Schedule, media, platforms, and notification timing.</DialogDescription>
        </DialogHeader>

        <form
          id='livestream-form'
          onSubmit={handleSubmit}
          className='scrollbar-thin min-h-0 flex-1 space-y-5 overflow-y-auto pr-1'
        >
          <div className='space-y-3'>
            <p className='text-sm font-medium'>Basics</p>
            <div className='space-y-1.5'>
              <Label htmlFor='ls-title'>
                Title <span className='text-destructive'>*</span>
              </Label>
              <Input
                id='ls-title'
                value={form.title}
                onChange={e => update('title', e.target.value)}
                aria-invalid={Boolean(errors.title)}
              />
              {errors.title ? <p className='text-xs text-destructive'>{errors.title}</p> : null}
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='ls-description'>
                Description <span className='text-destructive'>*</span>
              </Label>
              <Textarea
                id='ls-description'
                value={form.description}
                onChange={e => update('description', e.target.value)}
                rows={3}
                aria-invalid={Boolean(errors.description)}
              />
              {errors.description ? (
                <p className='text-xs text-destructive'>{errors.description}</p>
              ) : null}
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='ls-host'>
                Host <span className='text-destructive'>*</span>
              </Label>
              <select
                id='ls-host'
                className='h-8 w-full rounded-lg border border-input bg-background px-2 text-sm'
                value={form.user}
                onChange={e => update('user', e.target.value)}
                aria-invalid={Boolean(errors.user)}
              >
                <option value=''>Select host</option>
                {hosts.map(user => (
                  <option key={user._id} value={user._id}>
                    {user.name || user.email}
                  </option>
                ))}
              </select>
              {errors.user ? <p className='text-xs text-destructive'>{errors.user}</p> : null}
            </div>
          </div>

          <div className='space-y-3'>
            <p className='text-sm font-medium'>Media</p>
            <MediaUploadField
              label='Thumbnail'
              hint='Add cover image'
              accept='image/*'
              required
              imagePreview={form.thumbnail || undefined}
              uploading={uploading}
              progress={progress}
              error={errors.thumbnail}
              onSelect={handleThumbnail}
            />
          </div>

          <div className='space-y-3'>
            <p className='text-sm font-medium'>Schedule</p>
            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='space-y-1.5'>
                <Label htmlFor='ls-start'>
                  Start date & time <span className='text-destructive'>*</span>
                </Label>
                <Input
                  id='ls-start'
                  type='datetime-local'
                  value={form.startDateTime}
                  onChange={e => update('startDateTime', e.target.value)}
                  aria-invalid={Boolean(errors.startDateTime)}
                />
                {errors.startDateTime ? (
                  <p className='text-xs text-destructive'>{errors.startDateTime}</p>
                ) : null}
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='ls-end'>
                  End date & time <span className='text-destructive'>*</span>
                </Label>
                <Input
                  id='ls-end'
                  type='datetime-local'
                  value={form.endDateTime}
                  min={form.startDateTime || undefined}
                  onChange={e => update('endDateTime', e.target.value)}
                  aria-invalid={Boolean(errors.endDateTime)}
                />
                {errors.endDateTime ? (
                  <p className='text-xs text-destructive'>{errors.endDateTime}</p>
                ) : null}
              </div>
            </div>

            <div className='space-y-2'>
              <Label>
                Send notification <span className='text-destructive'>*</span>
              </Label>
              <div className='space-y-2 rounded-lg border border-border p-3'>
                {NOTIFICATION_OPTIONS.map(option => {
                  const checked = form.sendNotification.includes(option)
                  return (
                    <label key={option} className='flex cursor-pointer items-center gap-2 text-sm'>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleNotification(option)}
                      />
                      {option}
                    </label>
                  )
                })}
              </div>
              {errors.sendNotification ? (
                <p className='text-xs text-destructive'>{errors.sendNotification}</p>
              ) : null}
            </div>
          </div>

          <div className='space-y-3'>
            <p className='text-sm font-medium'>
              Platforms <span className='text-destructive'>*</span>
            </p>
            <div className='flex flex-col gap-2 sm:flex-row sm:items-start'>
              <select
                className='h-8 w-full rounded-lg border border-input bg-background px-2 text-sm sm:w-44'
                value={newPlatform.type}
                onChange={e => {
                  setNewPlatform(prev => ({ ...prev, type: e.target.value }))
                  setPlatformErrors(prev => ({ ...prev, type: false }))
                }}
                aria-invalid={platformErrors.type}
              >
                <option value=''>Platform</option>
                {PLATFORM_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Input
                value={newPlatform.url}
                onChange={e => {
                  setNewPlatform(prev => ({ ...prev, url: e.target.value }))
                  setPlatformErrors(prev => ({ ...prev, url: false }))
                }}
                placeholder='https://...'
                className='flex-1'
                aria-invalid={platformErrors.url}
              />
              <Button type='button' variant='outline' onClick={handleAddPlatform}>
                <Plus className='size-4' />
                Add
              </Button>
            </div>

            <div className='flex flex-wrap gap-2'>
              {form.platform.map((platform, index) => {
                const label =
                  PLATFORM_OPTIONS.find(p => p.value === platform.type)?.label || platform.type
                return (
                  <Badge key={`${platform.type}-${index}`} variant='outline' className='gap-1 pr-1'>
                    <span className='max-w-56 truncate'>
                      {label}: {platform.url}
                    </span>
                    <button
                      type='button'
                      className='rounded-full p-0.5 hover:bg-muted'
                      onClick={() => handleRemovePlatform(index)}
                      aria-label={`Remove ${label}`}
                    >
                      <X className='size-3' />
                    </button>
                  </Badge>
                )
              })}
            </div>
            {form.platform.length === 0 ? (
              <p className={`text-xs ${errors.platform ? 'text-destructive' : 'text-muted-foreground'}`}>
                {errors.platform || 'No platforms added yet. Add at least one platform.'}
              </p>
            ) : null}
          </div>

          {tags.length > 0 ? (
            <div className='space-y-2'>
              <Label>Tags (optional)</Label>
              <div className='flex flex-wrap gap-2'>
                {tags.map(tag => {
                  const selected = form.tags.includes(tag)
                  return (
                    <button
                      key={tag}
                      type='button'
                      onClick={() => toggleTag(tag)}
                      className='cursor-pointer'
                    >
                      <Badge variant={selected ? 'default' : 'outline'}>{tag}</Badge>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </form>

        <DialogFooter className='shrink-0'>
          <Button variant='outline' onClick={() => onOpenChange?.(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type='submit' form='livestream-form' disabled={saving || confirmOpen || uploading}>
            {saving ? 'Saving…' : isEdit ? 'Update' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      title={isEdit ? 'Update livestream?' : 'Add livestream?'}
      description={isEdit ? 'This will update the livestream schedule and details.' : 'This will create a new livestream schedule.'}
      confirmText={isEdit ? 'Update' : 'Create'}
      destructive={false}
      onConfirm={confirmAction}
    />
    </>
  )
}
