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
import { Textarea } from '@/components/ui/textarea'

const MAX_LENGTH = 150

export default function QuoteFormDialog({ open, onOpenChange, quote, onSaved }) {
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState('')
  const isEdit = Boolean(quote)

  useEffect(() => {
    if (!open) return
    setValue(quote?.quote || '')
    setError('')
  }, [open, quote])

  const handleSubmit = async e => {
    e.preventDefault()
    const trimmed = value.trim()

    if (!trimmed) {
      setError('Quote is required')
      return
    }
    if (trimmed.length > MAX_LENGTH) {
      setError(`Quote must not exceed ${MAX_LENGTH} characters`)
      return
    }

    if (saving || confirmOpen) return
    setError('')
    setConfirmOpen(true)
  }

  const confirmAction = async () => {
    setSaving(true)
    try {
      const trimmed = value.trim()
      if (isEdit) {
        await api.put(`/api/daily-quote/${quote._id}`, { quote: trimmed })
        onSaved?.()
        onOpenChange?.(false)
        return 'Quote updated successfully'
      }
      await api.post('/api/daily-quote', { quote: value.trim() })
      onSaved?.()
      onOpenChange?.(false)
      return 'Quote added successfully'
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || 'Failed to save quote')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit quote' : 'Add quote'}</DialogTitle>
          <DialogDescription>Keep it short — max {MAX_LENGTH} characters.</DialogDescription>
        </DialogHeader>

        <form id='quote-form' onSubmit={handleSubmit} className='space-y-3'>
          <div className='space-y-1.5'>
            <Label htmlFor='quote'>Quote</Label>
            <Textarea
              id='quote'
              value={value}
              onChange={e => setValue(e.target.value.slice(0, MAX_LENGTH))}
              rows={4}
              maxLength={MAX_LENGTH}
              required
              aria-invalid={Boolean(error)}
            />
            <div className='flex items-center justify-between gap-2'>
              {error ? <p className='text-xs text-destructive'>{error}</p> : <span />}
              <p className='text-xs text-muted-foreground tabular-nums'>
                {value.length}/{MAX_LENGTH}
              </p>
            </div>
          </div>

          {value.trim() ? (
            <div className='rounded-xl border border-dashed border-border bg-muted/30 px-4 py-5 text-center'>
              <p className='mb-2 text-xs text-muted-foreground'>Preview</p>
              <p className='text-base leading-relaxed italic'>&ldquo;{value.trim()}&rdquo;</p>
            </div>
          ) : null}
        </form>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange?.(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type='submit' form='quote-form' disabled={saving || confirmOpen}>
            {saving ? 'Saving…' : isEdit ? 'Update' : 'Add quote'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      title={isEdit ? 'Update quote?' : 'Add quote?'}
      description='Confirm this change. This will affect the daily quote shown in the app.'
      confirmText={isEdit ? 'Update' : 'Add'}
      destructive={false}
      onConfirm={confirmAction}
    />
    </>
  )
}
