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
