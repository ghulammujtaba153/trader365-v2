'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import api from '@/lib/api'
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
import { Label } from '@/components/ui/label'

export default function AssignCategoryDialog({ open, onOpenChange, user, onSaved }) {
  const [categories, setCategories] = useState([])
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setSelected('')
    const load = async () => {
      try {
        setLoading(true)
        const res = await api.get('/api/pillars/categories/all')
        setCategories(Array.isArray(res.data?.categories) ? res.data.categories : [])
      } catch {
        toast.error('Failed to fetch categories')
        setCategories([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [open])

  const handleAssign = async () => {
    if (!user?._id || !selected) return
    if (saving || confirmOpen) return
    setConfirmOpen(true)
  }

  const confirmAction = async () => {
    setSaving(true)
    try {
      await api.post('/api/auth/category', {
        userId: user._id,
        tagName: selected
      })
      onSaved?.()
      onOpenChange?.(false)
      return 'Category assigned successfully'
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || 'Failed to assign category')
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-4xl'>
        <DialogHeader>
          <DialogTitle>Assign category</DialogTitle>
          <DialogDescription>Choose a category for {user.name}.</DialogDescription>
        </DialogHeader>

        <div className='space-y-1.5'>
          <Label htmlFor='assign-category'>Category</Label>
          <select
            id='assign-category'
            value={selected}
            onChange={e => setSelected(e.target.value)}
            disabled={loading || saving}
            className='flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm'
          >
            <option value=''>{loading ? 'Loading…' : 'Select category'}</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          {!loading && categories.length === 0 ? (
            <p className='text-xs text-muted-foreground'>No categories found.</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange?.(false)} disabled={saving}>
            Cancel
          </Button>
            <Button onClick={handleAssign} disabled={!selected || saving || confirmOpen}>
              {saving ? 'Assigning…' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title='Assign category?'
        description={`This will assign "${selected}" to ${user?.name}.`}
        confirmText='Assign'
        destructive={false}
        onConfirm={confirmAction}
      />
    </>
  )
}
