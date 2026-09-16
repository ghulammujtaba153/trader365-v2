'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import api from '@/lib/api'
import { uploadToS3 } from '@/lib/upload'
import { MediaUploadField } from '@/components/resources/media-upload-field'
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

const emptyForm = {
  title: '',
  description: '',
  image: '',
  audio: '',
  duration: '',
  instructor: ''
}

export default function DailyThoughtFormDialog({ open, onOpenChange, thought, onSaved }) {
  const [form, setForm] = useState(emptyForm)
  const [instructors, setInstructors] = useState([])
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [uploading, setUploading] = useState({ image: false, audio: false })
  const [progress, setProgress] = useState({ image: 0, audio: 0 })
  const isEdit = Boolean(thought)

  useEffect(() => {
    if (!open) return

    const loadInstructors = async () => {
      try {
        const res = await api.get('/api/auth/editors')
        setInstructors(res.data.users || [])
      } catch {
        toast.error('Failed to load instructors')
      }
    }

    loadInstructors()
  }, [open])

  useEffect(() => {
    if (!open) return

    if (thought) {
      setForm({
        title: thought.title || '',
        description: thought.description || '',
        image: thought.image || '',
        audio: thought.audio || '',
        duration: thought.duration ?? '',
        instructor: thought.instructor?._id || thought.instructor || ''
      })
    } else {
      setForm(emptyForm)
    }

    setErrors({})
    setUploading({ image: false, audio: false })
    setProgress({ image: 0, audio: 0 })
  }, [open, thought])

  const update = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  const validate = () => {
    const next = {}
    if (!form.title.trim()) next.title = 'Title is required'
    if (!form.description.trim()) next.description = 'Description is required'
    if (!form.instructor) next.instructor = 'Instructor is required'
    if (!form.image) next.image = 'Image is required'
    if (!form.audio) next.audio = 'Audio is required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleUpload = async (field, file) => {
    if (!file) return

    setUploading(prev => ({ ...prev, [field]: true }))
    setProgress(prev => ({ ...prev, [field]: 0 }))

    try {
      const { fileUrl } = await uploadToS3(file, percent => {
        setProgress(prev => ({ ...prev, [field]: percent }))
      })

      if (field === 'audio') {
        const audioEl = new Audio(fileUrl)
        audioEl.onloadedmetadata = () => {
          update('duration', Number(audioEl.duration.toFixed(2)))
        }
        setForm(prev => ({ ...prev, audio: fileUrl }))
        setErrors(prev => ({ ...prev, audio: undefined }))
      } else {
        update('image', fileUrl)
      }

      toast.success(`${field === 'audio' ? 'Audio' : 'Image'} uploaded successfully`)
    } catch {
      toast.error(`Failed to upload ${field}`)
    } finally {
      setUploading(prev => ({ ...prev, [field]: false }))
      setProgress(prev => ({ ...prev, [field]: 0 }))
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!validate()) {
      toast.error('Please fill in all required fields')
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
        image: form.image,
        audio: form.audio,
        duration: Number(form.duration) || 0,
        instructor: form.instructor
      }

      if (isEdit) {
        await api.put(`/api/daily-thought/update/${thought._id}`, payload)
        onSaved?.()
        onOpenChange?.(false)
        return 'Daily thought updated successfully'
      }

      await api.post('/api/daily-thought/create', payload)
      onSaved?.()
      onOpenChange?.(false)
      return 'Daily thought added successfully'
    } catch (err) {
      throw err
    } finally {
      setSaving(false)
    }
  }

  const durationMeta = form.duration
    ? `${Math.max(1, Math.round(Number(form.duration) / 60))} min`
    : undefined

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] flex-col overflow-hidden sm:max-w-4xl'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>{isEdit ? 'Edit daily thought' : 'Add daily thought'}</DialogTitle>
          <DialogDescription>Details, instructor, and media for this thought.</DialogDescription>
        </DialogHeader>

        <form
          id='daily-thought-form'
          onSubmit={handleSubmit}
          className='scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto pr-1'
        >
          <div className='space-y-1.5'>
            <Label htmlFor='dt-title'>
              Title <span className='text-destructive'>*</span>
            </Label>
            <Input
              id='dt-title'
              value={form.title}
              onChange={e => update('title', e.target.value)}
              aria-invalid={Boolean(errors.title)}
            />
            {errors.title ? <p className='text-xs text-destructive'>{errors.title}</p> : null}
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='dt-description'>
              Description <span className='text-destructive'>*</span>
            </Label>
            <Textarea
              id='dt-description'
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
            <Label htmlFor='dt-instructor'>
              Instructor <span className='text-destructive'>*</span>
            </Label>
            <select
              id='dt-instructor'
              className='h-8 w-full rounded-lg border border-input bg-background px-2 text-sm'
              value={form.instructor}
              onChange={e => update('instructor', e.target.value)}
              aria-invalid={Boolean(errors.instructor)}
            >
              <option value=''>Select instructor</option>
              {instructors.map(inst => (
                <option key={inst._id} value={inst._id}>
                  {inst.name || inst.email}
                </option>
              ))}
            </select>
            {errors.instructor ? (
              <p className='text-xs text-destructive'>{errors.instructor}</p>
            ) : null}
          </div>

          <div className='flex flex-col gap-3 sm:flex-row'>
            <MediaUploadField
              label='Cover image'
              hint='Add cover image'
              accept='image/*'
              required
              imagePreview={form.image || undefined}
              uploading={uploading.image}
              progress={progress.image}
              error={errors.image}
              onSelect={file => handleUpload('image', file)}
            />
            <MediaUploadField
              label='Audio'
              hint='Add audio track'
              accept='audio/*'
              required
              mediaUrl={form.audio || undefined}
              fileName={form.audio ? 'Audio file' : undefined}
              meta={durationMeta}
              uploading={uploading.audio}
              progress={progress.audio}
              error={errors.audio}
              onSelect={file => handleUpload('audio', file)}
            />
          </div>
        </form>

        <DialogFooter className='shrink-0'>
          <Button variant='outline' onClick={() => onOpenChange?.(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            type='submit'
            form='daily-thought-form'
            disabled={saving || confirmOpen || uploading.image || uploading.audio}
          >
            {saving ? 'Saving…' : isEdit ? 'Update' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      title={isEdit ? 'Update daily thought?' : 'Add daily thought?'}
      description={isEdit ? 'This will update the daily thought item.' : 'This will create a new daily thought item.'}
      confirmText={isEdit ? 'Update' : 'Create'}
      destructive={false}
      onConfirm={confirmAction}
    />
    </>
  )
}
