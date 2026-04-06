export type Persona = 'recruiter' | 'hiring_lead' | 'candidate'

export const PERSONA_LABELS: Record<Persona, string> = {
  recruiter: 'Recruiter',
  hiring_lead: 'Hiring Lead',
  candidate: 'Candidate',
}
