'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Bug,
  CheckCircle2,
  Mail,
  Play,
  RotateCcw,
  Send,
  XCircle
} from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { formatDateTime, recordCreatedAt, recordUpdatedAt } from '@/lib/format'

export const STATUS_META = {
  open: { label: 'Open', variant: 'destructive' },
  'in-progress': {
    label: 'In progress',
    variant: 'secondary',
    className: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300'
  },
  resolved: { label: 'Resolved', variant: 'default' },
  closed: { label: 'Closed', variant: 'outline' }
}

export const getNextAction = currentStatus => {
  switch (currentStatus) {
    case 'open':
      return { status: 'in-progress', label: 'Start progress', icon: Play }
    case 'in-progress':
      return { status: 'resolved', label: 'Mark resolved', icon: CheckCircle2 }
    case 'resolved':
      return { status: 'closed', label: 'Close ticket', icon: XCircle }
    case 'closed':
      return { status: 'open', label: 'Reopen', icon: RotateCcw }
    default:
      return null
  }
}

export const formatTicketType = type => {
  if (!type) return '—'
  if (type === 'support') return 'Help Center'
  return type
}

function MetaField({ label, value, children }) {
  return (
    <div className='min-w-0'>
      <p className='mb-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
        {label}
      </p>
      {children ?? (
        <p
          className='break-words text-sm font-semibold'
          title={value && value !== '—' ? value : undefined}
        >
          {value || '—'}
        </p>
      )}
    </div>
  )
}

