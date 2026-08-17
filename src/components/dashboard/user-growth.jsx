'use client'

import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'

import api from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartCardSkeleton } from '@/components/dashboard/skeletons'

export default function UserGrowth({ dateRange }) {
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [granularity, setGranularity] = useState('day')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const fetchGrowth = async () => {
      setLoading(true)
      try {
        const params = {}
        if (dateRange?.from) params.from = dateRange.from
        if (dateRange?.to) params.to = dateRange.to
        const res = await api.get('/api/dashboard/user/growth', { params })
        const payload = res.data
        if (!mounted) return

        if (Array.isArray(payload) && payload.length) {
          const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].slice(0, payload.length)
          setRows(payload.map((value, i) => ({ label: labels[i], value })))
          setTotal(payload.reduce((s, n) => s + n, 0))
        } else if (payload && Array.isArray(payload.data)) {
          setRows((payload.labels || []).map((label, i) => ({ label, value: payload.data[i] || 0 })))
          setTotal(payload.total ?? payload.data.reduce((s, n) => s + n, 0))
          setGranularity(payload.granularity || 'day')
        } else {
          setRows([])
          setTotal(0)
        }
      } catch (err) {
        if (mounted) toast.error(err.response?.data?.message || err.message)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchGrowth()
    return () => {
      mounted = false
    }
  }, [dateRange?.from, dateRange?.to])

  if (loading) return <ChartCardSkeleton height={280} />

  return (
    <Card className='h-full'>
      <CardHeader className='flex flex-row items-start justify-between gap-3 space-y-0'>
        <div>
          <CardTitle>User growth</CardTitle>
          <CardDescription>
            {granularity === 'week'
              ? 'New signups by week in selected range'
              : 'New signups in selected range'}
          </CardDescription>
        </div>
        <Badge>{total} new</Badge>
      </CardHeader>
      <CardContent className='h-72'>
        {total === 0 ? (
          <div className='grid h-full place-items-center rounded-xl border border-dashed bg-muted/30 px-4 text-center'>
            <div>
              <p className='font-semibold'>No new users in this period</p>
              <p className='mt-1 text-sm text-muted-foreground'>Try a wider date range.</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray='3 3' className='stroke-border' />
              <XAxis dataKey='label' tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
              <Tooltip formatter={value => [`${value} new`, 'Users']} />
              <Bar dataKey='value' name='New users' fill='#171717' radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
