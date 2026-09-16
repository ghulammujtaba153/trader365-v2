export const DASHBOARD_PERMISSIONS = [
  { id: 'home', label: 'Home', group: 'Overview' },
  { id: 'analytics', label: 'Firebase Analytics', group: 'Overview' },
  { id: 'resources', label: 'Resources', group: 'Discovery' },
  { id: 'pillars', label: 'Pillars', group: 'Discovery' },
  { id: 'content', label: 'Content Permissions', group: 'Discovery' },
  { id: 'tags', label: 'Tag Management', group: 'Discovery' },
  { id: 'music', label: 'Music', group: 'Discovery' },
  { id: 'daily-thought', label: 'Daily Thought', group: 'Discovery' },
  { id: 'daily-quote', label: 'Daily Quote', group: 'Discovery' },
  { id: 'livestreams', label: 'Live Streams', group: 'Discovery' },
  { id: 'accountability', label: 'Accountability', group: 'Trading Hub' },
  { id: 'trading', label: 'Trading', group: 'Trading Hub' },
  { id: 'onboarding', label: 'Onboarding Questionnaire', group: 'Dynamic Screens' },
  { id: 'dynamic', label: 'Dynamic Pages', group: 'Dynamic Screens' },
  { id: 'welcome', label: 'Welcome Screen', group: 'Dynamic Screens' },
  { id: 'users', label: 'Users', group: 'Users Management' },
  { id: 'instructors', label: 'Instructors', group: 'Users Management' },
  { id: 'admins', label: 'Admins', group: 'Users Management' },
  { id: 'notifications', label: 'Push Notifications', group: 'Engagement' },
  { id: 'issues', label: 'Support Tickets', group: 'Engagement' },
  { id: 'subscriptions', label: 'Subscriptions', group: 'Engagement' }
]

export const DASHBOARD_PERMISSION_IDS = DASHBOARD_PERMISSIONS.map(item => item.id)

export const ACCESS_PRESETS = [
  { id: 'full', label: 'Full access', ids: DASHBOARD_PERMISSION_IDS },
  {
    id: 'content',
    label: 'Content',
    ids: [
      'home',
      'analytics',
      'resources',
      'pillars',
      'content',
      'tags',
      'music',
      'daily-thought',
      'daily-quote',
      'livestreams',
      'onboarding',
      'dynamic',
      'welcome',
      'instructors'
    ]
  },
  {
    id: 'support',
    label: 'Support',
    ids: ['home', 'analytics', 'users', 'instructors', 'issues', 'notifications']
  },
  {
    id: 'trading',
    label: 'Trading',
    ids: ['home', 'analytics', 'trading', 'accountability']
  }
]

/** Default / preset access for instructors (no admin or user-management pages). */
export const INSTRUCTOR_DEFAULT_ACCESS = [
  'home',
  'resources',
  'pillars',
  'content',
  'tags',
  'music',
  'daily-thought',
  'daily-quote',
  'livestreams'
]

export const INSTRUCTOR_ACCESS_PRESETS = [
  {
    id: 'instructor-content',
    label: 'Content (default)',
    ids: INSTRUCTOR_DEFAULT_ACCESS
  },
  {
    id: 'instructor-content-analytics',
    label: 'Content + analytics',
    ids: ['analytics', ...INSTRUCTOR_DEFAULT_ACCESS]
  },
  {
    id: 'instructor-full-content',
    label: 'All content tools',
    ids: [
      'home',
      'analytics',
      'resources',
      'pillars',
      'content',
      'tags',
      'music',
      'daily-thought',
      'daily-quote',
      'livestreams',
      'onboarding',
      'dynamic',
      'welcome'
    ]
  }
]

const PATH_RULES = [
  { id: 'admins', test: path => path.startsWith('/users/admins') },
  { id: 'instructors', test: path => path.startsWith('/users/instructors') },
  { id: 'users', test: path => path.startsWith('/users') || path.startsWith('/user-profile') },
  { id: 'pillars', test: path => path.startsWith('/resources/pillars') },
  { id: 'content', test: path => path.startsWith('/resources/content') },
  { id: 'tags', test: path => path.startsWith('/resources/tags') },
  { id: 'music', test: path => path.startsWith('/resources/music') },
  { id: 'daily-thought', test: path => path.startsWith('/resources/daily-thought') },
  { id: 'daily-quote', test: path => path.startsWith('/resources/daily-quote') },
  { id: 'livestreams', test: path => path.startsWith('/resources/livestreams') },
  { id: 'resources', test: path => path === '/resources' || path.startsWith('/resources/') },
  { id: 'accountability', test: path => path.startsWith('/accountability') },
  { id: 'trading', test: path => path.startsWith('/trading') },
  { id: 'welcome', test: path => path.startsWith('/onboarding/welcome') },
  { id: 'onboarding', test: path => path.startsWith('/onboarding') },
  { id: 'dynamic', test: path => path.startsWith('/dynamic') },
  { id: 'notifications', test: path => path.startsWith('/notifications') },
  { id: 'issues', test: path => path.startsWith('/issues') },
  { id: 'subscriptions', test: path => path.startsWith('/subscriptions') },
  { id: 'analytics', test: path => path === '/analytics' || path.startsWith('/analytics/') || path === '/bot-analytics' || path.startsWith('/bot-analytics/') },
  { id: 'home', test: path => path === '/home' || path.startsWith('/home/') }
]

export const HREF_PERMISSION = {
  '/home': 'home',
  '/analytics': 'analytics',
  '/bot-analytics': 'analytics',
  '/resources': 'resources',
  '/resources/pillars': 'pillars',
  '/resources/content': 'content',
  '/resources/tags': 'tags',
  '/resources/music': 'music',
  '/resources/daily-thought': 'daily-thought',
  '/resources/daily-quote': 'daily-quote',
  '/resources/livestreams': 'livestreams',
  '/accountability': 'accountability',
  '/trading': 'trading',
  '/onboarding': 'onboarding',
  '/dynamic': 'dynamic',
  '/onboarding/welcome': 'welcome',
  '/users': 'users',
  '/users/instructors': 'instructors',
  '/users/admins': 'admins',
  '/notifications': 'notifications',
  '/issues': 'issues',
  '/subscriptions': 'subscriptions'
}

export function permissionForPath(pathname) {
  const path = String(pathname || '')
  return PATH_RULES.find(rule => rule.test(path))?.id || null
}

export function resolveDashboardAccess(user) {
  if (!user) return []
  if (user.isSuperAdmin) return [...DASHBOARD_PERMISSION_IDS]
  if (!Array.isArray(user.dashboardAccess)) {
    // Legacy admins: missing access = full. Instructors: content-safe default.
    if (user.role === 'editor') return [...INSTRUCTOR_DEFAULT_ACCESS]
    return [...DASHBOARD_PERMISSION_IDS]
  }
  return user.dashboardAccess.filter(id => DASHBOARD_PERMISSION_IDS.includes(id))
}

export function hasDashboardPermission(user, permission) {
  if (!permission) return true
  return resolveDashboardAccess(user).includes(permission)
}

export function canAccessPath(user, pathname) {
  const permission = permissionForPath(pathname)
  if (!permission) return true
  return hasDashboardPermission(user, permission)
}

export function firstAllowedPath(user) {
  const access = resolveDashboardAccess(user)
  const match = Object.entries(HREF_PERMISSION).find(([, id]) => access.includes(id))
  return match?.[0] || '/home'
}
