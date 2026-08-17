import { NextResponse } from 'next/server'

const RESERVED = new Set(['admins', 'instructors'])

export function middleware(request) {
  const { pathname } = request.nextUrl
  const match = pathname.match(/^\/users\/([^/]+)$/)
  if (!match) return NextResponse.next()

  const id = match[1]
  if (RESERVED.has(id)) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = '/user-profile'
  url.searchParams.set('id', id)
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ['/users/:id']
}
