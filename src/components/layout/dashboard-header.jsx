'use client'

import { useRouter } from 'next/navigation'
import { Bell, LogOut } from 'lucide-react'

import { useAuth } from '@/contexts/auth-context'
import { SidebarToggle } from '@/components/layout/app-sidebar'
import WorkspaceSearch from '@/components/layout/workspace-search'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

export default function DashboardHeader({ title, description }) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const initials = (user?.name || user?.email || 'A')
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <>
      <header className='sticky top-0 z-10 border-b border-border/80 bg-background/80 backdrop-blur-xl'>
        <div className='flex h-14 items-center gap-3 px-4 md:gap-4 md:px-6'>
          <SidebarToggle />

          <div className='hidden h-6 w-px bg-border/80 sm:block' />

          <div className='min-w-0 flex-1'>
            <div className='flex items-center gap-2'>
              <p className='hidden text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground sm:block'>
                Dashboard
              </p>
              <span className='hidden text-muted-foreground/50 sm:inline'>/</span>
              <h1 className='truncate text-base font-semibold tracking-tight md:text-lg'>{title}</h1>
            </div>
          </div>

          <div className='hidden w-full max-w-xs md:block'>
            <WorkspaceSearch />
          </div>

          <Button
            variant='outline'
            size='icon-sm'
            className='relative border-border/80 bg-background/80 shadow-sm'
            aria-label='Notifications'
          >
            <Bell />
            <span className='absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary' />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant='outline'
                  className='h-8 gap-2 border-border/80 bg-background/80 px-1.5 pr-2 shadow-sm'
                />
              }
            >
              <Avatar className='size-6'>
                <AvatarFallback className='bg-foreground text-[10px] font-semibold text-background'>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className='hidden max-w-28 truncate text-xs font-medium md:inline'>
                {user?.name || 'Admin'}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-56'>
              <DropdownMenuLabel className='space-y-0.5'>
                <p className='text-sm font-medium text-foreground'>{user?.name || 'Admin'}</p>
                <p className='text-xs font-normal text-muted-foreground'>{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  logout()
                  router.replace('/login')
                }}
              >
                <LogOut className='size-4' />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {description ? (
        <div className='px-4 pt-4 md:px-6'>
          <p className='text-sm text-muted-foreground'>{description}</p>
        </div>
      ) : null}
    </>
  )
}
