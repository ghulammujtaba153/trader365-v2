'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const DURATIONS = [
  { value: 'daily', label: '1 day' },
  { value: 'three_day', label: '3 days' },
  { value: 'weekly', label: '1 week' },
  { value: 'two_week', label: '2 weeks' },
  { value: 'monthly', label: '1 month' },
  { value: 'two_month', label: '2 months' },
  { value: 'three_month', label: '3 months' },
  { value: 'six_month', label: '6 months' },
  { value: 'yearly', label: '1 year' },
  { value: 'lifetime', label: 'Lifetime' },
  { value: 'custom', label: 'Custom end date' }
]

const selectClass =
  'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

export default function GrantSubscriptionDialog({ open, onOpenChange, onGranted }) {
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [search, setSearch] = useState('')
  const [userId, setUserId] = useState('')
  const [duration, setDuration] = useState('monthly')
  const [endTime, setEndTime] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setSearch('')
    setUserId('')
    setDuration('monthly')
    setEndTime('')

    queueMicrotask(() => {
      const load = async () => {
        setLoadingUsers(true)
        try {
          const res = await api.get('/api/auth/users')
          setUsers(Array.isArray(res.data?.users) ? res.data.users : [])
        } catch {
          toast.error('Failed to load users')
          setUsers([])
        } finally {
          setLoadingUsers(false)
        }
      }
      load()
    })
  }, [open])

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = users.filter(user => user.role === 'user' && !user.isDeleted)
    if (!q) return list.slice(0, 80)
    return list
      .filter(user =>
        [user.name, user.email, user.phone]
          .filter(Boolean)
          .some(value => String(value).toLowerCase().includes(q))
      )
      .slice(0, 80)
  }, [users, search])

  const selected = users.find(user => String(user._id) === userId)

  const handleSubmit = async e => {
    e.preventDefault()
    if (saving || confirmOpen) return
    if (!userId) {
      toast.error('Select a user')
      return
    }
    if (duration === 'custom' && !endTime) {
      toast.error('Choose an end date')
      return
    }
    setConfirmOpen(true)
  }

  const confirmAction = async () => {
    setSaving(true)
    try {
      const payload = { userId }
      if (duration === 'custom') payload.endTime = new Date(endTime).toISOString()
      else payload.duration = duration

      await api.post('/api/subscription/grant', payload)
      onGranted?.()
      onOpenChange?.(false)
      return 'Premium access granted in RevenueCat'
    } catch (err) {
      throw new Error(err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to grant access')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] flex-col overflow-hidden sm:max-w-lg'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>Grant premium access</DialogTitle>
          <DialogDescription>
            This grants a RevenueCat promotional entitlement. The mobile app will see premium. It is
            not an App Store or Play Store purchase and will not charge the user.
          </DialogDescription>
        </DialogHeader>

        <form
          id='grant-subscription-form'
          onSubmit={handleSubmit}
          className='scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto pr-1'
        >
          <div className='space-y-1.5'>
            <Label htmlFor='grant-user-search'>User</Label>
            <Input
              id='grant-user-search'
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder='Search name, email, phone…'
            />
            <select
              className={selectClass}
              value={userId}
              onChange={e => setUserId(e.target.value)}
              required
              disabled={loadingUsers}
            >
              <option value=''>
                {loadingUsers ? 'Loading users…' : 'Select user'}
              </option>
              {filteredUsers.map(user => (
                <option key={user._id} value={user._id}>
                  {user.name || 'Unnamed'}
                  {user.email ? ` · ${user.email}` : ''}
                  {user.isPremium ? ' · already premium' : ''}
                </option>
              ))}
            </select>
            {selected ? (
              <p className='text-xs text-muted-foreground'>
                {selected.email || 'No email'} · {selected.isPremium ? 'Currently premium' : 'Free plan'}
              </p>
            ) : null}
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='grant-duration'>Duration</Label>
            <select
              id='grant-duration'
              className={selectClass}
              value={duration}
              onChange={e => setDuration(e.target.value)}
            >
              {DURATIONS.map(item => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {duration === 'custom' ? (
            <div className='space-y-1.5'>
              <Label htmlFor='grant-end'>Ends at</Label>
              <Input
                id='grant-end'
                type='datetime-local'
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                required
              />
            </div>
          ) : null}
        </form>

        <DialogFooter className='shrink-0'>
          <Button variant='outline' onClick={() => onOpenChange?.(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            type='submit'
            form='grant-subscription-form'
            disabled={saving || confirmOpen || !userId}
          >
            {saving ? 'Granting…' : 'Grant in RevenueCat'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      title='Grant premium access?'
      description={
        duration === 'custom'
          ? `This will grant premium to the selected user until ${new Date(endTime).toLocaleString()}.`
          : `This will grant premium to the selected user for ${duration}.`
      }
      confirmText='Grant'
      destructive={false}
      onConfirm={confirmAction}
    />
  )
}
