'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Bell,
  Heart,
  HeartPulse,
  LifeBuoy,
  LineChart,
  Sparkles,
  Target,
  Timer
} from 'lucide-react'

import api from '@/lib/api'
import MetricCard from '@/components/dashboard/metric-card'
import { MetricCardsRowSkeleton } from '@/components/dashboard/skeletons'
import { asArray, matchesUserId, pickSnapshot, settledValue } from '@/components/users/user-profile-utils'
import { formatDateTime, formatMoney } from '@/lib/format'

const OPEN_TICKET_STATUSES = new Set(['open', 'in-progress'])

export default function UserAdminOverview({ userId, user }) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (!userId) return
    let mounted = true

    queueMicrotask(() => {
      const load = async () => {
        setLoading(true)
        try {
          const results = await Promise.allSettled([
            api.get(`/api/subscription/debug/${userId}`),
            api.get(`/api/delete/requests/${userId}`),
            api.get(`/api/user-activity/user/${userId}/summary`),
            api.get(`/api/habbits/stats/${userId}`),
            api.get(`/api/trading-form/graph/${userId}/summary`, {
              params: { duration: 'all time' }
            }),
            api.get(`/api/trading-form/graph/${userId}/insight-summary`, {
              params: { duration: 'all time' }
            }),
            api.get('/api/problem'),
            api.get(`/api/mood/${userId}`),
            api.get(`/api/favorites/${userId}`),
            api.get(`/api/bot/${userId}/stats`),
            api.get(`/api/notifications/${userId}`),
            api.get(`/api/resource/progress/${userId}`),
            api.get(`/api/therapy-exercises/summary/${userId}`),
            api.get(`/api/therapy-exercises/streaks/${userId}`)
          ])
          if (!mounted) return

          const [
            subRes,
            deleteRes,
            activityRes,
            habitRes,
            tradeRes,
            insightRes,
            problemRes,
            moodRes,
            favRes,
            botRes,
            notifRes,
            progressRes,
            exerciseSummaryRes,
            exerciseStreaksRes
          ] = results.map(settledValue)

          const snapshot = pickSnapshot(subRes?.data)
          const deleteRequests = asArray(deleteRes?.data)
          const activity = activityRes?.data || {}
          const habits = habitRes?.data || {}
          const trading = tradeRes?.data?.data || tradeRes?.data || {}
          const insight = insightRes?.data?.data || insightRes?.data || {}
          const tickets = asArray(problemRes?.data).filter(item =>
            matchesUserId(item.userId, userId)
          )
          const moods = asArray(moodRes?.data)
          const latestMood = [...moods].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          )[0]
          const favorites = asArray(favRes?.data)
          const bot = botRes?.data || {}
          const notifications = asArray(notifRes?.data)
          const progress = asArray(progressRes?.data)
          const exerciseSummary = exerciseSummaryRes?.data || {}
          const exerciseStreaks = exerciseStreaksRes?.data || {}
          const exerciseAll = exerciseStreaks.all || {}

          setStats({
            snapshot,
            eventsCount: asArray(subRes?.data?.events).length,
            deleteRequests,
            activity,
            habits,
            trading,
            insight,
            tickets,
            moods,
            latestMood,
            favorites,
            bot,
            notifications,
            progress,
            exercises: {
              totalCompletions: Number(exerciseAll.totalCompletions) || 0,
              currentStreak: Number(exerciseAll.currentStreak) || 0,
              longestStreak: Number(exerciseAll.longestStreak) || 0,
              completedToday: Number(exerciseSummary.counts?.completedToday) || 0,
              remainingToday: Number(exerciseSummary.counts?.remainingToday) || 0
            }
          })
        } catch {
          if (mounted) setStats(null)
        } finally {
          if (mounted) setLoading(false)
        }
      }
      load()
    })

    return () => {
      mounted = false
    }
  }, [userId])

  const alerts = useMemo(() => {
    if (!stats || !user) return []
    const items = []
    const { snapshot, deleteRequests, tickets, trading, insight } = stats
    const subStatus = snapshot?.status

    if (user.isDeleted) {
      items.push({
        tone: 'danger',
        title: 'Account is deleted',
        body: 'This user is marked deleted. Confirm whether access should stay blocked.'
      })
    }
    if (user.status === 'suspended') {
      items.push({
        tone: 'danger',
        title: 'Account is suspended',
        body: 'The user cannot use the app until you activate them again.'
      })
    }
    if (deleteRequests.length) {
      items.push({
        tone: 'danger',
        title: `${deleteRequests.length} deletion request${deleteRequests.length === 1 ? '' : 's'}`,
        body: deleteRequests[0]?.reason
          ? `Latest reason: ${deleteRequests[0].reason}`
          : 'Review the request before keeping or removing the account.'
      })
    }
    const openTickets = tickets.filter(item => OPEN_TICKET_STATUSES.has(item.status))
    if (openTickets.length) {
      items.push({
        tone: 'warn',
        title: `${openTickets.length} open support ticket${openTickets.length === 1 ? '' : 's'}`,
        body: 'Unresolved issues may explain churn, billing complaints, or low engagement.'
      })
    }
    if (user.isPremium && (!snapshot || ['expired', 'unknown'].includes(subStatus))) {
      items.push({
        tone: 'warn',
        title: 'Premium flag does not match billing',
        body: 'The profile is marked premium, but RevenueCat has no active entitlement.'
      })
    }
    if (!user.isPremium && snapshot && ['active', 'cancelled', 'billing_issue'].includes(subStatus)) {
      items.push({
        tone: 'warn',
        title: 'Billing looks entitled, premium flag is off',
        body: `Snapshot status is ${subStatus}. Check whether the webhook mapped this user.`
      })
    }
    if (subStatus === 'billing_issue') {
      items.push({
        tone: 'warn',
        title: 'Billing issue on current plan',
        body: 'Payment failed or is in retry. Access may still be open until expiry.'
      })
    }
    if (user.isProfilingPending || !user.onboardingCompleted) {
      items.push({
        tone: 'info',
        title: 'Onboarding is incomplete',
        body: 'Profiling answers are missing, so personalization and goals may be weak.'
      })
    }
    if (Number(trading.maxDrawdownPct) >= 30) {
      items.push({
        tone: 'warn',
        title: `High drawdown (${trading.maxDrawdownPct}%)`,
        body: 'Risk is elevated. Review trade size, stop losses, and emotional state.'
      })
    }
    if (insight?.avgRiskPerTradeZone === 'high') {
      items.push({
        tone: 'warn',
        title: 'Average risk per trade is high',
        body: insight.avgRiskPerTradeText || 'This trader may be oversizing positions.'
      })
    }
    return items
  }, [stats, user])

  if (loading) {
    return <MetricCardsRowSkeleton count={9} />
  }

  if (!stats) return null

  const openTickets = stats.tickets.filter(item => OPEN_TICKET_STATUSES.has(item.status))
  const unseenNotifs = stats.notifications.filter(item => !item.isSeen).length
  const lastActive = stats.activity.lastActivity || stats.activity.lastSeen

  return (
    <section className='space-y-4'>
      {alerts.length > 0 ? (
        <div className='space-y-2'>
          {alerts.map(alert => (
            <div
              key={alert.title}
              className={
                alert.tone === 'danger'
                  ? 'rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3'
                  : alert.tone === 'warn'
                    ? 'rounded-xl border border-amber-500/40 bg-amber-50 px-4 py-3 dark:bg-amber-500/10'
                    : 'rounded-xl border bg-muted/40 px-4 py-3'
              }
            >
              <p className='flex items-center gap-2 text-sm font-semibold'>
                <AlertTriangle className='size-4' />
                {alert.title}
              </p>
              <p className='mt-1 text-sm text-muted-foreground'>{alert.body}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <MetricCard
          title='App time'
          value={Number(stats.activity.totalTimeSeconds) || 0}
          subtitle={`${stats.activity.sessionsCount || 0} sessions · last ${formatDateTime(lastActive)}`}
          icon={Timer}
          format='time'
        />
        <MetricCard
          title='Habits'
          value={Number(stats.habits.total) || 0}
          subtitle={`${stats.habits.completed || 0} done now · ${stats.habits.pending || 0} pending · streak ${stats.habits.streak || 0}`}
          icon={Target}
        />
        <MetricCard
          title='Trades'
          value={Number(stats.trading.totalTrades) || 0}
          subtitle={`Win ${stats.trading.winRate || 0}% · avg ${formatMoney(stats.trading.avgProfitPerTrade)} · DD ${stats.trading.maxDrawdownPct || 0}%`}
          icon={LineChart}
        />
        <MetricCard
          title='Support load'
          value={openTickets.length}
          subtitle={`${stats.tickets.length} tickets · ${stats.deleteRequests.length} delete requests`}
          icon={LifeBuoy}
          accentClass={
            openTickets.length || stats.deleteRequests.length
              ? 'bg-destructive/10 text-destructive'
              : 'bg-muted text-foreground'
          }
        />
        <MetricCard
          title='Mood logs'
          value={stats.moods.length}
          subtitle={stats.latestMood?.mood ? `Latest: ${stats.latestMood.mood}` : 'No mood check-ins yet'}
          icon={Activity}
        />
        <MetricCard
          title='Saved content'
          value={stats.favorites.length}
          subtitle={`${stats.progress.length} resources in progress`}
          icon={Heart}
        />
        <MetricCard
          title='Trade Sense AI'
          value={Number(stats.bot.total) || 0}
          subtitle={`${stats.bot.today || 0} today · ${stats.bot.week || 0} in last 7 days`}
          icon={Sparkles}
        />
        <MetricCard
          title='Exercises'
          value={Number(stats.exercises?.totalCompletions) || 0}
          subtitle={`today ${stats.exercises?.completedToday || 0}/3 · streak ${stats.exercises?.currentStreak || 0} · longest ${stats.exercises?.longestStreak || 0}`}
          icon={HeartPulse}
        />
        <MetricCard
          title='Notifications'
          value={stats.notifications.length}
          subtitle={`${unseenNotifs} unseen · ${stats.eventsCount} billing events`}
          icon={Bell}
        />
      </div>
    </section>
  )
}
