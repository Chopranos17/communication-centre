/** Shared status/channel pills for Recent Activity widget and Activity Command Center. */

export type ActivityChannelKey = 'email' | 'sms' | 'whatsapp' | 'meeting'

export type ActivityStatusKey = 'engaged' | 'pending' | 'unresponsive'

/** 6px status dots in Activity Command Center table */
export const ACTIVITY_STATUS_DOT: Record<ActivityStatusKey, string> = {
  engaged: '#1D9E75',
  pending: '#BA7517',
  unresponsive: '#E24B4A',
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase()
}

/** Strip HTML tags and normalize whitespace for plain-text previews (email bodies, etc.). */
export function stripHtmlTags(raw: string): string {
  const withoutTags = raw.replace(/<[^>]*>/g, ' ')
  return withoutTags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim()
}

export function truncatePreview(text: string, max = 120): string {
  const t = stripHtmlTags(text)
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

export const STATUS_STYLES: Record<
  ActivityStatusKey,
  { label: string; className: string }
> = {
  engaged: {
    label: 'Engaged',
    className: 'bg-[#E5F6EE] text-[#1a7f4b]',
  },
  pending: {
    label: 'Pending',
    className: 'bg-[#FFF7E5] text-[#b45309]',
  },
  unresponsive: {
    label: 'Unresponsive',
    className: 'bg-[#FFE9E9] text-[#d32f2f]',
  },
}

/** Bold semantic text for activity list rows (not pill background). */
export const STATUS_ROW_LABEL: Record<
  ActivityStatusKey,
  { label: string; className: string }
> = {
  engaged: {
    label: 'Engaged',
    className: 'text-[11px] font-bold text-[#1a7f4b]',
  },
  pending: {
    label: 'Pending',
    className: 'text-[11px] font-bold text-[#b45309]',
  },
  unresponsive: {
    label: 'Unresponsive',
    className: 'text-[11px] font-bold text-[#d32f2f]',
  },
}

export const CHANNEL_META: Record<
  ActivityChannelKey,
  { label: string; className: string }
> = {
  email: {
    label: 'Email',
    className: 'border-[#378ADD] text-[#378ADD]',
  },
  sms: {
    label: 'SMS',
    className: 'border-[#1D9E75] text-[#1D9E75]',
  },
  whatsapp: {
    label: 'WhatsApp',
    className: 'border-[#BA7517] text-[#BA7517]',
  },
  meeting: {
    label: '1:1 Meeting',
    className: 'border-[#7F77DD] text-[#7F77DD]',
  },
}

export function channelKeyFromApi(ch: string): ActivityChannelKey {
  if (ch === 'sms' || ch === 'whatsapp' || ch === 'meeting') return ch
  return 'email'
}

/** SMS line ownership surfaced on activity rows and timeline (API camelCase). */
export type ActivitySmsNumberDto = {
  id: string
  displayLabel: string | null
  assignedToName: string | null
  numberType: string
}

/** Subtle footer copy for SMS rows, e.g. "via team line" / "via Sarah's line". */
export function formatSmsViaLineLabel(
  sms: ActivitySmsNumberDto | null | undefined,
): string | null {
  if (!sms) return null
  const nt = sms.numberType?.trim().toLowerCase()
  if (nt === 'shared') return 'via team line'
  const name = (sms.assignedToName ?? '').trim()
  if (name) {
    const first = name.split(/\s+/)[0] ?? name
    return `via ${first}'s line`
  }
  const label = (sms.displayLabel ?? '').trim()
  if (label) return `via ${label}`
  return 'via SMS line'
}

export const SMS_VIA_LINE_MUTED_CLASS = 'text-[10px] text-[#aaaaaa]'

/** Outbound email send path for timeline / lists (mirrors SMS “via line”). */
export function formatEmailSendViaLabel(row: {
  channel: string
  direction: string
  connectedEmail?: { emailAddress: string } | null
}): string | null {
  if (row.channel !== 'email' || row.direction !== 'outbound') return null
  const addr = row.connectedEmail?.emailAddress?.trim()
  if (addr) return `via ${addr}`
  return null
}

/** Candidate SMS consent column (Activity Command Center). */
export type SmsConsentColumnKey = 'granted' | 'pending' | 'revoked'

export function smsConsentColumnKey(raw: string): SmsConsentColumnKey {
  const t = raw.trim().toLowerCase()
  if (t === 'granted' || t === 'pending' || t === 'revoked') return t
  return 'pending'
}

export const SMS_CONSENT_COLUMN_BADGE: Record<
  SmsConsentColumnKey,
  { label: string; className: string }
> = {
  granted: {
    label: 'Granted',
    className:
      'border-[0.5px] border-[#A5D6A7] bg-[#E8F5E9] text-[#2E7D32]',
  },
  pending: {
    label: 'Pending',
    className:
      'border-[0.5px] border-[#FFE082] bg-[#FFF8E1] text-[#F57F17]',
  },
  revoked: {
    label: 'Opted out',
    className:
      'border-[0.5px] border-[#E53935] bg-[#FFEBEE] text-[#C62828]',
  },
}
