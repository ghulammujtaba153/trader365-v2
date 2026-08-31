'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarClock, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/api'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { formatScreenName } from '@/lib/format'
import {
  formatInTimeZone,
  getBrowserTimeZone,
  listTimeZones,
  zonedDateTimeToDate
} from '@/lib/timezone'

const ROLE_OPTIONS = [
  { id: 'user', name: 'Users (app)' },
  { id: 'editor', name: 'Instructors' },
  { id: 'admin', name: 'Admins' }
]

const EXCLUDED_SCREENS = ['Login', 'TrackPlayer', 'VideoPlayer']

const STEPS = [
  { id: 'content', label: 'Content' },
  { id: 'audience', label: 'Audience' },
  { id: 'delivery', label: 'Delivery' }
]

const TIMEZONE_OPTIONS = listTimeZones()

const emptyForm = () => ({
  title: '',
  message: '',
  targetType: 'all',
  sendType: 'now',
  sendAt: '',
  timeZone: getBrowserTimeZone()
})

const selectClassName =
  'h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

function PhonePreview({ title, message }) {
  return (
    <div className='mx-auto w-full max-w-[220px]'>
      <div className='rounded-[1.6rem] border border-zinc-300 bg-zinc-950 p-2 shadow-sm'>
        <div className='rounded-[1.2rem] bg-zinc-900 px-3 pb-4 pt-3'>
          <div className='mb-3 flex items-center justify-between text-[10px] text-zinc-400'>
            <span>9:41</span>
            <span>Push</span>
          </div>
          <div className='rounded-2xl bg-zinc-800/90 p-3 text-left'>
            <p className='text-[10px] font-medium uppercase tracking-wide text-cyan-300/90'>
              Trader 365
            </p>
            <p className='mt-1 line-clamp-2 text-sm font-semibold text-white'>
              {title?.trim() || 'Notification title'}
            </p>
            <p className='mt-1 line-clamp-3 text-xs leading-relaxed text-zinc-300'>
              {message?.trim() || 'Your message preview appears here.'}
            </p>
          </div>
        </div>
      </div>
      <p className='mt-2 text-center text-[11px] text-muted-foreground'>Live device preview</p>
    </div>
  )
}

