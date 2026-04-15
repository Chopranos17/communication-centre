export type SmsNumberAdminRow = {
  id: string
  phone_number: string
  twilio_phone_sid: string | null
  display_label: string | null
  number_type: string
  assigned_to_id: string | null
  assigned_to_name: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type SmsOptOutSummary = {
  granted: number
  pending: number
  optedOut: number
}

export type SmsAdminConfig = {
  smsInboundMode: 'polling' | 'webhook'
  webhookBaseUrl: string | null
  compliance: {
    brandRegistrationStatus: string
    campaignStatus: string
    trustScore: number
  }
}

export async function fetchAdminSmsNumbers(): Promise<SmsNumberAdminRow[]> {
  const r = await fetch('/api/admin/sms/numbers')
  if (!r.ok) throw new Error('Failed to load SMS numbers')
  const data = (await r.json()) as { numbers: SmsNumberAdminRow[] }
  return data.numbers
}

export async function fetchSmsOptOutSummary(): Promise<SmsOptOutSummary> {
  const r = await fetch('/api/admin/sms/opt-out-summary')
  if (!r.ok) throw new Error('Failed to load consent summary')
  return (await r.json()) as SmsOptOutSummary
}

export async function fetchSmsAdminConfig(): Promise<SmsAdminConfig> {
  const r = await fetch('/api/admin/sms/config')
  if (!r.ok) throw new Error('Failed to load SMS configuration')
  return (await r.json()) as SmsAdminConfig
}

export type AssignableSmsUser = {
  id: string
  name: string
  role: 'recruiter' | 'hiring_lead'
}

export type AvailableSmsNumberHit = {
  phoneNumber: string
  friendlyName: string | null
  locality: string | null
  region: string | null
}

export async function fetchAssignableSmsUsers(): Promise<AssignableSmsUser[]> {
  const r = await fetch('/api/admin/sms/assignable-users')
  if (!r.ok) throw new Error('Failed to load assignable users')
  const data = (await r.json()) as { users: AssignableSmsUser[] }
  return data.users
}

export async function searchAvailableSmsNumbers(params: {
  country?: string
  areaCode?: string
  contains?: string
  limit?: number
}): Promise<AvailableSmsNumberHit[]> {
  const q = new URLSearchParams()
  if (params.country) q.set('country', params.country)
  if (params.areaCode) q.set('areaCode', params.areaCode)
  if (params.contains) q.set('contains', params.contains)
  if (params.limit != null) q.set('limit', String(params.limit))
  const r = await fetch(`/api/admin/sms/available-numbers?${q.toString()}`)
  if (!r.ok) {
    const err = (await r.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error || 'Search failed')
  }
  const data = (await r.json()) as { numbers: AvailableSmsNumberHit[] }
  return data.numbers
}

export async function provisionSmsNumber(body: {
  phoneNumber: string
  displayLabel: string
  numberType: 'dedicated' | 'shared'
  assignedToId: string | null
  assignedToName: string | null
}): Promise<SmsNumberAdminRow> {
  const r = await fetch('/api/admin/sms/provision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    const err = (await r.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error || 'Provision failed')
  }
  const data = (await r.json()) as { number: SmsNumberAdminRow }
  return data.number
}

export async function syncSmsNumbersFromTwilio(): Promise<{
  imported: number
  updatedSid: number
}> {
  const r = await fetch('/api/admin/sms/sync-twilio', { method: 'POST' })
  if (!r.ok) {
    const err = (await r.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error || 'Sync failed')
  }
  return (await r.json()) as { imported: number; updatedSid: number }
}

export async function patchSmsNumberAssign(
  id: string,
  body: {
    assignedToId?: string | null
    assignedToName?: string | null
    numberType?: 'dedicated' | 'shared'
    displayLabel?: string | null
  },
): Promise<SmsNumberAdminRow> {
  const r = await fetch(`/api/admin/sms/numbers/${encodeURIComponent(id)}/assign`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    const err = (await r.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error || 'Update failed')
  }
  const data = (await r.json()) as { number: SmsNumberAdminRow }
  return data.number
}

export async function deactivateAdminSmsNumber(id: string): Promise<SmsNumberAdminRow> {
  const r = await fetch(
    `/api/admin/sms/numbers/${encodeURIComponent(id)}/deactivate`,
    { method: 'PATCH' },
  )
  if (!r.ok) {
    const err = (await r.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error || 'Deactivate failed')
  }
  const data = (await r.json()) as { number: SmsNumberAdminRow }
  return data.number
}
