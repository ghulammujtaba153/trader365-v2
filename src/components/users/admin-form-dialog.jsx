'use client'

import { useEffect, useMemo, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/api'
import {
  ACCESS_PRESETS,
  DASHBOARD_PERMISSIONS,
  DASHBOARD_PERMISSION_IDS,
  resolveDashboardAccess
} from '@/lib/dashboard-access'
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

const groupedPermissions = DASHBOARD_PERMISSIONS.reduce((groups, item) => {
  const list = groups.get(item.group) || []
  list.push(item)
  groups.set(item.group, list)
  return groups
}, new Map())

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  password: '',
  adminLabel: 'Admin',
  dashboardAccess: [...DASHBOARD_PERMISSION_IDS]
}

export default function AdminFormDialog({ open, onOpenChange, admin, onSaved }) {
  const isEdit = Boolean(admin)
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (!open) return
    setShowPassword(false)
    if (admin) {
      setForm({
        name: admin.name || '',
        phone: admin.phone || '',
        email: admin.email || '',
        password: '',
        adminLabel: admin.adminLabel || 'Admin',
        dashboardAccess: resolveDashboardAccess(admin)
      })
    } else {
      setForm(emptyForm)
    }
  }, [open, admin])

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const toggleAccess = id => {
    update(
      'dashboardAccess',
      form.dashboardAccess.includes(id)
        ? form.dashboardAccess.filter(item => item !== id)
        : [...form.dashboardAccess, id]
    )
  }

  const toggleGroup = (ids, checked) => {
    const next = new Set(form.dashboardAccess)
    ids.forEach(id => {
      if (checked) next.add(id)
      else next.delete(id)
    })
    update('dashboardAccess', [...next])
  }

  const selectedPreset = useMemo(() => {
    const current = [...form.dashboardAccess].sort().join(',')
    return ACCESS_PRESETS.find(preset => [...preset.ids].sort().join(',') === current)?.id || 'custom'
  }, [form.dashboardAccess])

  const handleSubmit = async e => {
    e.preventDefault()
    if (saving || confirmOpen) return
    if (!isEdit && !form.password) {
      toast.error('Password is required')
      return
    }
    if (!admin?.isSuperAdmin && form.dashboardAccess.length === 0) {
      toast.error('Select at least one dashboard page')
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
        role: 'admin',
        adminLabel: form.adminLabel,
        dashboardAccess: admin?.isSuperAdmin ? undefined : form.dashboardAccess
      }
      if (form.password) payload.password = form.password

      if (isEdit) {
        const { role, ...profilePayload } = payload
        await api.put(`/api/auth/users/update/${admin._id}`, profilePayload)
        onSaved?.()
        onOpenChange?.(false)
        return 'Admin updated successfully'
      }

      await api.post('/api/auth/register', payload)
      onSaved?.()
      onOpenChange?.(false)
      return 'Admin created successfully'
    } catch (err) {
      throw err
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] flex-col overflow-hidden sm:max-w-4xl'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>{isEdit ? 'Edit admin' : 'Add admin'}</DialogTitle>
          <DialogDescription>Set this admin’s role and which dashboard pages they can open.</DialogDescription>
        </DialogHeader>

        <form
          id='admin-form'
          onSubmit={handleSubmit}
          className='scrollbar-thin grid min-h-0 flex-1 gap-4 overflow-y-auto pr-1'
        >
          <div className='grid gap-3 sm:grid-cols-2'>
            <div className='space-y-1.5'>
              <Label htmlFor='admin-name'>Name</Label>
              <Input id='admin-name' value={form.name} onChange={e => update('name', e.target.value)} required />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='admin-role'>Role</Label>
              <Input
                id='admin-role'
                value={form.adminLabel}
                onChange={e => update('adminLabel', e.target.value)}
                placeholder='Support, Content, Trading…'
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='admin-phone'>Phone</Label>
              <Input id='admin-phone' value={form.phone} onChange={e => update('phone', e.target.value)} required />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='admin-email'>Email</Label>
              <Input
                id='admin-email'
                type='email'
                value={form.email}
                onChange={e => update('email', e.target.value)}
                required
              />
            </div>
            <div className='space-y-1.5 sm:col-span-2'>
              <Label htmlFor='admin-password'>{isEdit ? 'Password (optional)' : 'Password'}</Label>
              <div className='relative'>
                <Input
                  id='admin-password'
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => update('password', e.target.value)}
                  required={!isEdit}
                  className='pr-9'
                />
                <Button
                  type='button'
                  variant='ghost'
                  size='icon-sm'
                  className='absolute top-1/2 right-1 -translate-y-1/2'
                  onClick={() => setShowPassword(v => !v)}
                >
                  {showPassword ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
                </Button>
              </div>
            </div>
          </div>

          {admin?.isSuperAdmin ? (
            <p className='rounded-xl border bg-muted/40 px-3 py-2 text-sm text-muted-foreground'>
              Super-admins always have access to every dashboard page.
            </p>
          ) : (
          <div className='space-y-3 rounded-xl border p-3'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div>
                <p className='text-sm font-medium'>Dashboard access</p>
                <p className='text-xs text-muted-foreground'>Choose the pages this admin can use</p>
              </div>
              <select
                value={selectedPreset}
                onChange={e => {
                  const preset = ACCESS_PRESETS.find(item => item.id === e.target.value)
                  if (preset) update('dashboardAccess', [...preset.ids])
                }}
                className='h-8 rounded-lg border border-input bg-background px-2 text-sm'
              >
                <option value='custom'>Custom</option>
                {ACCESS_PRESETS.map(preset => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>

            {[...groupedPermissions.entries()].map(([group, items]) => {
              const ids = items.map(item => item.id)
              const selectedCount = ids.filter(id => form.dashboardAccess.includes(id)).length
              return (
                <div key={group} className='space-y-2'>
                  <label className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                    <Checkbox
                      checked={selectedCount === ids.length}
                      onCheckedChange={checked => toggleGroup(ids, !!checked)}
                    />
                    {group}
                  </label>
                  <div className='grid gap-2 sm:grid-cols-2'>
                    {items.map(item => (
                      <label key={item.id} className='flex cursor-pointer items-center gap-2 text-sm'>
                        <Checkbox
                          checked={form.dashboardAccess.includes(item.id)}
                          onCheckedChange={() => toggleAccess(item.id)}
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          )}
        </form>

        <DialogFooter className='shrink-0'>
          <Button variant='outline' onClick={() => onOpenChange?.(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type='submit' form='admin-form' disabled={saving || confirmOpen}>
            {saving ? 'Saving…' : isEdit ? 'Update admin' : 'Add admin'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      title={isEdit ? 'Update admin?' : 'Add admin?'}
      description={
        isEdit
          ? 'This will update the admin user profile and dashboard access.'
          : 'This will create a new admin user with the provided dashboard access.'
      }
      confirmText={isEdit ? 'Update' : 'Create'}
      destructive={false}
      onConfirm={confirmAction}
    />
    </>
  )
}
