'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/api'
import { uploadToS3 } from '@/lib/upload'
import { MediaUploadField } from '@/components/resources/media-upload-field'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function PillarFormDialog({ open, onOpenChange, pillar, onSaved }) {
  const [name, setName] = useState('')
  const [categories, setCategories] = useState([])
  const [image, setImage] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [categoryInput, setCategoryInput] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const isEdit = Boolean(pillar?._id)

  useEffect(() => {
    if (!open) return
    setName(pillar?.name || '')
    setCategories(Array.isArray(pillar?.categories) ? pillar.categories : [])
    setImage(pillar?.image || '')
    setPreviewUrl(pillar?.image || '')
    setCategoryInput('')
    setErrors({})
    setProgress(0)
  }, [open, pillar])

  const addCategory = () => {
    const trimmed = categoryInput.trim()
    if (!trimmed || categories.includes(trimmed)) return
    setCategories(prev => [...prev, trimmed])
    setCategoryInput('')
    setErrors(prev => ({ ...prev, categories: '' }))
  }

  const removeCategory = cat => {
    setCategories(prev => prev.filter(c => c !== cat))
  }

  const handleImageSelect = async file => {
    if (!file) return
    setUploading(true)
    setProgress(0)
    try {
      const { fileUrl } = await uploadToS3(file, percent => setProgress(percent || 0))
      setImage(fileUrl)
      setPreviewUrl(fileUrl)
      setErrors(prev => ({ ...prev, image: '' }))
    } catch (err) {
      toast.error(err.message || 'Image upload failed')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const validate = () => {
    const next = {}
    if (!name.trim()) next.name = 'Pillar name is required'
    if (!image) next.image = 'Image is required'
    if (!categories.length) next.categories = 'At least one category is required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        image,
        categories
      }
      if (isEdit) {
        await api.put(`/api/pillars/categories/${pillar._id}`, payload)
        toast.success('Pillar updated successfully')
      } else {
        await api.post('/api/pillars/categories', payload)
        toast.success('Pillar created successfully')
      }
      onSaved?.()
      onOpenChange?.(false)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save pillar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] flex-col overflow-hidden sm:max-w-lg'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>{isEdit ? 'Update pillar' : 'Add new pillar'}</DialogTitle>
          <DialogDescription>Set the pillar name, cover image, and categories.</DialogDescription>
        </DialogHeader>

        <form
          id='pillar-form'
          onSubmit={handleSubmit}
          className='scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto pr-1'
        >
          <div className='space-y-1.5'>
            <Label htmlFor='pillar-name'>Pillar name</Label>
            <Input
              id='pillar-name'
              value={name}
              onChange={e => {
                setName(e.target.value)
                if (errors.name) setErrors(prev => ({ ...prev, name: '' }))
              }}
              required
            />
            {errors.name ? <p className='text-xs text-destructive'>{errors.name}</p> : null}
          </div>

          <MediaUploadField
            label='Pillar image'
            hint='Add cover image'
            accept='image/*'
            required
            imagePreview={previewUrl || undefined}
            uploading={uploading}
            progress={progress}
            error={errors.image}
            onSelect={handleImageSelect}
          />

          <div className='space-y-2'>
            <Label htmlFor='pillar-category'>Categories</Label>
            <div className='flex gap-2'>
              <Input
                id='pillar-category'
                value={categoryInput}
                onChange={e => setCategoryInput(e.target.value)}
                placeholder='Add category'
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addCategory()
                  }
                }}
              />
              <Button type='button' variant='outline' onClick={addCategory}>
                Add
              </Button>
            </div>
            {categories.length > 0 ? (
              <div className='flex flex-wrap gap-1.5 pt-1'>
                {categories.map(cat => (
                  <Badge key={cat} variant='outline' className='gap-1 pr-1'>
                    {cat}
                    <button
                      type='button'
                      className='rounded-sm p-0.5 hover:bg-muted'
                      onClick={() => removeCategory(cat)}
                      aria-label={`Remove ${cat}`}
                    >
                      <X className='size-3' />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className='text-xs text-muted-foreground'>No categories added yet.</p>
            )}
            {errors.categories ? <p className='text-xs text-destructive'>{errors.categories}</p> : null}
          </div>
        </form>

        <DialogFooter className='shrink-0'>
          <Button variant='outline' onClick={() => onOpenChange?.(false)} disabled={saving || uploading}>
            Cancel
          </Button>
          <Button type='submit' form='pillar-form' disabled={saving || uploading}>
            {saving ? 'Saving…' : isEdit ? 'Update' : 'Add pillar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
