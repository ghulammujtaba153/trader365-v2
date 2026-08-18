import {
  AlertCircle,
  Bell,
  Brain,
  ChartCandlestick,
  ClipboardList,
  CreditCard,
  FolderOpen,
  Flag,
  GraduationCap,
  Home,
  LayoutTemplate,
  ListChecks,
  Mic2,
  Music,
  Network,
  Quote,
  Radio,
  Shield,
  Sparkles,
  Tags,
  UserCog,
  Users,
  UsersRound
} from 'lucide-react'

import { HREF_PERMISSION, hasDashboardPermission } from '@/lib/dashboard-access'

export const NAV_ITEMS = [
  { type: 'link', href: '/home', label: 'Home', icon: Home, group: 'Overview' },
  {
    type: 'link',
    href: '/trade-sense-ai',
    label: 'Trade Sense AI',
    icon: Brain,
    group: 'Overview',
  },
  {
    type: 'group',
    id: 'discovery',
    label: 'Discovery',
    icon: Brain,
    children: [
      { href: '/resources', label: 'Resources', icon: FolderOpen },
      { href: '/resources/pillars', label: 'Pillars', icon: Network },
      { href: '/resources/content', label: 'Content Permissions', icon: UserCog },
      { href: '/resources/tags', label: 'Tag Management', icon: Tags },
      { href: '/resources/music', label: 'Music', icon: Music },
      { href: '/resources/daily-thought', label: 'Daily Thought', icon: Mic2 },
      { href: '/resources/daily-quote', label: 'Daily Quote', icon: Quote },
      { href: '/resources/livestreams', label: 'Live Streams', icon: Radio }
    ]
  },
  {
    type: 'group',
    id: 'trading-hub',
    label: 'Trading Hub',
    icon: ChartCandlestick,
    children: [
      { href: '/accountability', label: 'Accountability', icon: Flag },
      { href: '/trading', label: 'Trading', icon: ChartCandlestick }
    ]
  },
  {
    type: 'group',
    id: 'dynamic-screens',
    label: 'Dynamic Screens',
    icon: ClipboardList,
    children: [
      { href: '/onboarding', label: 'Onboarding Questionnaire', icon: ListChecks },
      { href: '/dynamic', label: 'Dynamic Pages', icon: LayoutTemplate },
      { href: '/onboarding/welcome', label: 'Welcome Screen', icon: Sparkles }
    ]
  },
  {
    type: 'group',
    id: 'users-management',
    label: 'Users Management',
    icon: UsersRound,
    children: [
      { href: '/users', label: 'Users', icon: Users },
      { href: '/users/instructors', label: 'Instructors', icon: GraduationCap },
      { href: '/users/admins', label: 'Admins', icon: Shield }
    ]
  },
  { type: 'link', href: '/notifications', label: 'Push Notifications', icon: Bell, group: 'Engagement' },
  { type: 'link', href: '/issues', label: 'Support Tickets', icon: AlertCircle, group: 'Engagement' },
  { type: 'link', href: '/subscriptions', label: 'Subscriptions', icon: CreditCard, group: 'Engagement' }
]

export function filterNavItems(user) {
  return NAV_ITEMS.map(item => {
    if (item.type === 'group') {
      const children = item.children.filter(child =>
        hasDashboardPermission(user, HREF_PERMISSION[child.href])
      )
      if (!children.length) return null
      return { ...item, children }
    }
    if (!hasDashboardPermission(user, HREF_PERMISSION[item.href])) return null
    return item
  }).filter(Boolean)
}

/** Flat list of pages the signed-in admin can open (for header search). */
export function getAccessiblePages(user) {
  const pages = []

  for (const item of filterNavItems(user)) {
    if (item.type === 'group') {
      for (const child of item.children) {
        pages.push({
          href: child.href,
          label: child.label,
          icon: child.icon,
          group: item.label
        })
      }
    } else if (!item.soon) {
      pages.push({
        href: item.href,
        label: item.label,
        icon: item.icon,
        group: item.group || 'Overview'
      })
    }
  }

  return pages
}

export function isNavLinkActive(pathname, href) {
  if (href === '/users') {
    return (
      pathname === '/users' ||
      (pathname.startsWith('/users/') &&
        !pathname.startsWith('/users/admins') &&
        !pathname.startsWith('/users/instructors'))
    )
  }
  if (href === '/resources') return pathname === '/resources'
  if (href === '/onboarding') return pathname === '/onboarding'
  return pathname === href || pathname.startsWith(`${href}/`)
}
