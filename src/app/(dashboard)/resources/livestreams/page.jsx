'use client'

import { useEffect, useMemo, useState } from 'react'
import { Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/api'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TablePagination, usePagination } from '@/components/common/table-pagination'
import LivestreamFormDialog from '@/components/resources/livestream-form-dialog'
import LivestreamViewDialog from '@/components/resources/livestream-view-dialog'
import DashboardHeader from '@/components/layout/dashboard-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'

const PLATFORM_LABELS = {
  youtube: 'YouTube',
  facebook: 'Facebook',
  instagram: 'Instagram',
  twitter: 'Twitter',
  twitch: 'Twitch',
  vimeo: 'Vimeo',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  rumble: 'Rumble'
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : '—'
}

function PlatformBadges({ platforms }) {
  if (!platforms?.length) {
    return <span className='text-muted-foreground'>—</span>
  }

  const visible = platforms.slice(0, 2)
  const extra = platforms.length - visible.length

  return (
    <div className='flex flex-wrap items-center gap-1'>
      {visible.map((platform, index) => {
        const label = PLATFORM_LABELS[platform.type] || platform.type
        if (platform.url) {
          return (
            <a
              key={`${platform.type}-${index}`}
              href={platform.url}
              target='_blank'
              rel='noopener noreferrer'
            >
              <Badge variant='outline' className='hover:bg-muted'>
                {label}
              </Badge>
            </a>
          )
        }
        return (
          <Badge key={`${platform.type}-${index}`} variant='outline'>
            {label}
          </Badge>
        )
      })}
      {extra > 0 ? <Badge variant='secondary'>+{extra}</Badge> : null}
    </div>
  )
}

export default function LivestreamsPage() {
  const [search, setSearch] = useState('')
  const [livestreams, setLivestreams] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [viewItem, setViewItem] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const fetchLivestreams = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true)
      const res = await api.get('/api/livestream/all')
      setLivestreams(res.data.livestreams || [])
    } catch {
      toast.error('Failed to load livestreams')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      fetchLivestreams()
    })
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return livestreams
    return livestreams.filter(item => item.title?.toLowerCase().includes(q))
  }, [livestreams, search])

  const {
    page,
    pageSize,
    totalItems,
    totalPages,
    from,
    to,
    paginatedItems,
    goToPage,
    changePageSize
  } = usePagination(filtered, 10)

  return (
    <>
      <DashboardHeader
        title='Live Streams'
        description='Upcoming and past live sessions.'
      />

      <main className='flex-1 space-y-4 px-4 py-4 md:px-6 md:pb-6'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='relative w-full sm:max-w-sm'>
            <Search className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder='Search title…'
              className='pl-8'
            />
          </div>
          <div className='flex items-center gap-2'>
            <p className='text-sm text-muted-foreground'>
              {filtered.length} of {livestreams.length} livestreams
            </p>
            <Button
              onClick={() => {
                setSelected(null)
                setFormOpen(true)
              }}
            >
              <Plus className='size-4' />
              Add livestream
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className='p-0'>
            {loading ? (
              <div className='space-y-3 p-4'>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className='h-10 w-full' />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className='py-12 text-center text-sm text-muted-foreground'>
                {livestreams.length === 0 ? 'No livestreams yet.' : 'No matches for your search.'}
              </p>
            ) : (
              <>
                <div className='overflow-x-auto'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='w-20'>Thumbnail</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Platforms</TableHead>
                        <TableHead>Start</TableHead>
                        <TableHead>End</TableHead>
                        <TableHead>Host</TableHead>
                        <TableHead className='text-right'>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedItems.map(item => (
                        <TableRow key={item._id}>
                          <TableCell>
                            {item.thumbnail ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.thumbnail}
                                alt=''
                                className='h-10 w-14 rounded object-cover'
                              />
                            ) : (
                              <div className='flex h-10 w-14 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground'>
                                N/A
                              </div>
                            )}
                          </TableCell>
                          <TableCell className='max-w-48 truncate font-medium' title={item.title}>
                            {item.title || '—'}
                          </TableCell>
                          <TableCell>
                            <PlatformBadges platforms={item.platform} />
                          </TableCell>
                          <TableCell className='whitespace-nowrap text-muted-foreground'>
                            {formatDateTime(item.startDateTime)}
                          </TableCell>
                          <TableCell className='whitespace-nowrap text-muted-foreground'>
                            {formatDateTime(item.endDateTime)}
                          </TableCell>
                          <TableCell className='max-w-36 truncate text-muted-foreground'>
                            {item.user?.name || item.user?.email || 'Unknown'}
                          </TableCell>
                          <TableCell className='text-right'>
                            <div className='inline-flex gap-1'>
                              <Button
                                variant='ghost'
                                size='icon-sm'
                                onClick={() => setViewItem(item)}
                              >
                                <Eye className='size-4' />
                              </Button>
                              <Button
                                variant='ghost'
                                size='icon-sm'
                                onClick={() => {
                                  setSelected(item)
                                  setFormOpen(true)
                                }}
                              >
                                <Pencil className='size-4' />
                              </Button>
                              <Button
                                variant='ghost'
                                size='icon-sm'
                                onClick={() => setDeleteId(item._id)}
                              >
                                <Trash2 className='size-4 text-destructive' />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <TablePagination
                  page={page}
                  pageSize={pageSize}
                  totalItems={totalItems}
                  totalPages={totalPages}
                  from={from}
                  to={to}
                  onPageChange={goToPage}
                  onPageSizeChange={changePageSize}
                />
              </>
            )}
          </CardContent>
        </Card>
      </main>

      <LivestreamFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        livestream={selected}
        onSaved={() => fetchLivestreams({ silent: true })}
      />

      <LivestreamViewDialog
        open={Boolean(viewItem)}
        onOpenChange={open => !open && setViewItem(null)}
        livestream={viewItem}
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={open => !open && setDeleteId(null)}
        title='Delete livestream?'
        description='Are you sure you want to delete this livestream?'
        confirmText='Delete'
        destructive
        onConfirm={async () => {
          await api.delete(`/api/livestream/delete/${deleteId}`)
          await fetchLivestreams({ silent: true })
          return 'Livestream deleted successfully'
        }}
      />
    </>
  )
}
