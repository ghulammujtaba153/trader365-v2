'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import api from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  password: '',
  role: 'user',
  ageRange: '18-24',
  gender: 'male',
  experienceLevel: 'beginner',
  isPremium: false,
  termsAndConditionsConsent: false,
  newsLetterConsent: false,
  questionnaireAnswers: {}
}

const selectClass =
  'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

/** Titles that should be single-select (radio) in the Add/Edit user modal. */
const isSingleSelectTitle = title => {
  const singles = ['gender', 'age', 'trading experience', 'rate your current trading consistency']
  return singles.includes(String(title || '').trim().toLowerCase())
}

export default function UserFormDialog({ open, onOpenChange, user, onSaved }) {
  const { user: currentUser } = useAuth()
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [questionnaires, setQuestionnaires] = useState([])
  const [activeTab, setActiveTab] = useState(0)
  const isEdit = Boolean(user)
  const canManageRole = currentUser?.role === 'admin' || currentUser?.isSuperAdmin

  useEffect(() => {
    if (!open) return

    const load = async () => {
      try {
        const res = await api.get('/api/onboarding/questionnaire')
        setQuestionnaires(Array.isArray(res.data) ? res.data : [])
      } catch {
        setQuestionnaires([])
      }
    }

    queueMicrotask(() => {
      load()
    })

    setActiveTab(0)
    if (user) {
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || '',
        password: '',
        role: user.role || 'user',
        ageRange: user.ageRange || '18-24',
        gender: user.gender || 'male',
        experienceLevel: user.experienceLevel || 'beginner',
        isPremium: !!user.isPremium,
        termsAndConditionsConsent: !!user.termsAndConditionsConsent,
        newsLetterConsent: !!user.newsLetterConsent,
        questionnaireAnswers: user.questionnaireAnswers || {}
      })
    } else {
      setForm(emptyForm)
    }
  }, [open, user])

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const toggleMultiAnswer = (tabId, questionId) => {
    setForm(prev => {
      const answers = { ...(prev.questionnaireAnswers || {}) }
      const current = Array.isArray(answers[tabId]) ? [...answers[tabId]] : []
      const idx = current.indexOf(questionId)
      if (idx === -1) current.push(questionId)
      else current.splice(idx, 1)
      answers[tabId] = current
      return { ...prev, questionnaireAnswers: answers }
    })
  }

  const setSingleAnswer = (tabId, questionId) => {
    setForm(prev => ({
      ...prev,
      questionnaireAnswers: {
        ...(prev.questionnaireAnswers || {}),
        [tabId]: questionId ? [questionId] : []
      }
    }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (saving || confirmOpen) return

    if (!isEdit && !form.password) {
      toast.error('Password is required')
      return
    }

    setConfirmOpen(true)
  }

  const confirmAction = async () => {
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        email: form.email,
        role: form.role,
        ageRange: form.ageRange,
        gender: form.gender,
        experienceLevel: form.experienceLevel,
        isPremium: form.isPremium,
        termsAndConditionsConsent: !!form.termsAndConditionsConsent,
        newsLetterConsent: !!form.newsLetterConsent,
        questionnaireAnswers: form.questionnaireAnswers || {}
      }
      if (form.password) payload.password = form.password

      if (isEdit) {
        const { role, ...profileData } = payload
        await api.put(`/api/auth/users/update/${user._id}`, profileData)
        if (canManageRole && role && role !== user.role) {
          await api.patch(`/api/auth/users/${user._id}/role`, { role })
        }
        onSaved?.()
        onOpenChange?.(false)
        return 'User updated successfully'
      }

      await api.post('/api/auth/register', payload)
      onSaved?.()
      onOpenChange?.(false)
      return 'User created successfully'
    } catch (err) {
      // Let <ConfirmDialog> render the error toast.
      throw err
    } finally {
      setSaving(false)
    }
  }

  const activeQuestionnaire = activeTab > 0 ? questionnaires[activeTab - 1] : null

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] flex-col overflow-hidden sm:max-w-4xl'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>{isEdit ? 'Edit user' : 'Add user'}</DialogTitle>
          <DialogDescription>
            Manage profile details and onboarding questionnaire answers.
          </DialogDescription>
        </DialogHeader>

        <div className='scrollbar-thin-x -mx-1 shrink-0 overflow-x-auto border-b border-border pb-px'>
          <div className='flex min-w-max gap-1'>
            <button
              type='button'
              onClick={() => setActiveTab(0)}
              className={cn(
                'border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                activeTab === 0
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              Basic Info
            </button>
            {questionnaires.map((tab, index) => (
              <button
                key={tab._id}
                type='button'
                onClick={() => setActiveTab(index + 1)}
                className={cn(
                  'max-w-[12rem] truncate border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                  activeTab === index + 1
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
                title={tab.title}
              >
                {tab.title}
              </button>
            ))}
          </div>
        </div>

        <form
          id='user-form'
          onSubmit={handleSubmit}
          className='scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto pr-1'
        >
          {activeTab === 0 ? (
            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='space-y-1.5 sm:col-span-2'>
                <Label htmlFor='name'>Name</Label>
                <Input
                  id='name'
                  value={form.name}
                  onChange={e => update('name', e.target.value)}
                  required
                />
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='email'>Email</Label>
                <Input
                  id='email'
                  type='email'
                  value={form.email}
                  onChange={e => update('email', e.target.value)}
                  required
                />
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='phone'>Phone</Label>
                <Input
                  id='phone'
                  value={form.phone}
                  onChange={e => update('phone', e.target.value)}
                  required
                />
              </div>
              <div className='space-y-1.5 sm:col-span-2'>
                <Label htmlFor='password'>{isEdit ? 'Password (optional)' : 'Password'}</Label>
                <Input
                  id='password'
                  type='password'
                  value={form.password}
                  onChange={e => update('password', e.target.value)}
                  required={!isEdit}
                  minLength={6}
                />
              </div>

              {canManageRole ? (
                <div className='space-y-1.5'>
                  <Label htmlFor='role'>Role</Label>
                  <select
                    id='role'
                    className={selectClass}
                    value={form.role}
                    onChange={e => update('role', e.target.value)}
                  >
                    <option value='user'>User</option>
                    <option value='editor'>Instructor</option>
                    <option value='admin'>Admin</option>
                  </select>
                </div>
              ) : null}

              {canManageRole ? (
                <label className='flex items-center gap-2 self-end pb-1 text-sm'>
                  <Checkbox
                    checked={form.isPremium}
                    onCheckedChange={checked => update('isPremium', !!checked)}
                  />
                  Premium user
                </label>
              ) : null}

              <label className='flex items-center gap-2 text-sm sm:col-span-2'>
                <Checkbox
                  checked={form.termsAndConditionsConsent}
                  onCheckedChange={checked => update('termsAndConditionsConsent', !!checked)}
                />
                Terms and conditions consent
              </label>
              <label className='flex items-center gap-2 text-sm sm:col-span-2'>
                <Checkbox
                  checked={form.newsLetterConsent}
                  onCheckedChange={checked => update('newsLetterConsent', !!checked)}
                />
                Newsletter consent
              </label>
            </div>
          ) : null}

          {activeQuestionnaire ? (
            <div className='space-y-3'>
              {activeQuestionnaire.subTitle ? (
                <p className='text-sm text-muted-foreground'>{activeQuestionnaire.subTitle}</p>
              ) : null}

              {isSingleSelectTitle(activeQuestionnaire.title) ? (
                <div className='space-y-2'>
                  {(activeQuestionnaire.questions || []).map(q => {
                    const qid = q._id
                    const selected = (form.questionnaireAnswers?.[activeQuestionnaire._id] || [])[0]
                    return (
                      <label
                        key={qid}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
                          selected === qid
                            ? 'border-foreground bg-muted/50'
                            : 'border-border hover:bg-muted/30'
                        )}
                      >
                        <input
                          type='radio'
                          name={`q-${activeQuestionnaire._id}`}
                          className='size-4 accent-foreground'
                          checked={selected === qid}
                          onChange={() => setSingleAnswer(activeQuestionnaire._id, qid)}
                        />
                        {q.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={q.image}
                            alt=''
                            className='size-10 rounded-md object-cover'
                          />
                        ) : null}
                        <span className='text-sm font-medium'>{q.text}</span>
                      </label>
                    )
                  })}
                </div>
              ) : (
                <div className='space-y-2'>
                  {(activeQuestionnaire.questions || []).map(q => {
                    const qid = q._id
                    const checked = (form.questionnaireAnswers?.[activeQuestionnaire._id] || []).includes(
                      qid
                    )
                    return (
                      <label
                        key={qid}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
                          checked
                            ? 'border-foreground bg-muted/50'
                            : 'border-border hover:bg-muted/30'
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleMultiAnswer(activeQuestionnaire._id, qid)}
                        />
                        {q.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={q.image}
                            alt=''
                            className='size-10 rounded-md object-cover'
                          />
                        ) : null}
                        <span className='text-sm font-medium'>{q.text}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          ) : null}
        </form>

        <DialogFooter className='shrink-0'>
          <Button variant='outline' onClick={() => onOpenChange?.(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type='submit' form='user-form' disabled={saving || confirmOpen}>
            {saving ? 'Saving…' : isEdit ? 'Update' : 'Add user'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      title={isEdit ? 'Update user?' : 'Create user?'}
      description={
        isEdit
          ? 'This will update the selected user profile (and optionally role if you changed it).'
          : 'This will create a new user account with the provided details.'
      }
      confirmText={isEdit ? 'Update' : 'Create'}
      destructive={false}
      onConfirm={confirmAction}
    />
    </>
  )
}
