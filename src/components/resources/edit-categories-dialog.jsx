'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/api'
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

export default function EditCategoriesDialog({ open, onOpenChange, user, onSaved }) {
  const [categories, setCategories] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setCategories(Array.isArray(user?.categories) ? [...user.categories] : [])
  }, [open, user])

  const handleSave = async () => {
    if (!user?._id) return
    setSaving(true)
    try {
      await api.post('/api/auth/category/update', {
        userId: user._id,
        categories
      })
      toast.success('Categories updated successfully')
      onSaved?.()
      onOpenChange?.(false)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update categories')
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] flex-col overflow-hidden sm:max-w-lg'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>Edit categories</DialogTitle>
          <DialogDescription>Categories assigned to {user.name}.</DialogDescription>
        </DialogHeader>

        {categories.length > 0 ? (
          <div className='scrollbar-thin min-h-0 flex-1 overflow-y-auto pr-1'>
            <div className='flex flex-wrap gap-1.5'>
            {categories.map(cat => (
              <Badge key={cat} variant='outline' className='gap-1 pr-1'>
                {cat}
                <button
                  type='button'
                  className='rounded-sm p-0.5 hover:bg-muted'
                  onClick={() => setCategories(prev => prev.filter(c => c !== cat))}
                  aria-label={`Remove ${cat}`}
                >
                  <X className='size-3' />
                </button>
              </Badge>
            ))}
            </div>
          </div>
        ) : (
          <p className='text-sm text-muted-foreground'>No categories assigned.</p>
        )}

        <DialogFooter className='shrink-0'>
          <Button variant='outline' onClick={() => onOpenChange?.(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
