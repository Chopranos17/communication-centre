export type CandidateListRow = {
  id: string
  name: string
  email: string
  phone: string
  department: string
  job: string
  jobTitle: string
  jobCode: string
  status: string
  applied: string
}

export type CandidateDetail = {
  id: string
  name: string
  email: string
  phone: string
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

export type CurrentJobEmailRow = {
  id: string
  senderType: string
  senderLabel: string
  filterBucket: "system" | "user"
  subject: string | null
  body: string
  sentAt: string
}

export type CandidateCurrentJobEmails = {
  currentJob: { id: string; title: string; jobCode: string } | null
  emails: CurrentJobEmailRow[]
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
