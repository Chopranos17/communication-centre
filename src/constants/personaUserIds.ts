/**
 * Maps prototype persona to seed user ids (must match `getSmsNumberForUser` / seed data).
 */
export const PERSONA_TO_USER_ID: Record<"recruiter" | "hiring_lead", string> = {
  recruiter: "emp-rec-001",
  hiring_lead: "emp-hl-001",
}
