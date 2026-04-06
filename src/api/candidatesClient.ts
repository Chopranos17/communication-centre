export type CandidateListRow = {
  id: string
  name: string
  email: string
  phone: string
  whatsappNumber: string
  department: string
  job: string
  jobTitle: string
  jobCode: string
  /** Current application job id; null if the candidate has no current job link */
  currentJobId: string | null
  /** Total job applications for this candidate */
  jobCount: number
  status: string
  applied: string
}

export type CandidateDetail = {
  id: string
  name: string
  email: string
  phone: string
  /** E.164 or local; may be empty */
  whatsappNumber: string
  source: string
  sourceLabel: string
  createdAt: string
  appliedDateDisplay: string
  currentStage: string
  statusLabel: string
  jobMatchScore: string
  currentJob: { id: string; title: string; jobCode: string } | null
  otherJobs: {
    id: string
    title: string
    jobCode: string
    statusLabel: string
    appliedOn: string
  }[]
  communicationCount: number
}

export async function fetchCandidates(): Promise<CandidateListRow[]> {
  const r = await fetch("/api/candidates")
  if (!r.ok) throw new Error("Failed to load candidates")
  const data = (await r.json()) as { candidates: CandidateListRow[] }
  return data.candidates
}

export async function fetchCandidateDetail(id: string): Promise<CandidateDetail> {
  const r = await fetch(`/api/candidates/${encodeURIComponent(id)}`)
  if (r.status === 404) throw new Error("NOT_FOUND")
  if (!r.ok) throw new Error("Failed to load candidate")
  return r.json() as Promise<CandidateDetail>
}

export type EmailDeliveryStatus = "pending" | "sent" | "delivered" | "failed"

export type TimelineChannel = "email" | "sms" | "whatsapp" | "meeting"

export type MeetingTimelineMeta = {
  status: string
  scheduledAt: string
  durationMinutes: number
  meetingChannel: string
  meetingLink: string | null
}

export type CurrentJobEmailRow = {
  id: string
  channel: TimelineChannel
  senderType: string
  senderLabel: string
  filterBucket: "system" | "user"
  subject: string | null
  body: string
  sentAt: string
  fromAddress: string
  toAddress: string
  deliveryStatus: EmailDeliveryStatus
  /** Same id for all messages in an email thread; null for standalone email or non-email channels. */
  threadId: string | null
  /** Populated when channel === "meeting". */
  meeting?: MeetingTimelineMeta | null
}

export type OtherJobEmailSection = {
  job: { id: string; title: string; jobCode: string }
  emails: CurrentJobEmailRow[]
}

export type CandidateCurrentJobEmails = {
  currentJob: { id: string; title: string; jobCode: string } | null
  emails: CurrentJobEmailRow[]
  /** Jobs other than the current application with at least one email; collapsed in UI by default. */
  otherJobEmailSections: OtherJobEmailSection[]
}

export async function fetchCandidateCurrentJobEmails(
  candidateId: string,
  jobId?: string,
): Promise<CandidateCurrentJobEmails> {
  const q = jobId ? `?jobId=${encodeURIComponent(jobId)}` : ""
  const r = await fetch(`/api/candidates/${encodeURIComponent(candidateId)}/communications${q}`)
  if (r.status === 404) throw new Error("NOT_FOUND")
  if (!r.ok) throw new Error("Failed to load communications")
  return r.json() as Promise<CandidateCurrentJobEmails>
}

export type EmailTemplateListItem = {
  id: string
  name: string
  category: string
  subject_template: string
  body_template: string
  variables: string
}

export type EmployeeRow = { id: string; name: string; email: string }

export async function fetchEmailTemplates(): Promise<EmailTemplateListItem[]> {
  const r = await fetch("/api/email-templates")
  if (!r.ok) throw new Error("Failed to load templates")
  const data = (await r.json()) as { templates: EmailTemplateListItem[] }
  return data.templates
}

export async function fetchEmployees(q?: string): Promise<EmployeeRow[]> {
  const query = q ? `?q=${encodeURIComponent(q)}` : ""
  const r = await fetch(`/api/employees${query}`)
  if (!r.ok) throw new Error("Failed to load employees")
  const data = (await r.json()) as { employees: EmployeeRow[] }
  return data.employees
}

export type ComposeEmailPayload = {
  jobId: string
  fromAddress: string
  subject: string
  htmlBody: string
  cc?: string[]
  templateId?: string | null
  senderName?: string
  /** Task 13: existing thread key or root message id for follow-up / reply. */
  threadId?: string | null
}

export type ComposeEmailResult = {
  success: boolean
  messageId?: string
  error?: string
  communicationId?: string
}

export async function composeSendEmail(
  candidateId: string,
  payload: ComposeEmailPayload,
): Promise<ComposeEmailResult> {
  const r = await fetch(
    `/api/candidates/${encodeURIComponent(candidateId)}/compose-email`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  )
  const data = (await r.json()) as ComposeEmailResult & { error?: string }
  if (!r.ok) {
    return {
      success: false,
      error: data.error ?? "Failed to send email",
    }
  }
  return data
}

export type ComposeSmsPayload = {
  jobId: string
  text: string
  senderName?: string
}

export type ComposeSmsResult = ComposeEmailResult

export async function composeSendSms(
  candidateId: string,
  payload: ComposeSmsPayload,
): Promise<ComposeSmsResult> {
  const r = await fetch(
    `/api/candidates/${encodeURIComponent(candidateId)}/compose-sms`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  )
  const data = (await r.json()) as ComposeSmsResult & { error?: string }
  if (!r.ok) {
    return {
      success: false,
      error: data.error ?? "Failed to send SMS",
    }
  }
  return data
}

export type ComposeWhatsAppPayload = ComposeSmsPayload
export type ComposeWhatsAppResult = ComposeEmailResult

export async function composeSendWhatsApp(
  candidateId: string,
  payload: ComposeWhatsAppPayload,
): Promise<ComposeWhatsAppResult> {
  const r = await fetch(
    `/api/candidates/${encodeURIComponent(candidateId)}/compose-whatsapp`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  )
  const data = (await r.json()) as ComposeWhatsAppResult & { error?: string }
  if (!r.ok) {
    return {
      success: false,
      error: data.error ?? "Failed to send WhatsApp message",
    }
  }
  return data
}

export type ScheduleMeetingPayload = {
  jobId: string
  title: string
  description: string
  durationMinutes: 15 | 30 | 45 | 60
  scheduledAt: string
  channel:
    | "google_meet"
    | "ms_teams"
    | "zoom"
    | "darwinbox_meet"
    | "in_person"
  participants: { name: string; email: string }[]
  senderName?: string
}

export type ScheduleMeetingResult = ComposeEmailResult & {
  meetingId?: string
  messageIds?: string[]
}

export async function scheduleMeeting(
  candidateId: string,
  payload: ScheduleMeetingPayload,
): Promise<ScheduleMeetingResult> {
  const r = await fetch(
    `/api/candidates/${encodeURIComponent(candidateId)}/schedule-meeting`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  )
  const data = (await r.json()) as ScheduleMeetingResult & { error?: string }
  if (!r.ok) {
    return {
      success: false,
      error: data.error ?? "Failed to schedule meeting",
    }
  }
  return data
}
