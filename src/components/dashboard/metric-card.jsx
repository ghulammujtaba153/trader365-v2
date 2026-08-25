'use client'

import { Minus, TrendingDown, TrendingUp } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatNumber, formatTime } from '@/lib/format'

export default function MetricCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon: Icon,
  format = 'auto',
  accentClass = 'bg-muted/50 text-foreground/70 ring-1 ring-border/70'
}) {
  let displayValue = value
  const shouldFormatTime =
    format === 'time' ||
    (format === 'auto' && typeof value === 'number' && String(title || '').toLowerCase().includes('time'))

  if (shouldFormatTime) displayValue = formatTime(value)
  else if (format === 'number' || (format === 'auto' && typeof value === 'number'))
    displayValue = formatNumber(value)
  else if (format === 'raw') displayValue = value
  else if (value == null || value === '') displayValue = '0'

  const showTrend = trend !== undefined && trend !== null
  const TrendIcon = !showTrend ? null : trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus
  const trendClass = trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-600' : 'text-muted-foreground'

  return (
    <Card className='h-full border-0 bg-card shadow-none ring-1 ring-border/80'>
      <CardContent className='p-5'>
        <div className='flex items-start justify-between gap-3'>
          <div className='min-w-0 flex-1'>
            <p className='text-sm font-normal text-muted-foreground'>{title}</p>
            <p className='mt-2 text-[1.75rem] font-semibold leading-none tracking-tight text-foreground'>
              {displayValue}
            </p>
            {subtitle ? (
              <p className='mt-2.5 text-xs leading-relaxed text-muted-foreground'>{subtitle}</p>
            ) : null}
            {showTrend && TrendIcon ? (
              <div className={cn('mt-2 flex items-center gap-1 text-xs font-medium', trendClass)}>
                <TrendIcon className='size-3.5' />
                {trend > 0 ? '+' : ''}
                {trend}%{trendValue ? ` ${trendValue}` : ''}
              </div>
            ) : null}
          </div>
          {Icon ? (
            <div
              className={cn(
                'grid size-10 shrink-0 place-items-center rounded-full',
                accentClass
              )}
            >
              <Icon className='size-[18px] stroke-[1.75]' />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