export default function ComposeNotification({ open, onOpenChange, onSent }) {
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState(emptyForm)
  const [selectedRoles, setSelectedRoles] = useState(['user'])
  const [selectedUserIds, setSelectedUserIds] = useState([])
  const [selectedScreen, setSelectedScreen] = useState('all')
  const [availableScreens, setAvailableScreens] = useState([])
  const [users, setUsers] = useState([])
  const [userFilter, setUserFilter] = useState('')
  const [audience, setAudience] = useState(null)
  const [audienceLoading, setAudienceLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setStep(0)
  }, [open])

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      ;(async () => {
        try {
          const [usersRes, screensRes] = await Promise.all([
            api.get('/api/auth/users'),
            api.get('/api/user-activity/top-screens', { params: { limit: 50 } })
          ])
          setUsers(usersRes.data?.users || [])
          setAvailableScreens(
            (screensRes.data?.results || [])
              .map(r => r.screen)
              .filter(screen => screen && !EXCLUDED_SCREENS.includes(screen))
          )
        } catch {
          toast.error('Failed to load audience options')
        }
      })()
    })
  }, [open])

  const audiencePayload = useMemo(
    () => ({
      targetType: formData.targetType,
      targetRoles: formData.targetType === 'roles' ? selectedRoles : [],
      recipients: formData.targetType === 'specific' ? selectedUserIds : []
    }),
    [formData.targetType, selectedRoles, selectedUserIds]
  )

  const refreshAudience = useCallback(async () => {
    if (formData.targetType === 'specific' && selectedUserIds.length === 0) {
      setAudience(null)
      return
    }
    if (formData.targetType === 'roles' && selectedRoles.length === 0) {
      setAudience(null)
      return
    }

    setAudienceLoading(true)
    try {
      const res = await api.post('/api/notifications/preview-audience', audiencePayload)
      setAudience(res.data)
    } catch {
      setAudience(null)
    } finally {
      setAudienceLoading(false)
    }
  }, [audiencePayload, formData.targetType, selectedRoles.length, selectedUserIds.length])

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(refreshAudience, 300)
    return () => clearTimeout(timer)
  }, [open, refreshAudience])

  const filteredUsers = useMemo(() => {
    const q = userFilter.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    )
  }, [users, userFilter])

  const resetForm = () => {
    setFormData(emptyForm())
    setSelectedRoles(['user'])
    setSelectedUserIds([])
    setSelectedScreen('all')
    setUserFilter('')
    setAudience(null)
    setStep(0)
  }

  const validateStep = index => {
    if (index === 0) {
      if (!formData.title || formData.title.trim().length < 2 || formData.title.length > 100) {
        return 'Title must be between 2 and 100 characters.'
      }
      if (!formData.message || formData.message.trim().length < 5 || formData.message.length > 500) {
        return 'Message must be between 5 and 500 characters.'
      }
    }
    if (index === 1) {
      if (formData.targetType === 'specific' && selectedUserIds.length === 0) {
        return 'Please select at least one user.'
      }
      if (formData.targetType === 'roles' && selectedRoles.length === 0) {
        return 'Please select at least one role.'
      }
      if (!audience?.recipientCount) {
        return 'No active recipients match this audience.'
      }
    }
    if (index === 2) {
      if (formData.sendType === 'scheduled') {
        if (!formData.sendAt) return 'Choose a schedule date and time.'
        if (!formData.timeZone) return 'Choose a timezone.'
        const scheduledAt = zonedDateTimeToDate(formData.sendAt, formData.timeZone)
        if (!scheduledAt) return 'Invalid schedule date and time.'
        if (scheduledAt <= new Date()) return 'Schedule time must be in the future.'
      }
      if (!audience?.recipientCount) return 'No active recipients match this audience.'
    }
    return null
  }

  const handleChange = e => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const toggleRole = roleId => {
    setSelectedRoles(prev =>
      prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
    )
  }

  const toggleUser = userId => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  const goNext = () => {
    const error = validateStep(step)
    if (error) {
      toast.error(error)
      return
    }
    setStep(s => Math.min(s + 1, STEPS.length - 1))
  }

  const handleSubmit = () => {
    const error = validateStep(2)
    if (error) {
      toast.error(error)
      return
    }
    setConfirmOpen(true)
  }

  const isScheduled = formData.sendType === 'scheduled'
  const audienceLabel =
    formData.targetType === 'all'
      ? 'All active users'
      : formData.targetType === 'roles'
        ? 'By role'
        : 'Specific users'

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={next => {
          onOpenChange?.(next)
          if (!next) resetForm()
        }}
      >
        <DialogContent className='flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl'>
          <DialogHeader className='shrink-0 space-y-3 border-b border-border px-4 py-4 pr-12 text-left'>
            <div className='space-y-1.5'>
              <DialogTitle className='text-lg'>New notification</DialogTitle>
              <DialogDescription>
                Write the push, choose who receives it, then send or schedule.
              </DialogDescription>
            </div>
            <div className='flex gap-1.5'>
              {STEPS.map((item, index) => (
                <button
                  key={item.id}
                  type='button'
                  onClick={() => {
                    if (index < step) setStep(index)
                  }}
                  className={cn(
                    'flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
                    index === step
                      ? 'bg-primary text-primary-foreground'
                      : index < step
                        ? 'bg-muted text-foreground'
                        : 'bg-muted/50 text-muted-foreground'
                  )}
                >
                  {index + 1}. {item.label}
                </button>
              ))}
            </div>
          </DialogHeader>

          <div className='scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-4'>
            {step === 0 ? (
              <div className='grid gap-5 sm:grid-cols-[1fr_auto]'>
                <div className='space-y-4'>
                  <div className='space-y-1.5'>
                    <Label htmlFor='notif-title'>
                      Title <span className='text-destructive'>*</span>
                    </Label>
                    <Input
                      id='notif-title'
                      name='title'
                      value={formData.title}
                      onChange={handleChange}
                      maxLength={100}
                      disabled={isSubmitting}
                      placeholder='Notification title'
                      className='h-9'
                    />
                    <p className='text-xs text-muted-foreground'>{formData.title.length}/100</p>
                  </div>
                  <div className='space-y-1.5'>
                    <Label htmlFor='notif-message'>
                      Message <span className='text-destructive'>*</span>
                    </Label>
                    <Textarea
                      id='notif-message'
                      name='message'
                      value={formData.message}
                      onChange={handleChange}
                      maxLength={500}
                      rows={5}
                      disabled={isSubmitting}
                      placeholder='Write your push message…'
                      className='min-h-28'
                    />
                    <p className='text-xs text-muted-foreground'>{formData.message.length}/500</p>
                  </div>
                </div>
                <PhonePreview title={formData.title} message={formData.message} />
              </div>
            ) : null}

            {step === 1 ? (
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <p className='text-sm font-medium'>Audience</p>
                  <div className='space-y-1.5'>
                    {[
                      { value: 'all', label: 'All active users' },
                      { value: 'roles', label: 'By role' },
                      { value: 'specific', label: 'Specific users' }
                    ].map(option => (
                      <label
                        key={option.value}
                        className='flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm has-[:checked]:border-foreground has-[:checked]:bg-muted/40'
                      >
                        <input
                          type='radio'
                          name='targetType'
                          value={option.value}
                          checked={formData.targetType === option.value}
                          onChange={handleChange}
                          disabled={isSubmitting}
                          className='size-3.5 accent-foreground'
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>

                {formData.targetType === 'roles' ? (
                  <div className='space-y-2 rounded-lg border border-border p-3'>
                    {ROLE_OPTIONS.map(role => (
                      <label key={role.id} className='flex cursor-pointer items-center gap-2 text-sm'>
                        <Checkbox
                          checked={selectedRoles.includes(role.id)}
                          onCheckedChange={() => toggleRole(role.id)}
                          disabled={isSubmitting}
                        />
                        {role.name}
                      </label>
                    ))}
                  </div>
                ) : null}

                {formData.targetType === 'specific' ? (
                  <div className='space-y-2'>
                    <Input
                      value={userFilter}
                      onChange={e => setUserFilter(e.target.value)}
                      placeholder='Search by name or email…'
                      disabled={isSubmitting}
                      className='h-9'
                    />
                    <div className='max-h-44 space-y-1.5 overflow-y-auto rounded-lg border border-border p-2'>
                      {filteredUsers.length === 0 ? (
                        <p className='px-1 py-2 text-xs text-muted-foreground'>No users found.</p>
                      ) : (
                        filteredUsers.map(user => (
                          <label
                            key={user._id}
                            className='flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 text-sm hover:bg-muted/50'
                          >
                            <Checkbox
                              checked={selectedUserIds.includes(user._id)}
                              onCheckedChange={() => toggleUser(user._id)}
                              disabled={isSubmitting}
                              className='mt-0.5'
                            />
                            <span className='min-w-0'>
                              <span className='block truncate font-medium'>{user.name || '—'}</span>
                              <span className='block truncate text-xs text-muted-foreground'>
                                {user.email || ''}
                              </span>
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                    {selectedUserIds.length > 0 ? (
                      <p className='text-xs text-muted-foreground'>
                        {selectedUserIds.length} user{selectedUserIds.length === 1 ? '' : 's'}{' '}
                        selected
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className='space-y-2 rounded-lg border border-border bg-muted/30 p-3'>
                  <div className='flex items-center gap-2'>
                    <p className='text-sm font-medium'>Audience preview</p>
                    {audienceLoading ? (
                      <Loader2 className='size-3.5 animate-spin text-muted-foreground' />
                    ) : null}
                  </div>
                  {audience ? (
                    <div className='flex flex-wrap gap-1.5'>
                      <Badge variant='outline'>{audience.recipientCount} recipients</Badge>
                      <Badge variant='outline'>{audience.withDevice} with push</Badge>
                      <Badge variant='outline'>{audience.withoutDevice} inbox only</Badge>
                      <Badge variant='outline'>{audience.deviceTokenCount} devices</Badge>
                    </div>
                  ) : (
                    <p className='text-sm text-muted-foreground'>
                      Choose an audience to preview reach.
                    </p>
                  )}
                </div>

                <div className='space-y-1.5'>
                  <Label htmlFor='notif-screen'>Deep-link screen</Label>
                  <select
                    id='notif-screen'
                    value={selectedScreen}
                    onChange={e => setSelectedScreen(e.target.value)}
                    disabled={isSubmitting}
                    className={selectClassName}
                  >
                    <option value='all'>Default / home</option>
                    {availableScreens.map(screen => (
                      <option key={screen} value={screen}>
                        {formatScreenName(screen)}
                      </option>
                    ))}
                  </select>
                  <p className='text-xs text-muted-foreground'>
                    Optional mobile screen to open when the push is tapped
                  </p>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className='space-y-4'>
                <div className='rounded-xl border bg-muted/30 p-3'>
                  <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                    Review
                  </p>
                  <p className='mt-1 text-sm font-semibold'>{formData.title || '—'}</p>
                  <p className='mt-1 line-clamp-3 text-sm text-muted-foreground'>
                    {formData.message || '—'}
                  </p>
                  <div className='mt-3 flex flex-wrap gap-1.5'>
                    <Badge variant='outline'>{audienceLabel}</Badge>
                    <Badge variant='outline'>
                      {audience?.recipientCount || 0} recipients
                    </Badge>
                    <Badge variant='outline'>
                      {audience?.deviceTokenCount || 0} devices
                    </Badge>
                  </div>
                </div>

                <div className='space-y-2'>
                  <p className='text-sm font-medium'>Delivery</p>
                  <div className='space-y-1.5'>
                    {[
                      { value: 'now', label: 'Send immediately' },
                      { value: 'scheduled', label: 'Schedule for later' }
                    ].map(option => (
                      <label
                        key={option.value}
                        className='flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm has-[:checked]:border-foreground has-[:checked]:bg-muted/40'
                      >
                        <input
                          type='radio'
                          name='sendType'
                          value={option.value}
                          checked={formData.sendType === option.value}
                          onChange={handleChange}
                          disabled={isSubmitting}
                          className='size-3.5 accent-foreground'
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>

                {isScheduled ? (
                  <div className='space-y-3'>
                    <div className='grid gap-3 sm:grid-cols-2'>
                      <div className='space-y-1.5'>
                        <Label htmlFor='notif-sendAt'>Send at</Label>
                        <Input
                          id='notif-sendAt'
                          type='datetime-local'
                          name='sendAt'
                          value={formData.sendAt}
                          onChange={handleChange}
                          disabled={isSubmitting}
                          className='h-9'
                        />
                      </div>
                      <div className='space-y-1.5'>
                        <Label htmlFor='notif-timeZone'>Timezone</Label>
                        <select
                          id='notif-timeZone'
                          name='timeZone'
                          value={formData.timeZone}
                          onChange={handleChange}
                          disabled={isSubmitting}
                          className={selectClassName}
                        >
                          {!TIMEZONE_OPTIONS.includes(formData.timeZone) && formData.timeZone ? (
                            <option value={formData.timeZone}>{formData.timeZone}</option>
                          ) : null}
                          {TIMEZONE_OPTIONS.map(tz => (
                            <option key={tz} value={tz}>
                              {tz.replace(/_/g, ' ')}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {formData.sendAt ? (
                      <p className='text-xs text-muted-foreground'>
                        Schedules for{' '}
                        {formatInTimeZone(
                          zonedDateTimeToDate(formData.sendAt, formData.timeZone),
                          formData.timeZone
                        )}{' '}
                        ({formData.timeZone})
                      </p>
                    ) : (
                      <p className='text-xs text-muted-foreground'>
                        Date and time are interpreted in the selected timezone.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <DialogFooter className='mx-0 mb-0 shrink-0 sm:justify-between'>
            <Button
              type='button'
              variant='outline'
              onClick={() => (step === 0 ? onOpenChange?.(false) : setStep(s => s - 1))}
              disabled={isSubmitting}
            >
              {step === 0 ? 'Cancel' : 'Back'}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type='button' onClick={goNext} disabled={audienceLoading && step === 1}>
                Continue
              </Button>
            ) : (
              <Button
                type='button'
                onClick={handleSubmit}
                disabled={isSubmitting || audienceLoading || audience?.recipientCount === 0}
              >
                {isSubmitting ? (
                  <Loader2 className='size-4 animate-spin' />
                ) : isScheduled ? (
                  <CalendarClock className='size-4' />
                ) : (
                  <Send className='size-4' />
                )}
                {isScheduled ? 'Schedule' : 'Send'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={isScheduled ? 'Confirm schedule?' : 'Confirm bulk send?'}
        description={
          isScheduled
            ? `This will schedule "${formData.title}" for ${audience?.recipientCount || 0} recipients across ${audience?.deviceTokenCount || 0} devices${
                formData.sendAt
                  ? ` on ${formatInTimeZone(
                      zonedDateTimeToDate(formData.sendAt, formData.timeZone),
                      formData.timeZone
                    )} (${formData.timeZone})`
                  : ''
              }.`
            : `This will send "${formData.title}" to ${audience?.recipientCount || 0} recipients across ${audience?.deviceTokenCount || 0} devices.`
        }
        confirmText={isScheduled ? 'Schedule' : `Send to ${audience?.recipientCount || 0}`}
        onConfirm={async () => {
          setIsSubmitting(true)
          try {
            const scheduledAt = isScheduled
              ? zonedDateTimeToDate(formData.sendAt, formData.timeZone)
              : null

            const payload = {
              title: formData.title.trim(),
              message: formData.message.trim(),
              targetType: formData.targetType,
              recipients: formData.targetType === 'specific' ? selectedUserIds : [],
              targetRoles: formData.targetType === 'roles' ? selectedRoles : [],
              sendType: formData.sendType,
              screenName: selectedScreen,
              ...(isScheduled && scheduledAt ? { sendAt: scheduledAt.toISOString() } : {})
            }

            const res = await api.post('/api/notifications/create', payload)
            const stats = res.data?.deliveryStats

            resetForm()
            onOpenChange?.(false)
            onSent?.()

            if (isScheduled) {
              return res.data?.message || `Scheduled for ${audience?.recipientCount || 0} recipients`
            }

            if (stats) {
              return (
                res.data?.message ||
                `Sent to ${stats.recipientCount} users · ${stats.successCount}/${stats.deviceTokenCount} devices delivered`
              )
            }

            return res.data?.message || 'Notification sent'
          } finally {
            setIsSubmitting(false)
          }
        }}
      />
    </>
  )
}
