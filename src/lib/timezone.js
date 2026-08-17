const FALLBACK_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland'
]

export function getBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export function listTimeZones() {
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function') {
      return Intl.supportedValuesOf('timeZone')
    }
  } catch {
    /* ignore */
  }
  return FALLBACK_TIMEZONES
}

/**
 * Interpret a `datetime-local` value (YYYY-MM-DDTHH:mm) as wall time in `timeZone`
 * and return the corresponding Date (UTC instant).
 */
export function zonedDateTimeToDate(dateTimeLocal, timeZone) {
  if (!dateTimeLocal) return null

  const match = String(dateTimeLocal).match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/
  )
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6] || 0)
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second)
  const zone = timeZone || 'UTC'

  const getOffsetMs = instant => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', {
        timeZone: zone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
      })
        .formatToParts(new Date(instant))
        .filter(part => part.type !== 'literal')
        .map(part => [part.type, part.value])
    )

    let asHour = Number(parts.hour)
    if (asHour === 24) asHour = 0

    const asUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      asHour,
      Number(parts.minute),
      Number(parts.second)
    )

    return asUtc - instant
  }

  let instant = utcGuess
  for (let i = 0; i < 2; i += 1) {
    instant = utcGuess - getOffsetMs(instant)
  }

  const date = new Date(instant)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatInTimeZone(date, timeZone, options = {}) {
  if (!date || Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timeZone || 'UTC',
    ...options
  }).format(date)
}
