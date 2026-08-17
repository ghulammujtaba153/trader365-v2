'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ChevronDown,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { filterNavItems, isNavLinkActive } from '@/lib/dashboard-nav'
import { useAuth } from '@/contexts/auth-context'
import { useSidebar } from '@/contexts/sidebar-context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

function isLinkActive(pathname, href) {
  return isNavLinkActive(pathname, href)
}

function isGroupActive(pathname, children = []) {
  return children.some(child => isLinkActive(pathname, child.href))
}

function NavLinkItem({ item, onNavigate }) {
  const pathname = usePathname()
  const Icon = item.icon
  const active = isLinkActive(pathname, item.href)

  if (item.soon) {
    return (
      <div className='flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground/70'>
        <Icon className='size-4 shrink-0' />
        <span className='flex-1 font-medium'>{item.label}</span>
        <Badge variant='outline' className='h-5 border-dashed px-1.5 text-[10px]'>
          Soon
        </Badge>
      </div>
    )
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors duration-150',
        active
          ? 'bg-foreground font-semibold text-background'
          : 'text-sidebar-foreground/75 hover:bg-black/[0.04] hover:text-foreground'
      )}
    >
      <Icon className='size-4 shrink-0' strokeWidth={active ? 2.25 : 2} />
      <span className='flex-1'>{item.label}</span>
      {active ? <span className='size-1.5 rounded-full bg-background/80' aria-hidden /> : null}
    </Link>
  )
}

