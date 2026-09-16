export function formatTime(seconds) {
  const total = Math.max(0, Number(seconds) || 0)
  if (total < 1) return '0s'

  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = Math.round(total % 60)

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }
  if (minutes > 0) {
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`
  }
  return `${secs}s`
}

export function formatNumber(value) {
  return Number(value || 0).toLocaleString()
}

export function parseDate(value) {
  if (value == null || value === '') return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value < 1e12 ? value * 1000 : value
    const date = new Date(ms)
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (typeof value === 'object') {
    if (value.$date) return parseDate(value.$date)
    if (typeof value.seconds === 'number') return parseDate(value.seconds * 1000)
    if (typeof value._seconds === 'number') return parseDate(value._seconds * 1000)
    if (typeof value.toDate === 'function') {
      try {
        return parseDate(value.toDate())
      } catch {
        return null
      }
    }
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function dateFromObjectId(id) {
  const raw = typeof id === 'object' && id ? id.$oid || id._id || id.id || '' : id
  const hex = String(raw || '')
  if (!/^[a-fA-F0-9]{24}$/.test(hex)) return null
  const date = new Date(parseInt(hex.slice(0, 8), 16) * 1000)
  return Number.isNaN(date.getTime()) ? null : date
}

export function pickDate(...values) {
  for (const value of values) {
    const parsed = parseDate(value)
    if (parsed) return parsed
  }
  return null
}

export function recordCreatedAt(record) {
  if (!record) return null
  return pickDate(
    record.createdAt,
    record.created_at,
    record.created,
    dateFromObjectId(record._id),
    dateFromObjectId(record.id)
  )
}

export function recordUpdatedAt(record) {
  if (!record) return null
  return pickDate(record.updatedAt, record.updated_at, record.updated, recordCreatedAt(record))
}

export function formatDate(value) {
  const date = parseDate(value)
  return date ? date.toLocaleDateString() : '—'
}

export function formatDateTime(value) {
  const date = parseDate(value)
  return date ? date.toLocaleString() : '—'
}

export function formatRelativeTime(value) {
  const date = parseDate(value)
  if (!date) return 'Never'

  const diffMs = Date.now() - date.getTime()
  if (diffMs < 0) return 'Just now'

  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`

  return `${Math.floor(months / 12)}y ago`
}

export function formatWaitingAge(value) {
  const date = parseDate(value)
  if (!date) return '—'

  const diffMs = Math.max(0, Date.now() - date.getTime())
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 60) return `${Math.max(1, minutes)}m`

  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `${hours}h`

  const days = Math.floor(hours / 24)
  return `${days}d`
}

export function formatMoney(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'
  return num.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

export function formatYesNo(value) {
  if (value == null) return '—'
  return value ? 'Yes' : 'No'
}

export function formatLabel(value) {
  if (value == null || value === '') return '—'
  if (typeof value !== 'string') return String(value)
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/[_-]+/g, ' ')
}

export function formatRoleLabel(role) {
  if (role === 'editor') return 'Instructor'
  return formatLabel(role)
}

const SCREEN_NAME_MAP = {
  bot: 'Trade Sense AI',
  chat: 'Trade Sense AI',
  chatbot: 'Trade Sense AI',
  coach: 'Trade Sense AI',
  aicoach: 'Trade Sense AI',
  tradesense: 'Trade Sense AI',
  tradesenseai: 'Trade Sense AI',
  tradeseneai: 'Trade Sense AI'
}

export function formatScreenName(value) {
  const raw = String(value || '').trim()
  if (!raw) return 'Unknown'
  const key = raw.toLowerCase().replace(/[\s_-]+/g, '')
  return SCREEN_NAME_MAP[key] || formatLabel(raw)
}

const TOKEN_OBJECT_RE = /\{\s*"token"\s*:\s*((?:"(?:\\.|[^"\\])*")|null)\s*\}/g
const SSE_NOISE_RE =
  /\{"status"\s*:\s*"[^"]*"\s*\}|\{"quickReplies"\s*:\s*\[[^\]]*\]\s*\}|\{"meta"\s*:\s*\{[^}]*\}\s*\}/g

export function normalizeUserMessage(value) {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'object') {
    if (typeof value.message === 'string') return value.message.trim()
    if (typeof value.text === 'string') return value.text.trim()
  }
  return ''
}

function extractTokenStrings(source) {
  const tokens = []
  TOKEN_OBJECT_RE.lastIndex = 0
  let match
  while ((match = TOKEN_OBJECT_RE.exec(source)) !== null) {
    try {
      const value = JSON.parse(match[1])
      if (typeof value === 'string') tokens.push(value)
    } catch {
      // skip malformed token
    }
  }
  return tokens
}

function parseSseJsonChunk(chunk) {
  try {
    return JSON.parse(chunk)
  } catch {
    return null
  }
}

export function decodeBotResponse(raw) {
  if (raw == null) return ''
  const text = String(raw)
  if (!text.trim()) return ''

  const chunks = text.includes('data:')
    ? text
        .split(/\r?\n/)
        .map(line => {
          const trimmed = line.trim()
          return trimmed.startsWith('data:') ? trimmed.slice(5).trim() : trimmed
        })
        .filter(line => line && line !== '[DONE]')
    : [text]

  let assembled = ''
  for (const chunk of chunks) {
    if (!chunk) continue
    const parsed = parseSseJsonChunk(chunk)
    if (!parsed || typeof parsed !== 'object') {
      if (!chunk.trimStart().startsWith('{')) assembled += chunk
      continue
    }
    if (typeof parsed.disclaimer === 'string') {
      assembled = `${parsed.disclaimer}\n\n`
      continue
    }
    if (parsed.replace && typeof parsed.token === 'string') {
      assembled = parsed.token
      continue
    }
    if (typeof parsed.token === 'string') {
      assembled += parsed.token
    }
  }

  if (assembled.trim()) return assembled.trim()

  const withoutNoise = text.replace(SSE_NOISE_RE, '')
  const tokens = extractTokenStrings(withoutNoise)
  if (tokens.length) return tokens.join('').trim()

  const plain = withoutNoise.replace(TOKEN_OBJECT_RE, '').trim()
  if (plain && !plain.startsWith('{')) return plain

  return text.replace(SSE_NOISE_RE, '').replace(TOKEN_OBJECT_RE, '').trim()
}
