import { CHANNEL_META, channelKeyFromApi } from '../../lib/activityPresentation'

export function scheduledDayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(d)
  target.setHours(0, 0, 0, 0)
  const diffMs = target.getTime() - today.getTime()
  const diffDays = Math.round(diffMs / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function scheduledTimeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function scheduledChannelBadgeLabel(raw: string): string {
  const lower = raw.trim().toLowerCase()
  if (lower === 'meeting' || lower === '1:1' || lower === '1:1 meeting') {
    return '1:1'
  }
  const key = channelKeyFromApi(lower)
  if (key === 'meeting') return '1:1'
  return CHANNEL_META[key].label
}

export function scheduledChannelBadgeClasses(raw: string): string {
  const lower = raw.trim().toLowerCase()
  const key =
    lower === 'meeting' || lower === '1:1' || lower === '1:1 meeting'
      ? 'meeting'
      : channelKeyFromApi(lower)
  return CHANNEL_META[key].className
}
