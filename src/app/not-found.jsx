import StatusPage from '@/components/status/status-page'

export const metadata = {
  title: 'Page not found · Trader 365',
  description: 'The page you requested does not exist'
}

export default function NotFound() {
  return (
    <StatusPage
      code='404'
      title='Page not found'
      description='That route does not exist in the Trader 365 dashboard. Check the URL or head back to a known page.'
      icon='file-question'
      primaryHref='/home'
      primaryLabel='Go to home'
      secondaryHref='/login'
      secondaryLabel='Sign in'
    />
  )
}
