'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Copy, Mail, Pencil, Phone } from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/api'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import DashboardHeader from '@/components/layout/dashboard-header'
import UserActivitySummary from '@/components/users/user-activity-summary'
import UserAdminOverview from '@/components/users/user-admin-overview'
import UserBotSection from '@/components/users/user-bot-section'
import UserDailyActivity from '@/components/users/user-daily-activity'
import UserEngagementSection from '@/components/users/user-engagement-section'
import UserFormDialog from '@/components/users/user-form-dialog'
import UserGoalsSection from '@/components/users/user-goals-section'
import UserQuestionnaireSection from '@/components/users/user-questionnaire-section'
import UserSubscriptionSection from '@/components/users/user-subscription-section'
import UserSupportSection from '@/components/users/user-support-section'
import UserTradingSection from '@/components/users/user-trading-section'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime, formatLabel, formatRoleLabel, formatYesNo } from '@/lib/format'

export default function UserDetailPage({ id }) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [statusTarget, setStatusTarget] = useState(null)

  const fetchUser = async ({ silent = false } = {}) => {
    if (!id) return
    try {
      if (!silent) setLoading(true)
      const res = await api.get(`/api/auth/users/${id}`)
      setUser(res.data.user)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load user details')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    if (!id) return
    let mounted = true
    queueMicrotask(() => {
      const load = async () => {
        setLoading(true)
        try {
          const res = await api.get(`/api/auth/users/${id}`)
          if (mounted) setUser(res.data.user)
        } catch (err) {
          if (mounted) toast.error(err?.response?.data?.message || 'Failed to load user details')
        } finally {
          if (mounted) setLoading(false)
        }
      }
      load()
    })
    return () => {
      mounted = false
    }
  }, [id])

  if (!id) {
    return (
      <>
        <DashboardHeader title='User profile' />
        <main className='px-4 py-10 text-center md:px-6'>
          <p className='mb-4 text-muted-foreground'>Missing user id.</p>
          <Button onClick={() => router.push('/users')}>
            <ArrowLeft className='size-4' />
            Back to users
          </Button>
        </main>
      </>
    )
  }

  if (loading) {
    return (
      <>
        <DashboardHeader title='User profile' />
        <main className='space-y-4 px-4 py-4 md:px-6'>
          <Skeleton className='h-48 w-full' />
          <Skeleton className='h-40 w-full' />
        </main>
      </>
    )
  }

  if (!user) {
    return (
      <>
        <DashboardHeader title='User profile' />
        <main className='px-4 py-10 text-center md:px-6'>
          <p className='mb-4 text-muted-foreground'>This user could not be loaded.</p>
          <Button onClick={() => router.push('/users')}>
            <ArrowLeft className='size-4' />
            Back to users
          </Button>
        </main>
      </>
    )
  }

  const goals = Array.isArray(user.goals) ? user.goals : []
  const areas = Array.isArray(user.choosenArea) ? user.choosenArea : []
  const categories = Array.isArray(user.categories) ? user.categories : []
  const initials = (user.name || '?').charAt(0).toUpperCase()
  const loginMethod = user.isGoogleUse ? 'Google' : user.isAppleUse ? 'Apple' : 'Email'
  const nextStatus = user.status === 'active' ? 'suspended' : 'active'

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(String(user._id))
      toast.success('User id copied')
    } catch {
      toast.error('Could not copy user id')
    }
  }

  return (
    <>
      <DashboardHeader
        title='User profile'
        description='Account, billing, trading, support, and engagement in one place.'
      />

      <main className='flex-1 space-y-6 px-4 py-4 md:px-6 md:pb-6'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <Button
            variant='outline'
            onClick={() => router.push(user.role === 'editor' ? '/users/instructors' : '/users')}
          >
            <ArrowLeft className='size-4' />
            {user.role === 'editor' ? 'Back to instructors' : 'Back to users'}
          </Button>
          <div className='flex flex-wrap items-center gap-2'>
            <Badge variant='outline'>{formatRoleLabel(user.role)}</Badge>
            {user.isSuperAdmin ? <Badge variant='secondary'>Super admin</Badge> : null}
            <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
              {user.status === 'active' ? 'Active' : formatLabel(user.status)}
            </Badge>
            <Badge variant='secondary'>{user.isPremium ? 'Premium' : 'Free plan'}</Badge>
            {user.isDeleted ? <Badge variant='destructive'>Deleted</Badge> : null}
            <Button variant='outline' onClick={() => setEditOpen(true)}>
              <Pencil className='size-4' />
              Edit
            </Button>
            <Button
              variant={nextStatus === 'suspended' ? 'destructive' : 'outline'}
              onClick={() => setStatusTarget(nextStatus)}
            >
              {nextStatus === 'suspended' ? 'Suspend' : 'Activate'}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className='p-5'>
            <div className='flex flex-col gap-5 md:flex-row md:items-start'>
              <Avatar className='size-24'>
                <AvatarImage src={user.profilePic || undefined} alt={user.name} />
                <AvatarFallback className='bg-foreground text-2xl text-background'>{initials}</AvatarFallback>
              </Avatar>

              <div className='min-w-0 flex-1'>
                <h2 className='text-2xl font-semibold tracking-tight'>{user.name}</h2>
                <div className='mt-2 flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-4'>
                  <span className='inline-flex items-center gap-1.5'>
                    <Mail className='size-4' />
                    {user.email || 'No email'}
                  </span>
                  <span className='inline-flex items-center gap-1.5'>
                    <Phone className='size-4' />
                    {user.phone || 'No phone'}
                  </span>
                  <button
                    type='button'
                    onClick={copyId}
                    className='inline-flex items-center gap-1.5 text-left hover:text-foreground'
                  >
                    <Copy className='size-4' />
                    {user._id}
                  </button>
                </div>

                {user.description ? (
                  <p className='mt-3 text-sm text-muted-foreground'>{user.description}</p>
                ) : null}

                <Separator className='my-4' />

                <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'>
                  <div>
                    <p className='text-xs text-muted-foreground'>Age range</p>
                    <p className='mt-1 text-sm font-semibold'>{formatLabel(user.ageRange)}</p>
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground'>Gender</p>
                    <p className='mt-1 text-sm font-semibold'>{formatLabel(user.gender)}</p>
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground'>Experience</p>
                    <p className='mt-1 text-sm font-semibold'>{formatLabel(user.experienceLevel)}</p>
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground'>Sign-in</p>
                    <p className='mt-1 text-sm font-semibold'>{loginMethod}</p>
                  </div>
                </div>

                {(goals.length > 0 || areas.length > 0 || categories.length > 0) && (
                  <div className='mt-4 space-y-3'>
                    {goals.length > 0 ? (
                      <div>
                        <p className='mb-1.5 text-xs text-muted-foreground'>Profile goals</p>
                        <div className='flex flex-wrap gap-1.5'>
                          {goals.map((goal, i) => (
                            <Badge key={`${goal}-${i}`} variant='outline'>
                              {goal}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {areas.length > 0 ? (
                      <div>
                        <p className='mb-1.5 text-xs text-muted-foreground'>Interest areas</p>
                        <div className='flex flex-wrap gap-1.5'>
                          {areas.map((area, i) => (
                            <Badge key={`${area}-${i}`} variant='secondary'>
                              {area}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {categories.length > 0 ? (
                      <div>
                        <p className='mb-1.5 text-xs text-muted-foreground'>Categories</p>
                        <div className='flex flex-wrap gap-1.5'>
                          {categories.map((cat, i) => (
                            <Badge key={`${cat}-${i}`} variant='outline'>
                              {cat}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account flags</CardTitle>
            <CardDescription>Access, consents, onboarding, and account age</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'>
              <div className='rounded-xl border p-3'>
                <p className='text-xs text-muted-foreground'>Onboarding</p>
                <p className='mt-1 text-sm font-semibold'>
                  {user.onboardingCompleted ? 'Completed' : 'Incomplete'}
                </p>
              </div>
              <div className='rounded-xl border p-3'>
                <p className='text-xs text-muted-foreground'>Profiling pending</p>
                <p className='mt-1 text-sm font-semibold'>{formatYesNo(user.isProfilingPending)}</p>
              </div>
              <div className='rounded-xl border p-3'>
                <p className='text-xs text-muted-foreground'>Terms accepted</p>
                <p className='mt-1 text-sm font-semibold'>{formatYesNo(user.termsAndConditionsConsent)}</p>
              </div>
              <div className='rounded-xl border p-3'>
                <p className='text-xs text-muted-foreground'>Newsletter</p>
                <p className='mt-1 text-sm font-semibold'>{formatYesNo(user.newsLetterConsent)}</p>
              </div>
              <div className='rounded-xl border p-3'>
                <p className='text-xs text-muted-foreground'>Background music</p>
                <p className='mt-1 text-sm font-semibold'>{formatYesNo(user.backgroundMusicEnabled)}</p>
              </div>
              <div className='rounded-xl border p-3'>
                <p className='text-xs text-muted-foreground'>Password resets</p>
                <p className='mt-1 text-sm font-semibold'>{user.passwordResetVersion ?? 0}</p>
              </div>
              <div className='rounded-xl border p-3'>
                <p className='text-xs text-muted-foreground'>Created</p>
                <p className='mt-1 text-sm font-semibold'>{formatDateTime(user.createdAt)}</p>
              </div>
              <div className='rounded-xl border p-3'>
                <p className='text-xs text-muted-foreground'>Last updated</p>
                <p className='mt-1 text-sm font-semibold'>{formatDateTime(user.updatedAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <UserAdminOverview userId={id} user={user} />
        <UserSubscriptionSection userId={id} userIsPremium={!!user.isPremium} />
        <UserQuestionnaireSection answers={user.questionnaireAnswers} />
        <UserTradingSection userId={id} />
        <UserBotSection userId={id} />
        <UserSupportSection userId={id} />
        <UserActivitySummary userId={id} />
        <UserDailyActivity userId={id} />
        <UserGoalsSection userId={id} />
        <UserEngagementSection userId={id} />
      </main>

      <UserFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        user={user}
        onSaved={() => fetchUser({ silent: true })}
      />

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onOpenChange={open => !open && setStatusTarget(null)}
        title={statusTarget === 'active' ? 'Activate user?' : 'Suspend user?'}
        description={
          statusTarget === 'active'
            ? 'This will restore the user’s access to the app.'
            : 'This will block the user from accessing the app.'
        }
        confirmText={statusTarget === 'active' ? 'Activate' : 'Suspend'}
        destructive={statusTarget === 'suspended'}
        onConfirm={async () => {
          await api.patch(`/api/auth/users/${id}/status`, { status: statusTarget })
          await fetchUser({ silent: true })
          return `User status updated to ${statusTarget}`
        }}
      />
    </>
  )
}