function NavGroup({ item, onNavigate }) {
  const pathname = usePathname()
  const groupActive = isGroupActive(pathname, item.children)
  const [open, setOpen] = useState(groupActive)
  const Icon = item.icon

  useEffect(() => {
    if (groupActive) setOpen(true)
  }, [groupActive])

  return (
    <div className='space-y-0.5'>
      <button
        type='button'
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors',
          groupActive
            ? 'bg-black/[0.04] font-semibold text-foreground'
            : 'text-sidebar-foreground/75 hover:bg-black/[0.04] hover:text-foreground'
        )}
      >
        <Icon className='size-4 shrink-0' />
        <span className='flex-1 text-left'>{item.label}</span>
        <ChevronDown
          className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      {open ? (
        <div className='ml-3 space-y-0.5 border-l border-border pl-2'>
          {item.children.map(child => (
            <NavLinkItem key={child.href} item={child} onNavigate={onNavigate} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function NavLinks({ onNavigate }) {
  const { user } = useAuth()
  const items = filterNavItems(user)

  return (
    <nav className='flex flex-col gap-0.5 px-3'>
      {items.map(item => {
        if (item.type === 'group') {
          return <NavGroup key={item.id} item={item} onNavigate={onNavigate} />
        }

        return <NavLinkItem key={item.href} item={item} onNavigate={onNavigate} />
      })}
    </nav>
  )
}

function SidebarFooter() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const initials = (user?.name || user?.email || 'A')
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const handleLogout = () => {
    logout()
    router.replace('/login')
  }

  return (
    <div className='space-y-2 p-3'>
      <div className='rounded-2xl border border-border/80 bg-background/80 p-3 shadow-sm backdrop-blur'>
        <div className='flex items-center gap-3'>
          <Avatar className='size-9 ring-2 ring-border ring-offset-2 ring-offset-background'>
            <AvatarFallback className='bg-foreground font-semibold text-background'>{initials}</AvatarFallback>
          </Avatar>
          <div className='min-w-0 flex-1'>
            <p className='truncate text-sm font-semibold'>{user?.name || 'Admin'}</p>
            <p className='truncate text-xs text-muted-foreground'>
              {user?.isSuperAdmin ? 'Super-admin' : user?.adminLabel || user?.email}
            </p>
          </div>
        </div>
        <Button
          variant='outline'
          onClick={handleLogout}
          className='mt-3 w-full justify-start gap-2 border-dashed text-muted-foreground hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive'
        >
          <LogOut className='size-4' />
          Log out
        </Button>
      </div>
    </div>
  )
}

function SidebarBody({ onNavigate, collapsed = false }) {
  const { setOpen } = useSidebar()

  return (
    <div className='relative flex h-full flex-col overflow-hidden bg-gradient-to-b from-zinc-50 via-sidebar to-zinc-100/80'>
      <div className='pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/[0.03] to-transparent' />

      <div
        className={cn(
          'relative flex h-14 shrink-0 items-center border-b border-border',
          collapsed ? 'justify-center px-2' : 'gap-3 px-4'
        )}
      >
        {collapsed ? (
          <button
            type='button'
            onClick={() => setOpen?.(true)}
            className='rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            title='Expand sidebar'
            aria-label='Expand sidebar'
          >
            <img
              src='/logo.png'
              alt='Trader 365'
              className='size-9 shrink-0 rounded-xl object-contain ring-1 ring-border'
            />
          </button>
        ) : (
          <>
            <img
              src='/logo.png'
              alt='Trader 365'
              className='size-9 shrink-0 rounded-xl object-contain ring-1 ring-border'
            />
            <div className='min-w-0'>
              <p className='truncate text-sm font-semibold tracking-tight'>Trader 365</p>
              <p className='truncate text-[11px] text-muted-foreground'>Control center</p>
            </div>
          </>
        )}
      </div>

      {!collapsed ? (
        <>
          <div className='scrollbar-thin relative flex-1 overflow-y-auto py-4'>
            <NavLinks onNavigate={onNavigate} />
          </div>

          <div className='relative border-t border-border bg-background/50 backdrop-blur-sm'>
            <SidebarFooter />
          </div>
        </>
      ) : (
        <div className='relative flex flex-1 flex-col items-center gap-2 px-2 py-4'>
          <CollapsedNav onNavigate={onNavigate} />
        </div>
      )}
    </div>
  )
}

function CollapsedNav({ onNavigate }) {
  const pathname = usePathname()
  const { setOpen } = useSidebar()
  const { user } = useAuth()
  const items = filterNavItems(user)

  return (
    <nav className='flex w-full flex-col items-center gap-1'>
      {items.map(item => {
        if (item.type === 'group') {
          const Icon = item.icon
          const active = isGroupActive(pathname, item.children)
          const firstHref = item.children[0]?.href
          if (!firstHref) return null

          return (
            <Link
              key={item.id}
              href={firstHref}
              title={item.label}
              onClick={() => {
                onNavigate?.()
                setOpen(true)
              }}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex size-10 items-center justify-center rounded-lg transition-colors',
                active
                  ? 'bg-foreground text-background'
                  : 'text-sidebar-foreground/75 hover:bg-black/[0.04] hover:text-foreground'
              )}
            >
              <Icon className='size-4' strokeWidth={active ? 2.25 : 2} />
            </Link>
          )
        }

        const Icon = item.icon
        const active = isLinkActive(pathname, item.href)

        if (item.soon) {
          return (
            <button
              key={item.href}
              type='button'
              title={`${item.label} (Soon)`}
              className='flex size-10 items-center justify-center rounded-lg text-muted-foreground/50'
              disabled
            >
              <Icon className='size-4' />
            </button>
          )
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex size-10 items-center justify-center rounded-lg transition-colors',
              active
                ? 'bg-foreground text-background'
                : 'text-sidebar-foreground/75 hover:bg-black/[0.04] hover:text-foreground'
            )}
          >
            <Icon className='size-4' strokeWidth={active ? 2.25 : 2} />
          </Link>
        )
      })}
    </nav>
  )
}

export function AppSidebar() {
  const { open } = useSidebar()

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 overflow-hidden border-r border-border text-sidebar-foreground transition-[width] duration-200 ease-in-out md:flex md:flex-col',
        open
          ? 'w-72 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.12)]'
          : 'w-[4.5rem]'
      )}
      aria-label={open ? 'Expanded sidebar' : 'Collapsed sidebar'}
    >
      <div className={cn('flex h-full flex-col', open ? 'w-72' : 'w-[4.5rem]')}>
        <SidebarBody collapsed={!open} />
      </div>
    </aside>
  )
}

export function SidebarToggle() {
  const { open, toggle } = useSidebar()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <Button
        variant='outline'
        size='icon-sm'
        className='hidden border-border/80 bg-background/80 shadow-sm md:inline-flex'
        onClick={toggle}
        aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {open ? <PanelLeftClose /> : <PanelLeftOpen />}
      </Button>

      <Button
        variant='outline'
        size='icon-sm'
        className='border-border/80 bg-background/80 shadow-sm md:hidden'
        onClick={() => setMobileOpen(true)}
        aria-label='Open menu'
      >
        <Menu />
      </Button>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side='left' className='w-80 p-0'>
          <SheetHeader className='sr-only'>
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <SidebarBody onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  )
}
