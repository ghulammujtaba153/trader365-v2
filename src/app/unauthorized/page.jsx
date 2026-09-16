import StatusPage from '@/components/status/status-page'

export const metadata = {
  title: 'Unauthorized · Trader 365',
  description: 'You do not have permission to access this dashboard'
}

export default function UnauthorizedPage() {
  return (
    <StatusPage
      code='401'
      title='Unauthorized'
      description='This dashboard is for admin and instructor accounts. Sign in with an authorized staff account, or return to a page you can access.'
      icon='shield-off'
      primaryHref='/login'
      primaryLabel='Sign in'
      secondaryHref='/home'
      secondaryLabel='Try home'
    />
  )
}
