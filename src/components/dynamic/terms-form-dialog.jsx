'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import api from '@/lib/api'
import RichTextEditor from '@/components/dynamic/rich-text-editor'
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

function stripHtml(html = '') {
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export default function TermsFormDialog({ open, onOpenChange, term, onSaved }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const isEdit = Boolean(term?._id)

  useEffect(() => {
    if (!open) return
    setTitle(term?.title || '')
    setContent(term?.content || '')
    setErrors({})
  }, [open, term])

  const validate = () => {
    const next = {}
    if (!title.trim()) next.title = 'Title is required'
    if (!stripHtml(content)) next.content = 'Content is required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!validate()) return
    if (saving || confirmOpen) return
    setConfirmOpen(true)
  }

  const confirmAction = async () => {
    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        content
      }
      if (isEdit) {
        await api.put(`/api/terms/${term._id}`, payload)
        onSaved?.()
        onOpenChange?.(false)
        return 'Terms updated successfully'
      }
      await api.post('/api/terms', payload)
      onSaved?.()
      onOpenChange?.(false)
      return 'Terms created successfully'
    } catch (err) {
      throw err
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] flex-col overflow-hidden sm:max-w-3xl'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>{isEdit ? 'Edit terms' : 'Add terms'}</DialogTitle>
          <DialogDescription>
            Legal content shown to users during signup and in settings.
          </DialogDescription>
        </DialogHeader>

        <form
          id='terms-form'
          onSubmit={handleSubmit}
          className='scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto pr-1'
        >
          <div className='space-y-1.5'>
            <Label htmlFor='terms-title'>
              Title <span className='text-destructive'>*</span>
            </Label>
            <Input
              id='terms-title'
              value={title}
              onChange={e => {
                setTitle(e.target.value)
                if (errors.title) setErrors(prev => ({ ...prev, title: '' }))
              }}
              placeholder='e.g. Terms of Service'
              required
            />
            {errors.title ? <p className='text-xs text-destructive'>{errors.title}</p> : null}
          </div>

          <div className='space-y-1.5'>
            <Label>
              Content <span className='text-destructive'>*</span>
            </Label>
            <RichTextEditor
              value={content}
              disabled={saving}
              onChange={html => {
                setContent(html)
                if (errors.content) setErrors(prev => ({ ...prev, content: '' }))
              }}
            />
            {errors.content ? <p className='text-xs text-destructive'>{errors.content}</p> : null}
          </div>
        </form>

        <DialogFooter className='shrink-0'>
          <Button variant='outline' onClick={() => onOpenChange?.(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type='submit' form='terms-form' disabled={saving || confirmOpen}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      title={isEdit ? 'Update terms?' : 'Add terms?'}
      description={isEdit ? 'This will update the terms text shown to users.' : 'This will create new terms content.'}
      confirmText={isEdit ? 'Update' : 'Add'}
      destructive={false}
      onConfirm={confirmAction}
    />
  )
}
