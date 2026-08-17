import UserDetailPage from '@/components/users/user-detail-page'

export default async function UserByIdPage({ params }) {
  const { id } = await params
  return <UserDetailPage id={id} />
}
