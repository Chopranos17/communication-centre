export type ActivityListItemDto = {
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
  sentAt: string
  status: 'engaged' | 'pending' | 'unresponsive'
  primaryAction: 'reply' | 'followup' | 'view'
}

export type ActivityFeedResponse = {
  items: ActivityListItemDto[]
  total: number
  page: number
  limit: number
  summary: {
    total: number
    engaged: number
    pending: number
    unresponsive: number
  }
  slaDays: number
}

export type ActivityQuery = {
  period: string
  /** Single status: engaged | pending | unresponsive — omit or all = no chip filter */
  status: string
  jobId: string
  sort: string
  page: number
  limit: number
  /** Search name, job title, message body */
  q: string
  /** Comma-separated: email, sms, whatsapp, meeting — empty = all */
  channel: string
}

function buildActivityQueryString(query: ActivityQuery): string {
  const p = new URLSearchParams()
  p.set('period', query.period)
  if (query.status.trim()) p.set('status', query.status.trim())
  if (query.jobId.trim()) p.set('job_id', query.jobId.trim())
  p.set('sort', query.sort)
  p.set('page', String(query.page))
  p.set('limit', String(query.limit))
  if (query.q.trim()) p.set('q', query.q.trim())
  if (query.channel.trim()) p.set('channel', query.channel.trim())
  return p.toString()
}

export async function fetchActivityFeed(
  q: ActivityQuery,
): Promise<ActivityFeedResponse> {
  const qs = buildActivityQueryString(q)
  const r = await fetch(
    `/api/v1/recruitment/comms-hub/analytics/activity?${qs}`,
  )
  if (!r.ok) {
    const err = (await r.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? 'Failed to load activity')
  }
  return r.json() as Promise<ActivityFeedResponse>
}
