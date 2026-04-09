import { prisma } from "../db";

/**
 * Job openings visible in the Comms Hub for the given user: Hiring Lead (manager),
 * assigned Recruiter (recruiter_ids JSON), or Panel (meeting organizer / participant id).
 * When userId is empty, all jobs are included (matches legacy dev behaviour).
 */
export async function getSpanJobIds(
  userId: string | undefined,
): Promise<string[]> {
  const allJobs = await prisma.job.findMany({
    select: { id: true, hiring_lead_id: true, recruiter_ids: true },
  });

  if (!userId?.trim()) {
    return allJobs.map((j) => j.id);
  }

  const uid = userId.trim();

  const meetings = await prisma.meeting.findMany({
    select: { job_id: true, organizer_id: true, participants: true },
  });

  const panelJobIds = new Set<string>();
  for (const m of meetings) {
    if (m.organizer_id === uid) {
      panelJobIds.add(m.job_id);
      continue;
    }
    try {
      const parts = JSON.parse(m.participants) as Array<{ id?: string }>;
      if (Array.isArray(parts)) {
        for (const p of parts) {
          if (p && p.id === uid) panelJobIds.add(m.job_id);
        }
      }
    } catch {
      /* ignore invalid JSON */
    }
  }

  const out = new Set<string>();
  for (const j of allJobs) {
    if (j.hiring_lead_id === uid) {
      out.add(j.id);
      continue;
    }
    try {
      const rids = j.recruiter_ids
        ? (JSON.parse(j.recruiter_ids) as string[])
        : [];
      if (Array.isArray(rids) && rids.includes(uid)) {
        out.add(j.id);
        continue;
      }
    } catch {
      /* ignore */
    }
    if (panelJobIds.has(j.id)) out.add(j.id);
  }

  return [...out];
}

export function spanUserIdFromEnv(): string | undefined {
  const v = process.env.COMMS_HUB_USER_ID;
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}
