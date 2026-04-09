export type DashboardFilters = {
  period: 'week' | 'month' | 'quarter' | 'all'
  jobOpeningId?: string
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
    jobId: string
    jobTitle: string
    currentStage: string
    channel: string
    direction: string
    preview: string
    status: 'engaged' | 'pending' | 'unresponsive'
    sentAt: string
  }>
  scheduled: Array<{
    communicationId: string
    candidateId: string
    candidateName: string
    channel: string
    subject: string
    scheduledAt: string
  }>
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
