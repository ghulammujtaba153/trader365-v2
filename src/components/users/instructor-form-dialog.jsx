'use client'

import { useEffect, useMemo, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Skeleton } from '@/components/ui/skeleton'

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  password: '',
  categories: []
}

export default function InstructorFormDialog({ open, onOpenChange, instructor, onSaved }) {
  const isEdit = Boolean(instructor)
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [allCategories, setAllCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [categorySearch, setCategorySearch] = useState('')

  useEffect(() => {
    if (!open) return
    setShowPassword(false)
    setCategorySearch('')
    if (instructor) {
      setForm({
        name: instructor.name || '',
        phone: instructor.phone || '',
        email: instructor.email || '',
        password: '',
        categories: Array.isArray(instructor.categories) ? [...instructor.categories] : []
      })
    } else {
      setForm(emptyForm)
    }

    const loadCategories = async () => {
      try {
        setCategoriesLoading(true)
        const res = await api.get('/api/pillars/categories/all')
        const list = Array.isArray(res.data?.categories) ? res.data.categories : []
        setAllCategories([...new Set(list.map(String).filter(Boolean))].sort((a, b) => a.localeCompare(b)))
      } catch {
        toast.error('Failed to load categories')
        setAllCategories([])
      } finally {
        setCategoriesLoading(false)
      }
    }

    loadCategories()
  }, [open, instructor])

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase()
    if (!q) return allCategories
    return allCategories.filter(cat => cat.toLowerCase().includes(q))
  }, [allCategories, categorySearch])

  const toggleCategory = cat => {
    setForm(prev => {
      const next = prev.categories.includes(cat)
        ? prev.categories.filter(item => item !== cat)
        : [...prev.categories, cat]
      return { ...prev, categories: next }
    })
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone,
        email: form.email.trim(),
        role: 'editor'
      }
      if (form.password) payload.password = form.password

      let instructorId = instructor?._id

      if (isEdit) {
        const { role, ...profileData } = payload
        await api.put(`/api/auth/users/update/${instructor._id}`, profileData)
        if (instructor.role !== 'editor') {
          await api.patch(`/api/auth/users/${instructor._id}/role`, { role })
        }
      } else {
        if (!form.password) {
          toast.error('Password is required')
          setSaving(false)
          return
        }
        const res = await api.post('/api/auth/register', payload)
        instructorId = res.data?.user?._id
        if (!instructorId) {
          throw new Error('Instructor created but id was missing')
        }
      }

      if (instructorId) {
        await api.post('/api/auth/category/update', {
          userId: instructorId,
          categories: form.categories
        })
      }

      toast.success(isEdit ? 'Instructor updated successfully' : 'Instructor created successfully')
      onSaved?.()
      onOpenChange?.(false)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save instructor')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] flex-col overflow-hidden sm:max-w-xl'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>{isEdit ? 'Edit instructor' : 'Add instructor'}</DialogTitle>
          <DialogDescription>
            Update profile details and the content categories this instructor can access.
          </DialogDescription>
        </DialogHeader>

        <form
          id='instructor-form'
          onSubmit={handleSubmit}
          className='scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto pr-1'
        >
          <div className='grid gap-3 sm:grid-cols-2'>
            <div className='space-y-1.5 sm:col-span-2'>
              <Label htmlFor='instructor-name'>Name</Label>
              <Input
                id='instructor-name'
                value={form.name}
                onChange={e => update('name', e.target.value)}
                required
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='instructor-email'>Email</Label>
              <Input
                id='instructor-email'
                type='email'
                value={form.email}
                onChange={e => update('email', e.target.value)}
                required
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='instructor-phone'>Phone</Label>
              <Input
                id='instructor-phone'
                value={form.phone}
                onChange={e => update('phone', e.target.value)}
                required
              />
            </div>
            <div className='space-y-1.5 sm:col-span-2'>
              <Label htmlFor='instructor-password'>{isEdit ? 'Password (optional)' : 'Password'}</Label>
              <div className='relative'>
                <Input
                  id='instructor-password'
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => update('password', e.target.value)}
                  required={!isEdit}
                  minLength={6}
                  className='pr-9'
                />
                <Button
                  type='button'
                  variant='ghost'
                  size='icon-sm'
                  className='absolute top-1/2 right-1 -translate-y-1/2'
                  onClick={() => setShowPassword(v => !v)}
                >
                  {showPassword ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
                </Button>
              </div>
            </div>
          </div>

          <div className='space-y-3 rounded-xl border p-3'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div>
                <p className='text-sm font-medium'>Categories</p>
                <p className='text-xs text-muted-foreground'>
                  Select the content categories this instructor can access
                </p>
              </div>
              <Badge variant='secondary'>{form.categories.length} selected</Badge>
            </div>

            {form.categories.length ? (
              <div className='flex flex-wrap gap-1.5'>
                {form.categories.map(cat => (
                  <Badge key={cat} variant='outline'>
                    {cat}
                  </Badge>
                ))}
              </div>
            ) : null}

            <Input
              value={categorySearch}
              onChange={e => setCategorySearch(e.target.value)}
              placeholder='Search categories…'
              className='h-8'
            />

            {categoriesLoading ? (
              <div className='space-y-2'>
                <Skeleton className='h-8 w-full' />
                <Skeleton className='h-8 w-full' />
                <Skeleton className='h-8 w-full' />
              </div>
            ) : filteredCategories.length === 0 ? (
              <p className='text-sm text-muted-foreground'>
                {allCategories.length === 0 ? 'No categories found.' : 'No matches for your search.'}
              </p>
            ) : (
              <div className='scrollbar-thin max-h-48 space-y-2 overflow-y-auto pr-1'>
                {filteredCategories.map(cat => (
                  <label key={cat} className='flex cursor-pointer items-center gap-2 text-sm'>
                    <Checkbox
                      checked={form.categories.includes(cat)}
                      onCheckedChange={() => toggleCategory(cat)}
                    />
                    {cat}
                  </label>
                ))}
              </div>
            )}
          </div>
        </form>

        <DialogFooter className='shrink-0'>
          <Button variant='outline' onClick={() => onOpenChange?.(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type='submit' form='instructor-form' disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Update instructor' : 'Add instructor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
