import "dotenv/config";
import { createServer } from "http";
import express from "express";
import { Server } from "socket.io";
import { prisma } from "./db";
import { setSocketIo } from "./socket-io";
import { startPolling } from "./services/inbound-poller";
import { sendEmail, sendMessage } from "./services/message-sender";

function normalizeSmsToE164(raw: string): string {
  const t = raw.trim().replace(/\s/g, "");
  if (!t) return "";
  if (t.startsWith("+")) return t;
  const digits = t.replace(/\D/g, "");
  return digits ? `+${digits}` : "";
}

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(express.json());

function formatDateDots(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

function formatStageLabel(stage: string): string {
  return stage
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function sourceTypeLabel(source: string): string {
  const map: Record<string, string> = {
    job_portal: "External Candidate",
    IJP: "Internal Candidate",
    referral: "Referral",
    external_recruiter: "External Recruiter",
    CRM: "CRM",
  };
  return map[source] ?? formatStageLabel(source);
}

function senderLabelForTimeline(
  senderType: string,
  senderName: string | null,
): { senderLabel: string; filterBucket: "system" | "user"; senderType: string } {
  if (senderType === "system") {
    return { senderType, senderLabel: "System", filterBucket: "system" };
  }
  if (senderType === "CRM") {
    return { senderType, senderLabel: "CRM", filterBucket: "system" };
  }
  if (senderType === "candidate") {
    const label = senderName?.trim() || "Candidate";
    return { senderType, senderLabel: label, filterBucket: "user" };
  }
  if (senderType === "recruiter" || senderType === "hiring_lead") {
    const label = senderName?.trim() || "Employee";
    return { senderType, senderLabel: label, filterBucket: "user" };
  }
  const label = senderName?.trim() || "Employee";
  return { senderType, senderLabel: label, filterBucket: "user" };
}

const TIMELINE_CHANNELS = [
  "email",
  "sms",
  "whatsapp",
  "meeting",
  "system_notification",
] as const;

/** Task 6 + Task 11: timeline for Current Job (email, SMS, WhatsApp). */
app.get("/api/candidates/:candidateId/communications", async (req, res) => {
  const { candidateId } = req.params;
  const jobIdParam =
    typeof req.query.jobId === "string" ? req.query.jobId.trim() : "";

  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        jobs: { include: { job: true } },
      },
    });

    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    const currentLink = candidate.jobs.find((j) => j.is_current);
    const jobId = jobIdParam || currentLink?.job_id;

    if (!jobId) {
      return res.json({
        currentJob: null,
        emails: [],
        otherJobEmailSections: [],
      });
    }

    const jobRow = candidate.jobs.find((j) => j.job_id === jobId)?.job;
    if (!jobRow) {
      return res.status(400).json({ error: "Invalid jobId for this candidate" });
    }

    const rows = await prisma.communication.findMany({
      where: {
        candidate_id: candidateId,
        job_id: jobId,
        channel: { in: [...TIMELINE_CHANNELS] },
      },
      include: { meeting_detail: true },
      orderBy: { sent_at: "desc" },
    });

    const mapTimelineRow = (row: (typeof rows)[number]) => {
      const mapped = senderLabelForTimeline(row.sender_type, row.sender_name);
      const ch = row.channel;
      const channel: "email" | "sms" | "whatsapp" | "meeting" | "system" =
        ch === "sms" || ch === "whatsapp"
          ? ch
          : ch === "meeting"
            ? "meeting"
            : ch === "system_notification"
              ? "system"
              : "email";
      const mtg = row.meeting_detail;
      return {
        id: row.id,
        channel,
        /** outbound = to candidate; inbound = from candidate (reply). Used for candidate-persona timeline. */
        direction: row.direction,
        senderType: mapped.senderType,
        senderLabel: mapped.senderLabel,
        filterBucket: mapped.filterBucket,
        subject: row.subject,
        body: row.body,
        sentAt: row.sent_at.toISOString(),
        fromAddress: row.from_address ?? "",
        toAddress: row.to_address ?? "",
        deliveryStatus: row.delivery_status,
        threadId:
          channel === "email"
            ? (row.thread_id?.trim() || row.id)
            : null,
        meeting:
          channel === "meeting" && mtg
            ? {
                status: mtg.status,
                scheduledAt: mtg.scheduled_at.toISOString(),
                durationMinutes: mtg.duration_minutes,
                meetingChannel: mtg.channel,
                meetingLink: mtg.meeting_link,
              }
            : null,
      };
    };

    const emails = rows.map(mapTimelineRow);

    const otherJobLinks = candidate.jobs.filter((j) => j.job_id !== jobId);
    const otherJobEmailSectionsRaw = await Promise.all(
      otherJobLinks.map(async (link) => {
        const otherRows = await prisma.communication.findMany({
          where: {
            candidate_id: candidateId,
            job_id: link.job_id,
            channel: { in: [...TIMELINE_CHANNELS] },
          },
          include: { meeting_detail: true },
          orderBy: { sent_at: "desc" },
        });
        if (otherRows.length === 0) return null;
        return {
          job: {
            id: link.job.id,
            title: link.job.title,
            jobCode: link.job.job_code,
          },
          emails: otherRows.map(mapTimelineRow),
        };
      }),
    );

    const otherJobEmailSections = otherJobEmailSectionsRaw.filter(
      (x): x is NonNullable<typeof x> => x != null,
    );
    otherJobEmailSections.sort((a, b) => {
      const ta = a.emails[0]?.sentAt;
      const tb = b.emails[0]?.sentAt;
      if (!ta || !tb) return 0;
      return new Date(tb).getTime() - new Date(ta).getTime();
    });

    res.json({
      currentJob: {
        id: jobRow.id,
        title: jobRow.title,
        jobCode: jobRow.job_code,
      },
      emails,
      otherJobEmailSections,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

app.get("/api/candidates", async (_req, res) => {
  try {
    const rows = await prisma.candidate.findMany({
      include: {
        jobs: {
          where: { is_current: true },
          include: { job: true },
        },
        _count: { select: { jobs: true } },
      },
      orderBy: { name: "asc" },
    });

    const candidates = rows.map((c) => {
      const link = c.jobs[0];
      const job = link?.job;
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone ?? "",
        whatsappNumber: c.whatsapp_number ?? "",
        department: job?.department ?? "—",
        job: job ? `${job.title} (${job.job_code})` : "—",
        jobTitle: job?.title ?? "—",
        jobCode: job?.job_code ?? "",
        currentJobId: job?.id ?? null,
        jobCount: c._count.jobs,
        status: formatStageLabel(c.current_stage),
        applied: formatDateDots(c.created_at),
      };
    });

    res.json({ candidates });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

app.get("/api/candidates/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id },
      include: {
        jobs: { include: { job: true } },
        _count: { select: { communications: true } },
      },
    });

    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    const currentLink = candidate.jobs.find((j) => j.is_current);
    const otherLinks = candidate.jobs.filter((j) => !j.is_current);

    res.json({
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone ?? "",
      whatsappNumber: candidate.whatsapp_number ?? "",
      source: candidate.source,
      sourceLabel: sourceTypeLabel(candidate.source),
      createdAt: candidate.created_at.toISOString(),
      appliedDateDisplay: formatDateDots(candidate.created_at),
      currentStage: candidate.current_stage,
      statusLabel: formatStageLabel(candidate.current_stage),
      jobMatchScore: "Not Calculated",
      currentJob: currentLink
        ? {
            id: currentLink.job.id,
            title: currentLink.job.title,
            jobCode: currentLink.job.job_code,
          }
        : null,
      otherJobs: otherLinks.map((cj) => ({
        id: cj.job.id,
        title: cj.job.title,
        jobCode: cj.job.job_code,
        statusLabel: formatStageLabel(candidate.current_stage),
        appliedOn: formatDateDots(candidate.created_at),
      })),
      communicationCount: candidate._count.communications,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

/** Task 10: job list + job detail with candidates (for bulk email from Job Detail Page). */
app.get("/api/jobs", async (_req, res) => {
  try {
    const rows = await prisma.job.findMany({
      orderBy: { job_code: "asc" },
      select: {
        id: true,
        title: true,
        job_code: true,
        status: true,
        location: true,
        department: true,
      },
    });
    res.json({ jobs: rows });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

app.get("/api/jobs/:jobId", async (req, res) => {
  const { jobId } = req.params;
  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const links = await prisma.candidateJob.findMany({
      where: { job_id: jobId },
      include: { candidate: true },
      orderBy: { candidate: { name: "asc" } },
    });

    const candidateIds = [...new Set(links.map((l) => l.candidate_id))];
    const counts =
      candidateIds.length === 0
        ? []
        : await prisma.candidateJob.groupBy({
            by: ["candidate_id"],
            where: { candidate_id: { in: candidateIds } },
            _count: { _all: true },
          });
    const countMap = new Map(
      counts.map((c) => [c.candidate_id, c._count._all]),
    );

    const candidates = links.map((l) => ({
      id: l.candidate.id,
      name: l.candidate.name,
      email: l.candidate.email,
      jobCount: countMap.get(l.candidate_id) ?? 1,
    }));

    res.json({
      job: {
        id: job.id,
        title: job.title,
        jobCode: job.job_code,
        status: job.status,
        location: job.location,
        department: job.department,
      },
      candidates,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

const DISPLAY_FROM_ADDRESSES = new Set([
  "no-reply@darwinbox.in",
  "contact@darwinbox.in",
]);

function resendFromForDisplay(display: string): string {
  const noreply =
    process.env.RESEND_FROM_NOREPLY?.trim() || "onboarding@resend.dev";
  const contact =
    process.env.RESEND_FROM_CONTACT?.trim() || "onboarding@resend.dev";
  if (display === "no-reply@darwinbox.in") return noreply;
  if (display === "contact@darwinbox.in") return contact;
  return display;
}

/** Seed-style employees for CC type-ahead (Task 9). */
const MOCK_EMPLOYEES: { id: string; name: string; email: string }[] = [
  { id: "emp-rec-001", name: "Atharva M", email: "atharva.m@darwinbox.in" },
  { id: "emp-rec-002", name: "Priya Sharma", email: "priya.sharma@darwinbox.in" },
  { id: "emp-rec-003", name: "Rahul Verma", email: "rahul.verma@darwinbox.in" },
  { id: "emp-hl-001", name: "Neha Kapoor", email: "neha.kapoor@darwinbox.in" },
  { id: "emp-hl-002", name: "Vikram Singh", email: "vikram.singh@darwinbox.in" },
];

function uniqEmails(emails: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of emails) {
    const t = e.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/** PRD §4.5: threading / reply eligibility uses contact@ (not no-reply@). */
function isContactDarwinboxFrom(addr: string | null | undefined): boolean {
  return (addr ?? "").toLowerCase().includes("contact@darwinbox.in");
}

app.get("/api/email-templates", async (_req, res) => {
  try {
    const rows = await prisma.emailTemplate.findMany({
      where: { channel: "email" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        category: true,
        subject_template: true,
        body_template: true,
        variables: true,
      },
    });
    res.json({ templates: rows });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

app.get("/api/employees", (req, res) => {
  const q =
    typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
  if (!q) {
    res.json({ employees: MOCK_EMPLOYEES });
    return;
  }
  const employees = MOCK_EMPLOYEES.filter(
    (e) =>
      e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q),
  );
  res.json({ employees });
});

app.post("/api/candidates/:candidateId/compose-email", async (req, res) => {
  const { candidateId } = req.params;
  const body = req.body as {
    jobId?: string;
    fromAddress?: string;
    subject?: string;
    htmlBody?: string;
    cc?: string[];
    templateId?: string | null;
    senderName?: string;
    /** Existing thread id or root communication id (Task 13). */
    threadId?: string | null;
  };

  const jobId = typeof body.jobId === "string" ? body.jobId.trim() : "";
  const fromAddress =
    typeof body.fromAddress === "string" ? body.fromAddress.trim() : "";
  const subject =
    typeof body.subject === "string" ? body.subject.trim() : "";
  const htmlBody =
    typeof body.htmlBody === "string" ? body.htmlBody : "";
  const senderName =
    typeof body.senderName === "string" && body.senderName.trim()
      ? body.senderName.trim()
      : "Recruiter";
  const threadIdParam =
    typeof body.threadId === "string" && body.threadId.trim()
      ? body.threadId.trim()
      : "";

  if (!jobId) {
    return res.status(400).json({ error: "jobId is required" });
  }
  if (!DISPLAY_FROM_ADDRESSES.has(fromAddress)) {
    return res.status(400).json({
      error: "fromAddress must be no-reply@darwinbox.in or contact@darwinbox.in",
    });
  }
  if (!subject) {
    return res.status(400).json({ error: "subject is required" });
  }
  if (!htmlBody.trim()) {
    return res.status(400).json({ error: "body is required" });
  }

  const ccRaw = Array.isArray(body.cc) ? body.cc : [];
  const cc = uniqEmails(ccRaw.map((x) => String(x)));

  const templateId =
    typeof body.templateId === "string" && body.templateId.trim()
      ? body.templateId.trim()
      : null;

  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { jobs: true },
    });
    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }
    const hasJob = candidate.jobs.some((j) => j.job_id === jobId);
    if (!hasJob) {
      return res.status(400).json({ error: "jobId is not linked to this candidate" });
    }

    const to = candidate.email.trim();
    if (!to) {
      return res.status(400).json({ error: "Candidate has no email address" });
    }

    let resolvedThreadId: string | null = null;
    if (threadIdParam) {
      const anchor = await prisma.communication.findFirst({
        where: {
          candidate_id: candidateId,
          job_id: jobId,
          channel: "email",
          OR: [{ id: threadIdParam }, { thread_id: threadIdParam }],
        },
      });
      if (!anchor) {
        return res.status(400).json({
          error: "Invalid threadId for this candidate and job",
        });
      }
      const canonical = anchor.thread_id?.trim() || anchor.id;
      const threadEmails = await prisma.communication.findMany({
        where: {
          candidate_id: candidateId,
          job_id: jobId,
          channel: "email",
          OR: [{ thread_id: canonical }, { id: canonical }],
        },
      });
      const hasContactOutbound = threadEmails.some(
        (r) =>
          r.sender_type !== "candidate" &&
          isContactDarwinboxFrom(r.from_address),
      );
      if (!hasContactOutbound) {
        return res.status(400).json({
          error:
            "This thread is not eligible for follow-up or reply (need a contact@darwinbox.in message).",
        });
      }
      if (fromAddress !== "contact@darwinbox.in") {
        return res.status(400).json({
          error:
            "fromAddress must be contact@darwinbox.in for follow-up and reply.",
        });
      }
      resolvedThreadId = canonical;
      await prisma.communication.updateMany({
        where: { id: canonical, thread_id: null },
        data: { thread_id: canonical },
      });
    }

    const apiFrom = resendFromForDisplay(fromAddress);

    const result = await sendMessage({
      channel: "email",
      to,
      from: apiFrom,
      fromDisplay: fromAddress,
      subject,
      body: htmlBody,
      cc: cc.length ? cc : undefined,
      candidateId,
      jobId,
      senderType: "recruiter",
      senderName,
      templateId,
      threadId: resolvedThreadId,
    });

    return res.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      communicationId: result.communicationId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

app.post("/api/candidates/:candidateId/compose-sms", async (req, res) => {
  const { candidateId } = req.params;
  const body = req.body as {
    jobId?: string;
    text?: string;
    senderName?: string;
  };

  const jobId = typeof body.jobId === "string" ? body.jobId.trim() : "";
  const text = typeof body.text === "string" ? body.text : "";
  const senderName =
    typeof body.senderName === "string" && body.senderName.trim()
      ? body.senderName.trim()
      : "Recruiter";

  if (!jobId) {
    return res.status(400).json({ error: "jobId is required" });
  }
  if (!text.trim()) {
    return res.status(400).json({ error: "Message text is required" });
  }

  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { jobs: true },
    });
    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }
    const hasJob = candidate.jobs.some((j) => j.job_id === jobId);
    if (!hasJob) {
      return res.status(400).json({ error: "jobId is not linked to this candidate" });
    }

    const rawPhone = candidate.phone?.trim() ?? "";
    const to = normalizeSmsToE164(rawPhone);
    if (!to) {
      return res.status(400).json({ error: "Candidate has no valid phone number for SMS" });
    }

    const result = await sendMessage({
      channel: "sms",
      to,
      body: text.trim(),
      candidateId,
      jobId,
      senderType: "recruiter",
      senderName,
    });

    return res.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      communicationId: result.communicationId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

app.post("/api/candidates/:candidateId/compose-whatsapp", async (req, res) => {
  const { candidateId } = req.params;
  const body = req.body as {
    jobId?: string;
    text?: string;
    senderName?: string;
  };

  const jobId = typeof body.jobId === "string" ? body.jobId.trim() : "";
  const text = typeof body.text === "string" ? body.text : "";
  const senderName =
    typeof body.senderName === "string" && body.senderName.trim()
      ? body.senderName.trim()
      : "Recruiter";

  if (!jobId) {
    return res.status(400).json({ error: "jobId is required" });
  }
  if (!text.trim()) {
    return res.status(400).json({ error: "Message text is required" });
  }

  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { jobs: true },
    });
    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }
    const hasJob = candidate.jobs.some((j) => j.job_id === jobId);
    if (!hasJob) {
      return res.status(400).json({ error: "jobId is not linked to this candidate" });
    }

    const raw =
      candidate.whatsapp_number?.trim() || candidate.phone?.trim() || "";
    const to = raw.startsWith("whatsapp:")
      ? raw
      : normalizeSmsToE164(raw);
    if (!to) {
      return res.status(400).json({
        error:
          "Candidate has no valid phone or WhatsApp number",
      });
    }

    const result = await sendMessage({
      channel: "whatsapp",
      to,
      body: text.trim(),
      candidateId,
      jobId,
      senderType: "recruiter",
      senderName,
    });

    return res.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      communicationId: result.communicationId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

const MEETING_CHANNELS = new Set([
  "google_meet",
  "ms_teams",
  "zoom",
  "darwinbox_meet",
  "in_person",
]);

type MeetingChannelKey =
  | "google_meet"
  | "ms_teams"
  | "zoom"
  | "darwinbox_meet"
  | "in_person";

function meetingPlaceholderLink(ch: MeetingChannelKey): string | null {
  switch (ch) {
    case "google_meet":
      return "https://meet.google.com/lookup/mock-1x1-placeholder";
    case "zoom":
      return "https://zoom.us/j/00000000000";
    case "ms_teams":
      return "https://teams.microsoft.com/l/meetup-join/mock-placeholder";
    case "darwinbox_meet":
      return "https://meet.darwinbox.in/mock-session";
    default:
      return null;
  }
}

function meetingChannelLabel(ch: string): string {
  const map: Record<string, string> = {
    google_meet: "Google Meet",
    ms_teams: "Microsoft Teams",
    zoom: "Zoom",
    darwinbox_meet: "Darwinbox Meet",
    in_person: "In person",
  };
  return map[ch] ?? ch;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildMeetingInviteHtml(params: {
  title: string;
  scheduledAt: Date;
  durationMinutes: number;
  channelLabel: string;
  description: string;
  meetingLink: string | null;
  organizerName: string;
}): string {
  const when = params.scheduledAt.toLocaleString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  const desc = params.description.trim()
    ? `<p>${escapeHtml(params.description).replace(/\n/g, "<br/>")}</p>`
    : "";
  const linkBlock = params.meetingLink
    ? `<p><strong>Join link:</strong> <a href="${escapeHtml(params.meetingLink)}">${escapeHtml(params.meetingLink)}</a></p>`
    : "<p><em>This is an in-person meeting — no video link.</em></p>";
  return `
<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5">
  <h2 style="margin:0 0 12px">${escapeHtml(params.title)}</h2>
  <p>You are invited to a 1:1 meeting on Darwinbox Communication Centre.</p>
  <ul style="padding-left:20px;margin:8px 0">
    <li><strong>When:</strong> ${escapeHtml(when)}</li>
    <li><strong>Duration:</strong> ${params.durationMinutes} minutes</li>
    <li><strong>Channel:</strong> ${escapeHtml(params.channelLabel)}</li>
    <li><strong>Organizer:</strong> ${escapeHtml(params.organizerName)}</li>
  </ul>
  ${desc}
  ${linkBlock}
  <p style="color:#666;font-size:13px;margin-top:24px">This message was sent by Communication Centre (prototype).</p>
</body></html>`;
}

/** Task 14: schedule 1:1 meeting + send real invite emails via Resend. */
app.post("/api/candidates/:candidateId/schedule-meeting", async (req, res) => {
  const { candidateId } = req.params;
  const body = req.body as {
    jobId?: string;
    title?: string;
    description?: string;
    durationMinutes?: number;
    scheduledAt?: string;
    channel?: string;
    participants?: { name?: string; email?: string }[];
    senderName?: string;
  };

  const jobId = typeof body.jobId === "string" ? body.jobId.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description =
    typeof body.description === "string" ? body.description : "";
  const durationRaw = body.durationMinutes;
  const scheduledAtRaw =
    typeof body.scheduledAt === "string" ? body.scheduledAt.trim() : "";
  const channelRaw = typeof body.channel === "string" ? body.channel.trim() : "";
  const senderName =
    typeof body.senderName === "string" && body.senderName.trim()
      ? body.senderName.trim()
      : "Recruiter";

  if (!jobId) {
    return res.status(400).json({ error: "jobId is required" });
  }
  if (!title) {
    return res.status(400).json({ error: "title is required" });
  }
  if (!MEETING_CHANNELS.has(channelRaw)) {
    return res.status(400).json({
      error:
        "channel must be one of: google_meet, ms_teams, zoom, darwinbox_meet, in_person",
    });
  }
  const channel = channelRaw as MeetingChannelKey;

  const durationMinutes =
    typeof durationRaw === "number" && Number.isFinite(durationRaw)
      ? Math.round(durationRaw)
      : 0;
  if (![15, 30, 45, 60].includes(durationMinutes)) {
    return res.status(400).json({
      error: "durationMinutes must be 15, 30, 45, or 60",
    });
  }

  const scheduledAt = new Date(scheduledAtRaw);
  if (Number.isNaN(scheduledAt.getTime())) {
    return res.status(400).json({ error: "scheduledAt must be a valid ISO date" });
  }

  const partRaw = Array.isArray(body.participants) ? body.participants : [];
  const participantByEmail = new Map<string, { name: string; email: string }>();
  for (const p of partRaw) {
    const name = typeof p?.name === "string" ? p.name.trim() : "";
    const email = typeof p?.email === "string" ? p.email.trim() : "";
    if (!email) continue;
    const key = email.toLowerCase();
    if (!participantByEmail.has(key)) {
      participantByEmail.set(key, { name: name || email, email });
    }
  }
  const participantsList = [...participantByEmail.values()];
  const participantEmails = participantsList.map((p) => p.email);
  if (participantEmails.length === 0) {
    return res.status(400).json({ error: "At least one participant email is required" });
  }

  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { jobs: true },
    });
    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }
    const hasJob = candidate.jobs.some((j) => j.job_id === jobId);
    if (!hasJob) {
      return res.status(400).json({ error: "jobId is not linked to this candidate" });
    }

    const meetingLink = meetingPlaceholderLink(channel);
    const participantsJson = JSON.stringify(participantsList);

    const subject = `1:1 — ${title}`;
    const summaryBody =
      description.trim() ||
      `1:1 meeting — ${meetingChannelLabel(channel)} — ${durationMinutes} min.`;

    const { comm, meetingRow } = await prisma.$transaction(async (tx) => {
      const c = await tx.communication.create({
        data: {
          candidate_id: candidateId,
          job_id: jobId,
          channel: "meeting",
          direction: "outbound",
          sender_type: "recruiter",
          sender_name: senderName,
          from_address: "contact@darwinbox.in",
          to_address: candidate.email.trim() || participantEmails[0],
          subject,
          body: summaryBody,
          delivery_status: "pending",
        },
      });
      const m = await tx.meeting.create({
        data: {
          candidate_id: candidateId,
          job_id: jobId,
          communication_id: c.id,
          title,
          description: description.trim() || null,
          organizer_id: "emp-rec-001",
          participants: participantsJson,
          duration_minutes: durationMinutes,
          scheduled_at: scheduledAt,
          channel,
          meeting_link: meetingLink,
          status: "scheduled",
        },
      });
      return { comm: c, meetingRow: m };
    });

    const apiFrom = resendFromForDisplay("contact@darwinbox.in");
    const html = buildMeetingInviteHtml({
      title,
      scheduledAt,
      durationMinutes,
      channelLabel: meetingChannelLabel(channel),
      description,
      meetingLink,
      organizerName: senderName,
    });

    const messageIds: string[] = [];
    let anyFailed = false;
    let lastError: string | undefined;
    let inviteSent = 0;
    const inviteTotal = participantEmails.length;

    for (const to of participantEmails) {
      const result = await sendEmail({
        from: apiFrom,
        to,
        subject: `[Invitation] ${subject}`,
        htmlBody: html,
      });
      if (result.success && result.messageId) {
        messageIds.push(result.messageId);
        inviteSent += 1;
      } else {
        anyFailed = true;
        lastError = result.error;
      }
    }

    const deliveryStatus = anyFailed ? "failed" : "sent";
    const vendorId =
      messageIds.length > 0 ? messageIds.join(",").slice(0, 500) : null;

    await prisma.communication.update({
      where: { id: comm.id },
      data: {
        delivery_status: deliveryStatus,
        vendor_message_id: vendorId,
      },
    });

    return res.json({
      success: !anyFailed,
      error: anyFailed ? lastError : undefined,
      communicationId: comm.id,
      meetingId: meetingRow.id,
      messageIds,
      inviteTotal,
      inviteSent,
      inviteFailed: inviteTotal - inviteSent,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

/**
 * Task 3 verification: send one test message per channel.
 * GET /api/test-send?channel=email|sms|whatsapp
 * Optional: &to=... (E.164 phone or email override)
 *
 * Note: use `&` between params. A second `?` is wrong — but we still parse
 * `?channel=email?to=user@x.com` when browsers glue that into one `channel` value.
 */
function parseTestSendQuery(req: express.Request): {
  channel: string;
  toOverride: string;
} {
  let channelRaw =
    typeof req.query.channel === "string" ? req.query.channel : "";
  let toOverride =
    typeof req.query.to === "string" ? req.query.to.trim() : "";

  // Mistake: ...?channel=email?to=me@x.com → channel becomes "email?to=me@x.com"
  const embedded = channelRaw.match(/^(\w+)\?to=(.+)$/i);
  if (embedded) {
    channelRaw = embedded[1];
    toOverride = decodeURIComponent(embedded[2].trim());
  }

  return { channel: channelRaw.trim(), toOverride };
}

app.get("/api/test-send", async (req, res) => {
  const { channel, toOverride } = parseTestSendQuery(req);
  if (!["email", "sms", "whatsapp"].includes(channel)) {
    return res.status(400).json({
      error:
        "Query param `channel` must be one of: email | sms | whatsapp. " +
        "Use `&` for more params, e.g. /api/test-send?channel=email&to=you@example.com",
    });
  }

  const link = await prisma.candidateJob.findFirst({
    include: { candidate: true, job: true },
  });
  if (!link) {
    return res.status(500).json({
      error: "No candidate/job in database. Run: npm run db:seed",
    });
  }

  try {
    if (channel === "email") {
      const to = toOverride || link.candidate.email;
      const result = await sendMessage({
        channel: "email",
        to,
        subject: "Communication Centre — test email",
        body: "<p>This is a test email from <code>/api/test-send</code>.</p>",
        candidateId: link.candidate_id,
        jobId: link.job_id,
        senderName: "Test route",
      });
      return res.json({ channel: "email", ...result });
    }

    if (channel === "sms") {
      const to = toOverride || link.candidate.phone;
      if (!to) {
        return res.status(400).json({
          error: "Candidate has no phone. Pass ?to=+E164 (e.g. +14155552671)",
        });
      }
      const result = await sendMessage({
        channel: "sms",
        to,
        body: "Communication Centre test SMS from /api/test-send",
        candidateId: link.candidate_id,
        jobId: link.job_id,
        senderName: "Test route",
      });
      return res.json({ channel: "sms", ...result });
    }

    const raw =
      toOverride ||
      link.candidate.whatsapp_number ||
      link.candidate.phone;
    if (!raw) {
      return res.status(400).json({
        error:
          "No WhatsApp or phone on candidate. Pass ?to=+E164 (sandbox recipient)",
      });
    }
    const result = await sendMessage({
      channel: "whatsapp",
      to: raw,
      body: "Communication Centre test WhatsApp from /api/test-send",
      candidateId: link.candidate_id,
      jobId: link.job_id,
      senderName: "Test route",
    });
    return res.json({ channel: "whatsapp", ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: msg });
  }
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ],
    methods: ["GET", "POST"],
  },
});
setSocketIo(io);

httpServer.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  startPolling();
});
