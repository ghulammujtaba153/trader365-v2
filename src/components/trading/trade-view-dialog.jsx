'use client'

import { LineChart, TrendingDown, TrendingUp } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

function MetaField({ label, value }) {
  return (
    <div>
      <p className='mb-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
        {label}
      </p>
      <p className='text-sm font-semibold'>{value || '—'}</p>
    </div>
  )
}

const formatDate = value => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return '—'
  }
}

const formatDateTime = value => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return '—'
  }
}

const formatPrice = value => {
  if (value == null || value === '') return '—'
  const num = Number(value)
  return Number.isFinite(num)
    ? num.toLocaleString(undefined, { maximumFractionDigits: 4 })
    : String(value)
}

const isLong = direction => String(direction || '').toLowerCase().includes('long')
const isWin = result => {
  const r = String(result || '').toLowerCase()
  return r.includes('win') || r.includes('profit') || r === 'tp'
}

export default function TradeViewDialog({ open, onOpenChange, trade }) {
  if (!trade) return null

  const title = trade.stockName || trade.setupName || 'Trade details'
  const directionLong = isLong(trade.direction)
  const win = isWin(trade.result)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] flex-col overflow-hidden sm:max-w-2xl'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className='scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto pr-1'>
          <div
            className={cn(
              'relative overflow-hidden rounded-xl border bg-muted/40',
              trade.image ? 'min-h-52' : 'min-h-36'
            )}
          >
            {trade.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={trade.image}
                alt={title}
                className='absolute inset-0 h-full w-full object-cover'
              />
            ) : (
              <div className='absolute inset-0 grid place-items-center text-muted-foreground/40'>
                <LineChart className='size-16' />
              </div>
            )}
            <div className='absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent' />
            <div className='relative flex flex-wrap gap-1.5 p-4 pt-20'>
              {trade.tradeType ? <Badge>{trade.tradeType}</Badge> : null}
              {trade.direction ? (
                <Badge
                  variant='outline'
                  className={cn(
                    directionLong
                      ? 'border-emerald-500/40 text-emerald-700'
                      : 'border-red-500/40 text-red-700'
                  )}
                >
                  {directionLong ? (
                    <TrendingUp data-icon='inline-start' />
                  ) : (
                    <TrendingDown data-icon='inline-start' />
                  )}
                  {trade.direction}
                </Badge>
              ) : null}
              {trade.result ? (
                <Badge
                  variant={win ? 'default' : 'outline'}
                  className={win ? 'border-transparent bg-emerald-600 text-white' : undefined}
                >
                  {trade.result}
                </Badge>
              ) : null}
              {trade.emotionalState ? (
                <Badge variant='outline'>{trade.emotionalState}</Badge>
              ) : null}
            </div>
          </div>

          {trade.notes ? (
            <p className='text-sm leading-relaxed text-muted-foreground'>{trade.notes}</p>
          ) : null}

          <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
            <MetaField label='Trade date' value={formatDate(trade.tradeDate)} />
            <MetaField label='Stock' value={trade.stockName} />
            <MetaField label='Setup' value={trade.setupName} />
            <MetaField label='Quantity' value={trade.quantity} />
            <MetaField label='Entry' value={formatPrice(trade.entryPrice)} />
            <MetaField label='Exit' value={formatPrice(trade.exitPrice)} />
            <MetaField label='Actual exit' value={formatPrice(trade.actualExitPrice)} />
            <MetaField label='Stop loss' value={formatPrice(trade.stopLoss)} />
            <MetaField label='Take profit' value={formatPrice(trade.takeProfitTarget)} />
            <MetaField label='Result' value={trade.result} />
            <MetaField label='Emotion' value={trade.emotionalState} />
            <MetaField label='Logged' value={formatDateTime(trade.createdAt)} />
          </div>
        </div>

        <DialogFooter className='shrink-0'>
          <Button variant='outline' onClick={() => onOpenChange?.(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
