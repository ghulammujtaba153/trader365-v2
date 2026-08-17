'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Loader2,
  Music2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX
} from 'lucide-react'

import { cn } from '@/lib/utils'

const RATES = [0.75, 1, 1.25, 1.5, 2]
const SKIP_SECONDS = 10

function formatClock(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

function ScrubBar({ value, max, onSeek, disabled }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0

  return (
    <div className='group relative flex h-7 items-center'>
      <div className='h-1.5 w-full overflow-hidden rounded-full bg-white/15'>
        <div
          className='h-full rounded-full bg-cyan-300 transition-[width] duration-75'
          style={{ width: `${pct}%` }}
        />
      </div>
      <div
        className='pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-md ring-4 ring-cyan-300/25 transition-transform group-hover:scale-110'
        style={{ left: `${pct}%` }}
      />
      <input
        type='range'
        min={0}
        max={max || 0}
        step={0.1}
        value={Number.isFinite(value) ? value : 0}
        disabled={disabled}
        aria-label='Seek'
        onChange={event => onSeek(Number(event.target.value))}
        className='absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed'
      />
    </div>
  )
}

export default function AudioPlayer({
  src,
  title,
  subtitle,
  artwork,
  active = true,
  className
}) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.9)
  const [muted, setMuted] = useState(false)
  const [rate, setRate] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const stop = useCallback(() => {
    const el = audioRef.current
    if (!el) return
    el.pause()
    el.currentTime = 0
    setPlaying(false)
    setCurrentTime(0)
  }, [])

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    el.volume = muted ? 0 : volume
  }, [volume, muted])

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    el.playbackRate = rate
  }, [rate])

  useEffect(() => {
    stop()
    setDuration(0)
    setError('')
    setLoading(Boolean(src))
  }, [src, stop])

  useEffect(() => {
    if (!active) stop()
  }, [active, stop])

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
    }
  }, [])

  const togglePlay = async () => {
    const el = audioRef.current
    if (!el || !src) return
    try {
      if (playing) {
        el.pause()
        return
      }
      setLoading(true)
      await el.play()
    } catch {
      setError('Could not play this audio.')
      setPlaying(false)
    } finally {
      setLoading(false)
    }
  }

  const seek = next => {
    const el = audioRef.current
    if (!el) return
    const time = Math.min(Math.max(0, next), duration || el.duration || 0)
    el.currentTime = time
    setCurrentTime(time)
  }

  const cycleRate = () => {
    const index = RATES.indexOf(rate)
    const next = RATES[(index + 1) % RATES.length]
    setRate(next)
  }

  if (!src) {
    return (
      <div
        className={cn(
          'rounded-2xl border border-white/10 bg-zinc-950 px-4 py-8 text-center text-sm text-zinc-400',
          className
        )}
      >
        No audio file is saved for this item.
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-zinc-950 text-white shadow-xl ring-1 ring-white/10',
        className
      )}
    >
      {artwork ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={artwork}
          alt=''
          className='pointer-events-none absolute inset-0 size-full scale-110 object-cover opacity-40 blur-2xl'
        />
      ) : null}
      <div className='absolute inset-0 bg-gradient-to-b from-zinc-950/40 via-zinc-950/75 to-zinc-950' />

      <audio
        ref={audioRef}
        src={src}
        preload='metadata'
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onWaiting={() => setLoading(true)}
        onPlaying={() => {
          setLoading(false)
          setError('')
        }}
        onLoadedMetadata={event => {
          setDuration(event.currentTarget.duration || 0)
          setLoading(false)
        }}
        onTimeUpdate={event => setCurrentTime(event.currentTarget.currentTime || 0)}
        onEnded={() => {
          setPlaying(false)
          setCurrentTime(0)
        }}
        onError={() => {
          setLoading(false)
          setPlaying(false)
          setError('This audio file could not be loaded.')
        }}
      />

      <div className='relative space-y-5 p-5 sm:p-6'>
        <div className='flex items-center gap-4'>
          <div
            className={cn(
              'relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-zinc-800 ring-4 ring-white/10 sm:size-24',
              playing && 'animate-spin [animation-duration:12s]'
            )}
          >
            {artwork ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={artwork} alt='' className='size-full object-cover' />
            ) : (
              <Music2 className='size-8 text-cyan-200' />
            )}
            <div className='absolute inset-[42%] rounded-full bg-zinc-950 ring-2 ring-white/20' />
          </div>

          <div className='min-w-0 flex-1'>
            <p className='text-[11px] font-semibold tracking-[0.18em] text-cyan-300/80 uppercase'>
              Now playing
            </p>
            <p className='mt-1 truncate text-lg font-semibold tracking-tight'>{title || 'Audio'}</p>
            {subtitle ? (
              <p className='mt-0.5 truncate text-sm text-zinc-400'>{subtitle}</p>
            ) : null}
          </div>

          <div className='hidden h-10 items-end gap-1 sm:flex' aria-hidden>
            {[0, 1, 2, 3, 4].map(index => (
              <span
                key={index}
                className='w-1 origin-bottom rounded-full bg-cyan-300'
                style={{
                  height: playing ? 28 : 8,
                  animation: playing ? `audio-eq 0.85s ease-in-out ${index * 0.12}s infinite` : 'none',
                  opacity: playing ? 1 : 0.45
                }}
              />
            ))}
          </div>
        </div>

        <div>
          <ScrubBar
            value={currentTime}
            max={duration}
            disabled={!duration}
            onSeek={seek}
          />
          <div className='mt-1 flex items-center justify-between text-[11px] font-medium tracking-wide text-zinc-400'>
            <span>{formatClock(currentTime)}</span>
            <span>{formatClock(duration)}</span>
          </div>
        </div>

        {error ? <p className='text-center text-xs text-red-300'>{error}</p> : null}

        <div className='flex items-center justify-center gap-3'>
          <button
            type='button'
            onClick={() => seek(currentTime - SKIP_SECONDS)}
            className='grid size-11 place-items-center rounded-full text-zinc-200 transition hover:bg-white/10'
            aria-label={`Back ${SKIP_SECONDS} seconds`}
          >
            <RotateCcw className='size-5' />
          </button>

          <button
            type='button'
            onClick={togglePlay}
            className='grid size-14 place-items-center rounded-full bg-white text-zinc-950 shadow-lg shadow-cyan-500/20 transition hover:scale-[1.03] active:scale-95'
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {loading ? (
              <Loader2 className='size-6 animate-spin' />
            ) : playing ? (
              <Pause className='size-6 fill-current' />
            ) : (
              <Play className='size-6 fill-current pl-0.5' />
            )}
          </button>

          <button
            type='button'
            onClick={() => seek(currentTime + SKIP_SECONDS)}
            className='grid size-11 place-items-center rounded-full text-zinc-200 transition hover:bg-white/10'
            aria-label={`Forward ${SKIP_SECONDS} seconds`}
          >
            <RotateCw className='size-5' />
          </button>
        </div>

        <div className='flex items-center gap-3'>
          <button
            type='button'
            onClick={() => setMuted(current => !current)}
            className='grid size-8 place-items-center rounded-full text-zinc-300 transition hover:bg-white/10'
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted || volume === 0 ? <VolumeX className='size-4' /> : <Volume2 className='size-4' />}
          </button>
          <div className='relative h-6 flex-1'>
            <div className='absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-white/15'>
              <div
                className='h-full rounded-full bg-white/70'
                style={{ width: `${(muted ? 0 : volume) * 100}%` }}
              />
            </div>
            <input
              type='range'
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              aria-label='Volume'
              onChange={event => {
                const next = Number(event.target.value)
                setVolume(next)
                if (next > 0) setMuted(false)
              }}
              className='absolute inset-0 z-10 w-full cursor-pointer appearance-none opacity-0'
            />
          </div>
          <button
            type='button'
            onClick={cycleRate}
            className='min-w-12 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-cyan-200 transition hover:bg-white/15'
            aria-label='Playback speed'
          >
            {rate === 1 ? '1x' : `${rate}x`}
          </button>
        </div>
      </div>
    </div>
  )
}
