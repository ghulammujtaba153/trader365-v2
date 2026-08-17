import UserDetailPage from '@/components/users/user-detail-page'

export default async function UserProfilePage({ searchParams }) {
  const query = await searchParams
  return <UserDetailPage id={query.id} />
}
