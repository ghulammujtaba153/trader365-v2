'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import api from '@/lib/api'
import { asArray, matchesUserId } from '@/components/users/user-profile-utils'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { formatDateTime } from '@/lib/format'

const STATUS_CLASS = {
  open: 'bg-destructive/10 text-destructive',
  'in-progress': 'bg-amber-500/10 text-amber-800',
  resolved: 'bg-emerald-500/10 text-emerald-800',
  closed: 'bg-muted text-muted-foreground'
}

export default function UserSupportSection({ userId }) {
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState([])
  const [deleteRequests, setDeleteRequests] = useState([])

  useEffect(() => {
    if (!userId) return
    let mounted = true

    queueMicrotask(() => {
      const load = async () => {
        setLoading(true)
        try {
          const [problemRes, deleteRes] = await Promise.allSettled([
            api.get('/api/problem'),
            api.get(`/api/delete/requests/${userId}`)
          ])
          if (!mounted) return
          setTickets(
            problemRes.status === 'fulfilled'
              ? asArray(problemRes.value.data).filter(item => matchesUserId(item.userId, userId))
              : []
          )
          setDeleteRequests(
            deleteRes.status === 'fulfilled' ? asArray(deleteRes.value.data) : []
          )
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

  return (
    <section className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div>
          <h3 className='text-lg font-semibold tracking-tight'>Support & risk</h3>
          <p className='text-sm text-muted-foreground'>
            Tickets and deletion requests for this account
          </p>
        </div>
        <Link href='/issues' className={buttonVariants({ variant: 'outline' })}>
          Support Tickets
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deletion requests</CardTitle>
          <CardDescription>
            Account removal requests (also tracked as tickets in Support)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className='h-20 w-full' />
          ) : deleteRequests.length === 0 ? (
            <p className='text-sm text-muted-foreground'>No deletion requests</p>
          ) : (
            <div className='space-y-3'>
              {deleteRequests.map(item => (
                <div key={item._id} className='rounded-xl border border-destructive/30 bg-destructive/5 p-3'>
                  <p className='text-sm font-medium'>{item.reason || 'No reason given'}</p>
                  <p className='mt-1 text-xs text-muted-foreground'>{formatDateTime(item.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Support tickets</CardTitle>
          <CardDescription>{tickets.length} ticket{tickets.length === 1 ? '' : 's'} from this user</CardDescription>
        </CardHeader>
        <CardContent className='p-0'>
          {loading ? (
            <div className='space-y-2 px-6 pb-6'>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className='h-10 w-full' />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <p className='px-6 py-8 text-center text-sm text-muted-foreground'>No tickets from this user</p>
          ) : (
            <div className='overflow-x-auto px-6 pb-6'>
              <div className='rounded-xl border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.slice(0, 12).map(ticket => (
                      <TableRow key={ticket._id}>
                        <TableCell className='font-medium'>
                          {ticket.type === 'support' ? 'Help Center' : ticket.type || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant='outline'
                            className={STATUS_CLASS[ticket.status] || undefined}
                          >
                            {ticket.status || '—'}
                          </Badge>
                        </TableCell>
                        <TableCell className='max-w-md truncate text-muted-foreground'>
                          {ticket.description || '—'}
                        </TableCell>
                        <TableCell>{formatDateTime(ticket.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
