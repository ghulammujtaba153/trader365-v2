'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { Activity, TrendingUp, Users, Wallet } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/auth-context'

const STATS = [
  { label: 'Active users', value: '—', hint: 'Connect users API next', icon: Users },
  { label: 'Sessions today', value: '—', hint: 'Analytics coming soon', icon: Activity },
  { label: 'Trades tracked', value: '—', hint: 'Trading module next', icon: TrendingUp },
  { label: 'Revenue', value: '—', hint: 'Billing module later', icon: Wallet }
]

const SAMPLE_ACTIVITY = [
  { day: 'Mon', value: 42 },
  { day: 'Tue', value: 58 },
  { day: 'Wed', value: 51 },
  { day: 'Thu', value: 74 },
  { day: 'Fri', value: 66 },
  { day: 'Sat', value: 39 },
  { day: 'Sun', value: 47 }
]

export default function HomeOverview() {
  const { user } = useAuth()

  return (
    <div className='space-y-6'>
      <Card className='border-border/70 bg-gradient-to-br from-background to-muted/40'>
        <CardHeader>
          <div className='flex flex-wrap items-center gap-2'>
            <CardTitle className='text-xl'>Welcome back{user?.name ? `, ${user.name}` : ''}</CardTitle>
            <Badge variant='secondary'>Admin</Badge>
            {user?.isSuperAdmin ? <Badge>Super-admin</Badge> : null}
          </div>
          <CardDescription>
            This is the new Trader365 dashboard shell. Auth, sidebar, and home are ready — modules
            can be migrated next.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        {STATS.map(stat => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>{stat.label}</CardTitle>
                <Icon className='size-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-semibold'>{stat.value}</div>
                <p className='text-xs text-muted-foreground'>{stat.hint}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity preview</CardTitle>
          <CardDescription>Sample chart using Recharts — replace with live metrics later.</CardDescription>
        </CardHeader>
        <CardContent className='h-72'>
          <ResponsiveContainer width='100%' height='100%'>
            <AreaChart data={SAMPLE_ACTIVITY}>
              <defs>
                <linearGradient id='activityFill' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='5%' stopColor='currentColor' stopOpacity={0.25} />
                  <stop offset='95%' stopColor='currentColor' stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray='3 3' className='stroke-border' />
              <XAxis dataKey='day' tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={28} />
              <Tooltip />
              <Area
                type='monotone'
                dataKey='value'
                stroke='currentColor'
                fill='url(#activityFill)'
                className='text-foreground'
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
