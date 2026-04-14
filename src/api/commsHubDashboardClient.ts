export type DashboardFilters = {
  period: 'week' | 'month' | 'quarter' | 'all'
  jobOpeningId?: string
}

export type ScheduledMessageDto = {
  communicationId: string
  candidateId: string
  candidateName: string
  channel: string
  subject: string
  scheduledAt: string
  jobId: string
  meetingId: string | null
}

export type CommsHubDashboardDto = {
  summary: {
    messagesSent: number
    responseRate: number | null
    avgResponseTimeHrs: number | null
    activeCandidates: number
  }
  channelDistribution: Array<{ channel: string; count: number }>
  recentActivity: Array<{
    communicationId: string
    candidateId: string
    candidateName: string
    candidateEmail: string
    candidatePhone: string
    candidateWhatsapp: string
    jobId: string
    jobTitle: string
    jobCode: string
    currentStage: string
    channel: string
    direction: string
    preview: string
    status: 'engaged' | 'pending' | 'unresponsive'
    sentAt: string
    primaryAction: 'reply' | 'followup' | 'view'
    smsNumber: {
      id: string
      displayLabel: string | null
      assignedToName: string | null
      numberType: string
    } | null
    smsConsentStatus: string
  }>
  scheduled: ScheduledMessageDto[]
  scheduledQueuedTotal: number
  unresponsiveCount: number
}

function buildQueryString(filters: DashboardFilters): string {
  const p = new URLSearchParams()
  p.set('period', filters.period)
  if (filters.jobOpeningId?.trim()) {
    p.set('job_opening_id', filters.jobOpeningId.trim())
  }
  return p.toString()
}

export async function fetchCommsHubDashboard(
  filters: DashboardFilters,
): Promise<CommsHubDashboardDto> {
  const qs = buildQueryString(filters)
  const r = await fetch(
    `/api/v1/recruitment/comms-hub/analytics/dashboard?${qs}`,
  )
  if (!r.ok) {
    const err = (await r.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? 'Failed to load dashboard analytics')
  }
  return r.json() as Promise<CommsHubDashboardDto>
}

export type ScheduledMessagesPageQuery = {
  period: string
  jobOpeningId?: string
  page: number
  limit: number
}

export async function fetchScheduledMessagesPage(
  q: ScheduledMessagesPageQuery,
): Promise<{
  items: ScheduledMessageDto[]
  total: number
  page: number
  limit: number
}> {
  const p = new URLSearchParams()
  p.set('period', q.period)
  if (q.jobOpeningId?.trim()) {
    p.set('job_opening_id', q.jobOpeningId.trim())
  }
  p.set('page', String(q.page))
  p.set('limit', String(q.limit))
  const r = await fetch(
    `/api/v1/recruitment/comms-hub/analytics/scheduled?${p.toString()}`,
  )
  if (!r.ok) {
    const err = (await r.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? 'Failed to load scheduled messages')
  }
  return r.json() as Promise<{
    items: ScheduledMessageDto[]
    total: number
    page: number
    limit: number
  }>
}
