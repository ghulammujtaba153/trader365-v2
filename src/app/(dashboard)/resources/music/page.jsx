'use client'

import { useEffect, useMemo, useState } from 'react'
import { Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/api'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TablePagination, usePagination } from '@/components/common/table-pagination'
import DashboardHeader from '@/components/layout/dashboard-header'
import MusicFormDialog from '@/components/resources/music-form-dialog'
import MusicViewDialog from '@/components/resources/music-view-dialog'
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

function TagsCell({ tags }) {
  const list = Array.isArray(tags) ? tags.filter(Boolean) : []
  if (!list.length) return <span className='text-muted-foreground'>—</span>

  return (
    <div className='flex max-w-56 flex-wrap items-center gap-1'>
      {list.slice(0, 2).map(tag => (
        <Badge key={tag} variant='outline'>
          {tag}
        </Badge>
      ))}
      {list.length > 2 ? <Badge variant='outline'>+{list.length - 2}</Badge> : null}
    </div>
  )
}

export default function MusicPage() {
  const [search, setSearch] = useState('')
  const [music, setMusic] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const fetchMusic = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true)
      const res = await api.get('/api/music')
      const list = res.data?.music || res.data || []
      setMusic((Array.isArray(list) ? list : []).map(item => ({ ...item, isPremium: Boolean(item.isPremium) })))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load music')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      fetchMusic()
    })
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return music
    return music.filter(
      item =>
        String(item.title || '')
          .toLowerCase()
          .includes(q) ||
        String(item.pillar || '')
          .toLowerCase()
          .includes(q) ||
        String(item.category || '')
          .toLowerCase()
          .includes(q)
    )
  }, [music, search])

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
      <DashboardHeader title='Music' description='Audio tracks available in the Discovery experience.' />

      <main className='flex-1 space-y-4 px-4 py-4 md:px-6 md:pb-6'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='relative w-full sm:max-w-sm'>
            <Search className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder='Search title, pillar, category…'
              className='pl-8'
            />
          </div>
          <div className='flex items-center gap-2'>
            <p className='text-sm text-muted-foreground'>
              {filtered.length} of {music.length} tracks
            </p>
            <Button
              onClick={() => {
                setSelected(null)
                setFormOpen(true)
              }}
            >
              <Plus className='size-4' />
              Add music
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
                {music.length === 0 ? 'No music yet.' : 'No matches for your search.'}
              </p>
            ) : (
              <>
                <div className='overflow-x-auto'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Thumbnail</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Pillar</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead>Access</TableHead>
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
                                alt={item.title || 'Track'}
                                className='size-12 rounded-md object-cover'
                              />
                            ) : (
                              <div className='flex size-12 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground'>
                                —
                              </div>
                            )}
                          </TableCell>
                          <TableCell className='max-w-56 truncate font-medium' title={item.title}>
                            {item.title || '—'}
                          </TableCell>
                          <TableCell className='text-muted-foreground'>{item.pillar || '—'}</TableCell>
                          <TableCell className='text-muted-foreground'>{item.category || '—'}</TableCell>
                          <TableCell>
                            <TagsCell tags={item.tags} />
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.isPremium ? 'default' : 'outline'}>
                              {item.isPremium ? 'Premium' : 'Free'}
                            </Badge>
                          </TableCell>
                          <TableCell className='text-right'>
                            <div className='inline-flex gap-1'>
                              <Button
                                variant='ghost'
                                size='icon-sm'
                                onClick={() => {
                                  setSelected(item)
                                  setViewOpen(true)
                                }}
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
                              <Button variant='ghost' size='icon-sm' onClick={() => setDeleteId(item._id)}>
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

      <MusicFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        resource={selected}
        onSaved={() => fetchMusic({ silent: true })}
      />

      <MusicViewDialog open={viewOpen} onOpenChange={setViewOpen} resource={selected} />

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={open => !open && setDeleteId(null)}
        title='Delete music?'
        description='This will permanently remove the track from the library.'
        confirmText='Delete'
        destructive
        onConfirm={async () => {
          await api.delete(`/api/music/${deleteId}`)
          await fetchMusic({ silent: true })
          return 'Music deleted successfully'
        }}
      />
    </>
  )
}
