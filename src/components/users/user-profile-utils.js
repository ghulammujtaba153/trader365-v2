export function settledValue(result) {
  return result?.status === 'fulfilled' ? result.value : null
}

export function asArray(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  if (Array.isArray(value?.notifications)) return value.notifications
  if (Array.isArray(value?.habits)) return value.habits
  if (Array.isArray(value?.results)) return value.results
  return []
}

export function matchesUserId(ref, userId) {
  if (!ref || !userId) return false
  const id = typeof ref === 'object' ? ref._id || ref.id : ref
  return String(id) === String(userId)
}

export function pickSnapshot(payload) {
  const current = Array.isArray(payload?.current)
    ? payload.current
    : Array.isArray(payload?.subscription)
      ? payload.subscription
      : payload?.subscription
        ? [payload.subscription]
        : []
  return current.find(item => !item?.pending) || current[0] || null
}
