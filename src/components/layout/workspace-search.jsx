'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

import { useAuth } from '@/contexts/auth-context'
import { getAccessiblePages, isNavLinkActive } from '@/lib/dashboard-nav'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

export default function WorkspaceSearch() {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const rootRef = useRef(null)

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const pages = useMemo(() => getAccessiblePages(user), [user])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return pages
    return pages.filter(
      page =>
        page.label.toLowerCase().includes(q) ||
        page.group.toLowerCase().includes(q)
    )
  }, [pages, query])

  const grouped = useMemo(() => {
    const groups = []
    const byName = new Map()
    for (const page of filtered) {
      if (!byName.has(page.group)) {
        const group = { name: page.group, items: [] }
        byName.set(page.group, group)
        groups.push(group)
      }
      byName.get(page.group).items.push(page)
    }
    return groups
  }, [filtered])

  useEffect(() => {
    setActiveIndex(0)
  }, [query, open])

  useEffect(() => {
    setOpen(false)
    setQuery('')
  }, [pathname])

  useEffect(() => {
    const onPointerDown = event => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  const close = () => {
    setOpen(false)
    setQuery('')
  }

  const onKeyDown = event => {
    if (!open && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      setOpen(true)
      return
    }

    if (event.key === 'Escape') {
      close()
      event.currentTarget.blur()
      return
    }

    if (!filtered.length) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex(index => (index + 1) % filtered.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex(index => (index - 1 + filtered.length) % filtered.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const href = filtered[activeIndex]?.href
      if (href) {
        close()
        if (href !== pathname) router.push(href)
      }
    }
  }

  let optionIndex = -1

  return (
    <div ref={rootRef} className='relative w-full max-w-sm'>
      <Search className='pointer-events-none absolute top-1/2 left-2.5 z-10 size-4 -translate-y-1/2 text-muted-foreground' />
      <Input
        value={query}
        onChange={event => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder='Search workspace…'
        className='h-8 border-border/80 bg-muted/40 pl-8 shadow-none'
        role='combobox'
        aria-expanded={open}
        aria-autocomplete='list'
        aria-controls='workspace-search-list'
      />

      {open ? (
        <div
          id='workspace-search-list'
          role='listbox'
          className='absolute top-[calc(100%+8px)] right-0 z-50 w-[min(100vw-2rem,24rem)] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg'
        >
          <div className='border-b border-border px-3 py-2'>
            <p className='text-xs font-medium text-muted-foreground'>
              {query.trim()
                ? `${filtered.length} matching page${filtered.length === 1 ? '' : 's'}`
                : 'All pages you can access'}
            </p>
          </div>
          <div className='max-h-[min(70vh,28rem)] overflow-y-auto p-1'>
            {grouped.length ? (
              grouped.map(group => (
                <div key={group.name} className='mb-1 last:mb-0'>
                  <p className='px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                    {group.name}
                  </p>
                  {group.items.map(page => {
                    optionIndex += 1
                    const index = optionIndex
                    const Icon = page.icon
                    const active = index === activeIndex
                    const current = isNavLinkActive(pathname, page.href)

                    return (
                      <Link
                        key={page.href}
                        href={page.href}
                        role='option'
                        aria-selected={active}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={close}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                          active ? 'bg-muted text-foreground' : 'text-foreground hover:bg-muted/70'
                        )}
                      >
                        <Icon className='size-4 shrink-0 text-muted-foreground' />
                        <span className='min-w-0 flex-1'>
                          <span className='block truncate font-medium'>{page.label}</span>
                        </span>
                        {current ? (
                          <span className='shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground'>
                            Current
                          </span>
                        ) : null}
                      </Link>
                    )
                  })}
                </div>
              ))
            ) : (
              <p className='px-3 py-6 text-center text-sm text-muted-foreground'>
                No matching pages
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
