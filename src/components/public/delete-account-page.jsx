'use client'

import { useState } from 'react'

import api from '@/lib/api'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const EMAIL_RE = /\S+@\S+\.\S+/

const fieldClassName =
  'h-10 border-zinc-200 bg-white px-3 text-zinc-950 placeholder:text-zinc-400 ' +
  'dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500'

const textareaClassName =
  'min-h-24 border-zinc-200 bg-white px-3 text-zinc-950 placeholder:text-zinc-400 ' +
  'dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500'

const labelClassName = 'text-zinc-700 dark:text-zinc-300'

export default function DeleteAccountPage() {
  const [form, setForm] = useState({ email: '', reason: '', agreed: false })
  const [errors, setErrors] = useState({})
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleChange = e => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const next = {}
    if (!form.email.trim()) next.email = 'Email is required'
    else if (!EMAIL_RE.test(form.email.trim())) next.email = 'Invalid email format'
    if (!form.reason.trim()) next.reason = 'Reason is required'
    if (!form.agreed) next.agreed = 'You must agree before submitting'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = e => {
    e.preventDefault()
    if (!validate()) return
    setConfirmOpen(true)
  }

  const confirmDeletion = async () => {
    await api.post('/api/delete/requests/public', {
      email: form.email.trim(),
      reason: form.reason.trim()
    })
    setForm({ email: '', reason: '', agreed: false })
    return 'Account deletion request submitted.'
  }

  return (
    <div className='mx-auto max-w-lg'>
      <Card
        className={
          'border-0 bg-white/90 py-7 text-zinc-950 shadow-xl shadow-zinc-900/10 ring-1 ring-zinc-200/80 backdrop-blur-sm ' +
          'dark:bg-zinc-900/95 dark:text-zinc-50 dark:shadow-black/40 dark:ring-white/10'
        }
      >
        <CardHeader className='space-y-2'>
          <p className='text-xs font-semibold tracking-[0.18em] text-red-700 uppercase dark:text-red-400'>
            Account
          </p>
          <CardTitle className='text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50'>
            Delete account
          </CardTitle>
          <CardDescription className='leading-relaxed text-zinc-500 dark:text-zinc-400'>
            Submit a request to delete your Trader 365 account. Use the email on your account.
            This action is permanent once processed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className='space-y-4' noValidate>
            <div className='space-y-2'>
              <Label htmlFor='delete-email' className={labelClassName}>
                Email
              </Label>
              <Input
                id='delete-email'
                name='email'
                type='email'
                value={form.email}
                onChange={handleChange}
                aria-invalid={!!errors.email}
                placeholder='you@example.com'
                className={fieldClassName}
              />
              {errors.email ? <p className='text-sm text-destructive'>{errors.email}</p> : null}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='delete-reason' className={labelClassName}>
                Reason for deletion
              </Label>
              <Textarea
                id='delete-reason'
                name='reason'
                rows={4}
                value={form.reason}
                onChange={handleChange}
                aria-invalid={!!errors.reason}
                placeholder='Tell us why you want to delete your account'
                className={textareaClassName}
              />
              {errors.reason ? <p className='text-sm text-destructive'>{errors.reason}</p> : null}
            </div>

            <div className='space-y-1.5'>
              <label className='flex cursor-pointer items-start gap-2.5 text-sm text-zinc-700 dark:text-zinc-300'>
                <Checkbox
                  className='mt-0.5 border-zinc-300 dark:border-white/25'
                  checked={form.agreed}
                  onCheckedChange={checked => {
                    setForm(prev => ({ ...prev, agreed: !!checked }))
                    setErrors(prev => ({ ...prev, agreed: '' }))
                  }}
                />
                <span>I understand this action is permanent</span>
              </label>
              {errors.agreed ? <p className='text-sm text-destructive'>{errors.agreed}</p> : null}
            </div>

            <Button type='submit' variant='destructive' size='lg' className='h-10 w-full'>
              Submit request
            </Button>
          </form>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title='Confirm deletion request'
        description='Are you sure you want to submit this account deletion request? This action is irreversible once processed.'
        confirmText='Confirm'
        destructive
        onConfirm={confirmDeletion}
      />
    </div>
  )
}
