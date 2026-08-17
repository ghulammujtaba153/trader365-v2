'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import api from '@/lib/api'
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
import { Textarea } from '@/components/ui/textarea'

export default function FaqFormDialog({ open, onOpenChange, mode = 'add', faq, onSaved }) {
  const [form, setForm] = useState({ question: '', answer: '' })
  const [saving, setSaving] = useState(false)
  const isView = mode === 'view'
  const isEdit = mode === 'edit'

  useEffect(() => {
    if (!open) return
    if ((isEdit || isView) && faq) {
      setForm({
        question: faq.question || '',
        answer: faq.answer || ''
      })
    } else {
      setForm({ question: '', answer: '' })
    }
  }, [open, mode, faq, isEdit, isView])

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (isView) return

    const question = form.question.trim()
    const answer = form.answer.trim()
    if (!question || !answer) {
      toast.error('Question and answer are required')
      return
    }

    setSaving(true)
    try {
      if (isEdit && faq?._id) {
        await api.put(`/api/faq/${faq._id}`, { question, answer })
        toast.success('FAQ updated successfully')
      } else {
        await api.post('/api/faq', { question, answer })
        toast.success('FAQ added successfully')
      }
      onSaved?.()
      onOpenChange?.(false)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save FAQ')
    } finally {
      setSaving(false)
    }
  }

  const title = isView ? 'View FAQ' : isEdit ? 'Edit FAQ' : 'Add FAQ'
  const description = isView
    ? 'Help article shown to users.'
    : isEdit
      ? 'Update the question and answer.'
      : 'Create a new help article for users.'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] flex-col overflow-hidden sm:max-w-lg'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {isView ? (
          <div className='scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto pr-1'>
            <div>
              <p className='mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase'>
                Question
              </p>
              <p className='text-base font-semibold leading-snug'>{form.question || '—'}</p>
            </div>
            <div className='rounded-xl border border-border bg-muted/30 p-4'>
              <p className='mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase'>
                Answer
              </p>
              <p className='whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground'>
                {form.answer || '—'}
              </p>
            </div>
          </div>
        ) : (
          <form id='faq-form' onSubmit={handleSubmit} className='scrollbar-thin min-h-0 flex-1 space-y-3 overflow-y-auto pr-1'>
            <div className='space-y-1.5'>
              <Label htmlFor='faq-question'>
                Question <span className='text-destructive'>*</span>
              </Label>
              <Input
                id='faq-question'
                value={form.question}
                onChange={e => update('question', e.target.value)}
                required
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='faq-answer'>
                Answer <span className='text-destructive'>*</span>
              </Label>
              <Textarea
                id='faq-answer'
                value={form.answer}
                onChange={e => update('answer', e.target.value)}
                rows={5}
                required
              />
            </div>
          </form>
        )}

        <DialogFooter className='shrink-0'>
          <Button variant='outline' onClick={() => onOpenChange?.(false)} disabled={saving}>
            {isView ? 'Close' : 'Cancel'}
          </Button>
          {!isView ? (
            <Button type='submit' form='faq-form' disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Update' : 'Add FAQ'}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
