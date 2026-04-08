export type JobListRow = {
  id: string
  title: string
  job_code: string
  status: string
  location: string
  department: string
}

export type JobDetailCandidateRow = {
  id: string
  name: string
  email: string
  phone: string
  whatsappNumber: string
  /** Number of job applications (CandidateJob rows) for multi-job bulk filter */
  jobCount: number
}

export type JobDetailResponse = {
  job: {
    id: string
    title: string
    jobCode: string
    status: string
    location: string
    department: string
  }
  candidates: JobDetailCandidateRow[]
}

export async function fetchJobs(): Promise<JobListRow[]> {
  const r = await fetch("/api/jobs")
  if (!r.ok) throw new Error("Failed to load jobs")
  const data = (await r.json()) as { jobs: JobListRow[] }
  return data.jobs
}

export async function fetchJobDetail(jobId: string): Promise<JobDetailResponse> {
  const r = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`)
  if (r.status === 404) throw new Error("NOT_FOUND")
  if (!r.ok) throw new Error("Failed to load job")
  return r.json() as Promise<JobDetailResponse>
}
