'use client'

import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/api'
import { uploadToS3 } from '@/lib/upload'
import { MediaUploadField } from '@/components/resources/media-upload-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'

const emptyForm = {
  title: '',
  description: '',
  primaryImage: '',
  secondaryImage: ''
}

export default function AboutSection() {
  const [form, setForm] = useState(emptyForm)
  const [existingId, setExistingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState({ primaryImage: false, secondaryImage: false })
  const [progress, setProgress] = useState({ primaryImage: 0, secondaryImage: 0 })

  const fetchAbout = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true)
      const res = await api.get('/api/about')
      if (res.data) {
        setForm({
          title: res.data.title || '',
          description: res.data.description || '',
          primaryImage: res.data.primaryImage || '',
          secondaryImage: res.data.secondaryImage || ''
        })
        setExistingId(res.data._id || null)
      } else {
        setForm(emptyForm)
        setExistingId(null)
      }
    } catch {
      toast.error('Failed to load About data')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      fetchAbout()
    })
  }, [])

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const handleImageSelect = async (field, file) => {
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should not exceed 5MB')
      return
    }

    setUploading(prev => ({ ...prev, [field]: true }))
    setProgress(prev => ({ ...prev, [field]: 0 }))

    try {
      const { fileUrl } = await uploadToS3(file, percent => {
        setProgress(prev => ({ ...prev, [field]: percent }))
      })
      update(field, fileUrl)
      toast.success('Image uploaded')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(prev => ({ ...prev, [field]: false }))
      setProgress(prev => ({ ...prev, [field]: 0 }))
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()

    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Title and description are required')
      return
    }

    setSaving(true)
    try {
      await api.post('/api/about', {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        ...(existingId ? { _id: existingId } : {})
      })
      toast.success('About section saved successfully')
      await fetchAbout({ silent: true })
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save About')
    } finally {
      setSaving(false)
    }
  }

  const busy = saving || uploading.primaryImage || uploading.secondaryImage

  if (loading) {
    return (
      <div className='space-y-4'>
        <Skeleton className='h-40 w-full' />
        <div className='grid gap-4 md:grid-cols-2'>
          <Skeleton className='h-44 w-full' />
          <Skeleton className='h-44 w-full' />
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <div className='grid gap-4 lg:grid-cols-7'>
        <Card className='lg:col-span-4'>
          <CardHeader>
            <CardTitle>Copy</CardTitle>
            <CardDescription>Main text users see first.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='space-y-1.5'>
              <Label htmlFor='about-title'>
                Title <span className='text-destructive'>*</span>
              </Label>
              <Input
                id='about-title'
                value={form.title}
                onChange={e => update('title', e.target.value)}
                required
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='about-description'>
                Description <span className='text-destructive'>*</span>
              </Label>
              <Textarea
                id='about-description'
                value={form.description}
                onChange={e => update('description', e.target.value)}
                rows={6}
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card className='lg:col-span-3'>
          <CardHeader>
            <CardTitle>Images</CardTitle>
            <CardDescription>Primary and secondary visuals.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            <MediaUploadField
              label='Primary image'
              hint='Click or drag an image'
              accept='image/*'
              imagePreview={form.primaryImage || undefined}
              uploading={uploading.primaryImage}
              progress={progress.primaryImage}
              onSelect={file => handleImageSelect('primaryImage', file)}
            />
            <MediaUploadField
              label='Secondary image'
              hint='Click or drag an image'
              accept='image/*'
              imagePreview={form.secondaryImage || undefined}
              uploading={uploading.secondaryImage}
              progress={progress.secondaryImage}
              onSelect={file => handleImageSelect('secondaryImage', file)}
            />
          </CardContent>
        </Card>
      </div>

      <div className='flex justify-end'>
        <Button type='submit' disabled={busy}>
          <Save className='size-4' />
          {saving ? 'Saving…' : existingId ? 'Save changes' : 'Publish about'}
        </Button>
      </div>
    </form>
  )
}