export default function IssueViewDialog({
  open,
  onOpenChange,
  issue,
  admins = [],
  onUpdated,
  onStatusChange,
  updating
}) {
  const [assigneeId, setAssigneeId] = useState('')
  const [savingAssignee, setSavingAssignee] = useState(false)
  const [progressMessage, setProgressMessage] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [sendingUpdate, setSendingUpdate] = useState(false)
  const [localIssue, setLocalIssue] = useState(issue)

  useEffect(() => {
    if (!open) return
    setLocalIssue(issue)
    setAssigneeId(issue?.assignedTo?._id || issue?.assignedTo || '')
    setProgressMessage('')
    setSendEmail(true)
  }, [open, issue])

  if (!localIssue) return null

  const meta = STATUS_META[localIssue.status] || { label: localIssue.status, variant: 'outline' }
  const next = getNextAction(localIssue.status)
  const NextIcon = next?.icon
  const userId = localIssue.userId?._id || localIssue.rawUserId
  const userName = localIssue.userId?.name || localIssue.name || 'N/A'
  const userEmail = String(
    localIssue.contactEmail || localIssue.userId?.email || localIssue.email || '—'
  )
  const userPhone = String(localIssue.userId?.phone || localIssue.phone || '—')
  const assigneeName = localIssue.assignedTo?.name || 'Unassigned'
  const updates = Array.isArray(localIssue.updates) ? [...localIssue.updates].reverse() : []
  const ticketId = localIssue.id || localIssue._id

  const applyProblem = problem => {
    if (!problem) return
    const nextIssue = {
      ...localIssue,
      ...problem,
      id: problem._id || localIssue.id,
      name: problem.userId?.name || localIssue.name,
      email: problem.contactEmail || problem.userId?.email || localIssue.email,
      phone: problem.userId?.phone || localIssue.phone,
      rawUserId: problem.userId?._id || localIssue.rawUserId
    }
    setLocalIssue(nextIssue)
    onUpdated?.(nextIssue)
  }

  const handleAssign = async () => {
    setSavingAssignee(true)
    try {
      const res = await api.patch(`/api/problem/${ticketId}`, {
        assignedTo: assigneeId || null
      })
      applyProblem(res.data?.problem)
      toast.success(assigneeId ? 'Ticket assigned' : 'Assignee cleared')
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to assign ticket')
    } finally {
      setSavingAssignee(false)
    }
  }

  const handleProgress = async () => {
    if (!progressMessage.trim()) {
      toast.error('Enter a progress message')
      return
    }
    setSendingUpdate(true)
    try {
      const res = await api.post(`/api/problem/${ticketId}/updates`, {
        message: progressMessage.trim(),
        sendEmail
      })
      applyProblem(res.data?.problem)
      setProgressMessage('')
      toast.success(res.data?.message || 'Progress update saved')
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save update')
    } finally {
      setSendingUpdate(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] flex-col overflow-hidden sm:max-w-2xl'>
        <DialogHeader className='shrink-0'>
          <DialogTitle className='pr-6'>{formatTicketType(localIssue.type)}</DialogTitle>
          <DialogDescription>
            {localIssue.source === 'delete-account'
              ? 'Account deletion request'
              : localIssue.source === 'help-center'
                ? 'Help center request'
                : 'Support ticket'}
          </DialogDescription>
        </DialogHeader>

        <div className='scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto pr-1'>
          <div className='flex flex-wrap gap-1.5'>
            <Badge variant={meta.variant} className={meta.className}>
              <Bug className='size-3' />
              {meta.label}
            </Badge>
            <Badge variant='outline'>{formatTicketType(localIssue.type)}</Badge>
            {localIssue.source === 'delete-account' ? (
              <Badge variant='destructive'>Deletion</Badge>
            ) : null}
          </div>

          <div className='rounded-xl border bg-muted/40 p-4'>
            <p className='mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
              Description
            </p>
            <p className='whitespace-pre-wrap break-words text-sm leading-relaxed'>
              {localIssue.description || '—'}
            </p>
          </div>

          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
            <MetaField label='User'>
              {userId ? (
                <Link
                  href={`/users/${userId}`}
                  className='block truncate text-sm font-semibold text-primary hover:underline'
                >
                  {userName}
                </Link>
              ) : (
                <p className='truncate text-sm font-semibold'>{userName}</p>
              )}
            </MetaField>
            <MetaField label='Assignee' value={assigneeName} />
            <MetaField label='Email' value={userEmail} />
            <MetaField label='Phone' value={userPhone} />
            <MetaField label='Created' value={formatDateTime(recordCreatedAt(localIssue))} />
            <MetaField label='Updated' value={formatDateTime(recordUpdatedAt(localIssue))} />
          </div>

          <div className='space-y-2 rounded-xl border p-3'>
            <div>
              <p className='text-sm font-medium'>Assign to admin</p>
              <p className='text-xs text-muted-foreground'>
                The assigned admin can share progress updates by email
              </p>
            </div>
            <div className='flex flex-col gap-2 sm:flex-row'>
              <select
                value={assigneeId}
                onChange={e => setAssigneeId(e.target.value)}
                className='h-9 flex-1 rounded-lg border border-input bg-background px-2.5 text-sm'
              >
                <option value=''>Unassigned</option>
                {admins.map(admin => (
                  <option key={admin._id} value={admin._id}>
                    {admin.name || admin.email}
                  </option>
                ))}
              </select>
              <Button type='button' onClick={handleAssign} disabled={savingAssignee}>
                {savingAssignee ? 'Saving…' : 'Save assignee'}
              </Button>
            </div>
          </div>

          <div className='space-y-3 rounded-xl border p-3'>
            <div>
              <p className='text-sm font-medium'>Share progress</p>
              <p className='text-xs text-muted-foreground'>
                Add a note for the ticket. Optionally email it to the user.
              </p>
            </div>
            <Textarea
              value={progressMessage}
              onChange={e => setProgressMessage(e.target.value)}
              rows={4}
              placeholder='Describe the current progress or next steps…'
              className='min-h-24 bg-background'
            />
            <label className='flex cursor-pointer items-center gap-2 text-sm'>
              <Checkbox checked={sendEmail} onCheckedChange={checked => setSendEmail(!!checked)} />
              <Mail className='size-3.5 text-muted-foreground' />
              Email this update to the user
            </label>
            <Button
              type='button'
              onClick={handleProgress}
              disabled={sendingUpdate || !progressMessage.trim()}
            >
              <Send className='size-4' />
              {sendingUpdate ? 'Sending…' : sendEmail ? 'Save & email update' : 'Save update'}
            </Button>
          </div>

          <div className='space-y-2'>
            <p className='text-sm font-medium'>Progress history</p>
            {updates.length === 0 ? (
              <p className='text-sm text-muted-foreground'>No progress updates yet.</p>
            ) : (
              <div className='space-y-2'>
                {updates.map(item => (
                  <div key={item._id || item.createdAt} className='rounded-xl border bg-card p-3'>
                    <div className='mb-1 flex flex-wrap items-center gap-2'>
                      <p className='text-sm font-medium'>
                        {item.authorName || item.authorId?.name || 'Support'}
                      </p>
                      {item.emailed ? (
                        <Badge variant='secondary' className='gap-1'>
                          <Mail className='size-3' />
                          Emailed
                        </Badge>
                      ) : null}
                      <span className='text-xs text-muted-foreground'>
                        {formatDateTime(item.createdAt)}
                      </span>
                    </div>
                    <p className='whitespace-pre-wrap text-sm text-muted-foreground'>{item.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className='shrink-0 gap-2 sm:gap-2'>
          <Button variant='outline' onClick={() => onOpenChange?.(false)}>
            Close
          </Button>
          {next ? (
            <Button
              disabled={updating}
              onClick={() => onStatusChange?.(ticketId, next.status)}
            >
              {NextIcon ? <NextIcon className='size-4' /> : null}
              {next.label}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
