import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import express from "express";
import { Server } from "socket.io";
import { prisma } from "./db";
import {
  emitMessageUpdated,
  emitNewMessage,
  emitSmsConsentChanged,
  emitSmsConsentUpdated,
  setSocketIo,
} from "./socket-io";
import { startPolling } from "./services/inbound-poller";
import { syncAllConnectedInboxes } from "./services/email-inbox-sync";
import {
  handleInboundSmsWebhook,
  handleStatusCallback,
} from "./services/sms-webhooks";
import {
  deliverDueScheduledCommunications,
  deliverSingleScheduledEmailById,
  sendEmail,
  sendMessage,
} from "./services/message-sender";
import {
  fetchActivityFeed,
  fetchCommsHubDashboard,
  fetchScheduledMessagesPage,
  fetchThread,
} from "./services/activity-command-center";
import {
  evaluateSmsSendEligibility,
  getAllSmsNumbers,
  getSmsNumberForUser,
  resolveInboundSmsOwner,
} from "./services/sms-number-lookup";
import {
  assignNumber as assignSmsNumberRow,
  deactivateNumber as deactivateSmsNumberRow,
  getAssignableUsers,
  provisionNumber as provisionTwilioSmsNumber,
  searchAvailableNumbers as searchTwilioAvailableNumbers,
  syncTwilioNumbers as syncTwilioSmsNumbers,
} from "./services/twilio-number-service";
import {
  buildEmailOAuthSettingsRedirectUrl,
  disconnectGoogleEmail,
  getGoogleAuthUrl,
  handleGoogleCallback,
} from "./services/email-oauth";
import {
  getAllConnectedEmails,
  getConnectedEmailForUser,
} from "./services/connected-email-lookup";

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
app.use(express.urlencoded({ extended: true }));

const SMS_INBOUND_MODE =
  process.env.SMS_INBOUND_MODE?.trim().toLowerCase() || "polling";

if (SMS_INBOUND_MODE === "webhook") {
  app.post(
    "/api/webhooks/twilio/sms/inbound",
    (req, res) => void handleInboundSmsWebhook(req, res),
  );
  app.post(
    "/api/webhooks/twilio/sms/status",
    (req, res) => void handleStatusCallback(req, res),
  );
  console.log(
    "[sms] SMS_INBOUND_MODE=webhook: POST /api/webhooks/twilio/sms/inbound | /status (SMS list polling disabled; email/WhatsApp polling unchanged)",
  );
}

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

/** Socket payloads for `new-message` / `message-updated` (includes scheduled email fields). */
function buildMessageSocketPayload(
  row: {
    id: string;
    candidate_id: string | null;
    job_id: string | null;
    channel: string;
    direction: string;
    sender_type: string;
    sender_id: string | null;
    sender_name: string | null;
    thread_id: string | null;
    from_address: string | null;
    to_address: string | null;
    cc_addresses: string | null;
    subject: string | null;
    body: string;
    template_id: string | null;
    delivery_status: string;
    vendor_message_id: string | null;
    sent_at: Date;
    read_at: Date | null;
    scheduled_for: Date | null;
    sms_number_id?: string | null;
    connected_email_id?: string | null;
    connected_email?: { email_address: string } | null;
  },
  candidate: { id: string; name: string; email: string },
  job: { id: string; title: string; job_code: string },
) {
  const ce = row.connected_email;
  const ceAddr = ce?.email_address?.trim();
  return {
    communication: {
      id: row.id,
      candidate_id: row.candidate_id,
      job_id: row.job_id,
      channel: row.channel,
      direction: row.direction,
      sender_type: row.sender_type,
      sender_id: row.sender_id,
      sender_name: row.sender_name,
      thread_id: row.thread_id,
      from_address: row.from_address,
      to_address: row.to_address,
      cc_addresses: row.cc_addresses,
      subject: row.subject,
      body: row.body,
      template_id: row.template_id,
      delivery_status: row.delivery_status,
      vendor_message_id: row.vendor_message_id,
      sent_at: row.sent_at.toISOString(),
      read_at: row.read_at ? row.read_at.toISOString() : null,
      scheduled_for: row.scheduled_for?.toISOString() ?? null,
      ...(row.sms_number_id != null
        ? { sms_number_id: row.sms_number_id }
        : {}),
      ...(row.connected_email_id != null
        ? { connected_email_id: row.connected_email_id }
        : {}),
      ...(ceAddr
        ? {
            connected_email: {
              email_address: ceAddr,
            },
          }
        : {}),
    },
    candidate,
    job,
  };
}

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
      include: {
        meeting_detail: true,
        sms_number: {
          select: {
            id: true,
            display_label: true,
            assigned_to_name: true,
            number_type: true,
          },
        },
        connected_email: {
          select: { email_address: true },
        },
      },
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
      const sn = row.sms_number;
      const cemail = row.connected_email;
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
        scheduledFor: row.scheduled_for?.toISOString() ?? null,
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
        smsNumber:
          channel === "sms" && sn
            ? {
                id: sn.id,
                displayLabel: sn.display_label,
                assignedToName: sn.assigned_to_name,
                numberType: sn.number_type,
              }
            : null,
        connectedEmail:
          channel === "email" && cemail?.email_address
            ? { emailAddress: cemail.email_address }
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
          include: {
            meeting_detail: true,
            sms_number: {
              select: {
                id: true,
                display_label: true,
                assigned_to_name: true,
                number_type: true,
              },
            },
            connected_email: {
              select: { email_address: true },
            },
          },
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
        sms_consent_status: c.sms_consent_status,
        sms_consent_at: c.sms_consent_at?.toISOString() ?? null,
        sms_opted_out_at: c.sms_opted_out_at?.toISOString() ?? null,
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
      sms_consent_status: candidate.sms_consent_status,
      sms_consent_at: candidate.sms_consent_at?.toISOString() ?? null,
      sms_opted_out_at: candidate.sms_opted_out_at?.toISOString() ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

const SMS_CONSENT_STATUSES = ["granted", "revoked", "pending"] as const;

app.patch("/api/candidates/:candidateId/sms-consent", async (req, res) => {
  const { candidateId } = req.params;
  const raw = req.body?.status;
  const status =
    typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!SMS_CONSENT_STATUSES.includes(status as (typeof SMS_CONSENT_STATUSES)[number])) {
    return res.status(400).json({
      error: "status must be granted, revoked, or pending",
    });
  }
  const now = new Date();
  const data =
    status === "granted"
      ? {
          sms_consent_status: "granted",
          sms_consent_at: now,
          sms_opted_out_at: null as Date | null,
        }
      : status === "revoked"
        ? {
            sms_consent_status: "revoked",
            sms_opted_out_at: now,
          }
        : {
            sms_consent_status: "pending",
            sms_consent_at: null,
            sms_opted_out_at: null,
          };
  try {
    const updated = await prisma.candidate.update({
      where: { id: candidateId },
      data,
    });
    emitSmsConsentUpdated({
      candidate_id: updated.id,
      sms_consent_status: updated.sms_consent_status,
      sms_consent_at: updated.sms_consent_at?.toISOString() ?? null,
      sms_opted_out_at: updated.sms_opted_out_at?.toISOString() ?? null,
    });
    res.json({
      sms_consent_status: updated.sms_consent_status,
      sms_consent_at: updated.sms_consent_at?.toISOString() ?? null,
      sms_opted_out_at: updated.sms_opted_out_at?.toISOString() ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code?: string }).code === "P2025"
    ) {
      return res.status(404).json({ error: "Candidate not found" });
    }
    res.status(500).json({ error: msg });
  }
});

app.get("/api/candidates/:candidateId/sms-eligibility", async (req, res) => {
  const { candidateId } = req.params;
  const raw =
    typeof req.query.senderUserId === "string"
      ? req.query.senderUserId.trim()
      : "";
  if (!raw) {
    return res.status(400).json({ error: "senderUserId is required" });
  }
  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { id: true, sms_consent_status: true },
    });
    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }
    const eligibility = await evaluateSmsSendEligibility(
      candidate.sms_consent_status,
      raw,
    );
    return res.json({
      eligible: eligibility.eligible,
      reason: eligibility.reason,
      message: eligibility.message,
      senderNumber: eligibility.senderNumber,
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
      phone: l.candidate.phone ?? "",
      whatsappNumber: l.candidate.whatsapp_number ?? "",
      jobCount: countMap.get(l.candidate_id) ?? 1,
      sms_consent_status: l.candidate.sms_consent_status,
      sms_consent_at: l.candidate.sms_consent_at?.toISOString() ?? null,
      sms_opted_out_at: l.candidate.sms_opted_out_at?.toISOString() ?? null,
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
    /** Seed user id (e.g. emp-rec-001) for optional Gmail send via connected inbox */
    senderUserId?: string | null;
    /** Existing thread id or root communication id (Task 13). */
    threadId?: string | null;
    /** ISO 8601 — when set, email is stored as scheduled (no Resend until worker runs). */
    scheduledFor?: string | null;
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
  const senderUserId =
    typeof body.senderUserId === "string" && body.senderUserId.trim()
      ? body.senderUserId.trim()
      : undefined;
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

    const scheduledForRaw =
      typeof body.scheduledFor === "string" ? body.scheduledFor.trim() : "";

    if (scheduledForRaw) {
      const scheduledDate = new Date(scheduledForRaw);
      if (Number.isNaN(scheduledDate.getTime())) {
        return res.status(400).json({ error: "Invalid scheduledFor" });
      }
      const minTime = Date.now() + 5 * 60 * 1000;
      if (scheduledDate.getTime() < minTime) {
        return res.status(400).json({
          error: "scheduledFor must be at least 5 minutes from now",
        });
      }

      const row = await prisma.communication.create({
        data: {
          candidate: { connect: { id: candidateId } },
          job: { connect: { id: jobId } },
          channel: "email",
          direction: "outbound",
          sender_type: "recruiter",
          sender_name: senderName,
          thread_id: resolvedThreadId,
          from_address: fromAddress,
          to_address: to,
          cc_addresses: cc.length ? JSON.stringify(cc) : null,
          subject,
          body: htmlBody,
          ...(templateId ? { template: { connect: { id: templateId } } } : {}),
          delivery_status: "scheduled",
          scheduled_for: scheduledDate,
          vendor_message_id: null,
          sent_at: new Date(),
        },
      });

      return res.json({
        success: true,
        scheduled: true,
        communicationId: row.id,
        scheduledFor: row.scheduled_for!.toISOString(),
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
      senderUserId,
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

app.post(
  "/api/candidates/:candidateId/scheduled-emails/:communicationId/cancel",
  async (req, res) => {
    const { candidateId, communicationId } = req.params;
    try {
      const existing = await prisma.communication.findFirst({
        where: {
          id: communicationId,
          candidate_id: candidateId,
          channel: "email",
          delivery_status: "scheduled",
        },
        include: { job: true },
      });
      if (!existing) {
        return res.status(404).json({ error: "Scheduled email not found" });
      }

      const updated = await prisma.communication.update({
        where: { id: communicationId },
        /** Keep `scheduled_for` so the timeline can show struck-through “Sends …”. */
        data: { delivery_status: "cancelled" },
        include: {
          job: true,
          connected_email: { select: { email_address: true } },
        },
      });

      const candidate = await prisma.candidate.findUnique({
        where: { id: candidateId },
        select: { id: true, name: true, email: true },
      });
      if (candidate && updated.job_id && updated.job) {
        emitMessageUpdated(
          buildMessageSocketPayload(updated, candidate, {
            id: updated.job.id,
            title: updated.job.title,
            job_code: updated.job.job_code,
          }),
        );
      }

      return res.json({ ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return res.status(500).json({ error: msg });
    }
  },
);

app.post(
  "/api/communications/:communicationId/send-now",
  async (req, res) => {
    const { communicationId } = req.params;
    try {
      const result = await deliverSingleScheduledEmailById(communicationId);
      if (!result.ok) {
        return res.status(404).json({ error: "Scheduled email not found" });
      }
      const row = result.row;
      if (row.candidate_id && row.job_id && row.job) {
        const candidate = await prisma.candidate.findUnique({
          where: { id: row.candidate_id },
          select: { id: true, name: true, email: true },
        });
        if (candidate) {
          emitMessageUpdated(
            buildMessageSocketPayload(row, candidate, {
              id: row.job.id,
              title: row.job.title,
              job_code: row.job.job_code,
            }),
          );
        }
      }
      return res.json({
        ok: true,
        deliveryStatus: row.delivery_status,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return res.status(500).json({ error: msg });
    }
  },
);

app.post(
  "/api/communications/:communicationId/cancel-scheduled",
  async (req, res) => {
    const { communicationId } = req.params;
    try {
      const existing = await prisma.communication.findFirst({
        where: {
          id: communicationId,
          channel: { in: ["email", "sms", "whatsapp"] },
          delivery_status: "scheduled",
        },
        include: { job: true },
      });
      if (!existing) {
        return res.status(404).json({ error: "Scheduled message not found" });
      }

      const updated = await prisma.communication.update({
        where: { id: communicationId },
        data: { delivery_status: "cancelled" },
        include: {
          job: true,
          connected_email: { select: { email_address: true } },
        },
      });

      const candidateId = updated.candidate_id;
      if (candidateId && updated.job_id && updated.job) {
        const candidate = await prisma.candidate.findUnique({
          where: { id: candidateId },
          select: { id: true, name: true, email: true },
        });
        if (candidate) {
          emitMessageUpdated(
            buildMessageSocketPayload(updated, candidate, {
              id: updated.job.id,
              title: updated.job.title,
              job_code: updated.job.job_code,
            }),
          );
        }
      }

      return res.json({ ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return res.status(500).json({ error: msg });
    }
  },
);

app.patch("/api/communications/:communicationId", async (req, res) => {
  const { communicationId } = req.params;
  const body = req.body as {
    subject?: string;
    htmlBody?: string;
    scheduledFor?: string;
  };

  try {
    const existing = await prisma.communication.findFirst({
      where: {
        id: communicationId,
        channel: { in: ["email", "sms", "whatsapp"] },
        delivery_status: "scheduled",
      },
      include: { job: true },
    });
    if (!existing) {
      return res.status(404).json({ error: "Scheduled message not found" });
    }

    const data: {
      subject?: string;
      body?: string;
      scheduled_for?: Date;
    } = {};

    if (existing.channel === "email") {
      if (typeof body.subject === "string" && body.subject.trim()) {
        data.subject = body.subject.trim();
      }
      if (typeof body.htmlBody === "string" && body.htmlBody.trim()) {
        data.body = body.htmlBody;
      }
    } else {
      if (typeof body.htmlBody === "string" && body.htmlBody.trim()) {
        data.body = body.htmlBody;
      }
    }
    const scheduledForRaw =
      typeof body.scheduledFor === "string" ? body.scheduledFor.trim() : "";
    if (scheduledForRaw) {
      const scheduledDate = new Date(scheduledForRaw);
      if (Number.isNaN(scheduledDate.getTime())) {
        return res.status(400).json({ error: "Invalid scheduledFor" });
      }
      const minTime = Date.now() + 5 * 60 * 1000;
      if (scheduledDate.getTime() < minTime) {
        return res.status(400).json({
          error: "scheduledFor must be at least 5 minutes from now",
        });
      }
      data.scheduled_for = scheduledDate;
    }

    if (
      data.subject === undefined &&
      data.body === undefined &&
      data.scheduled_for === undefined
    ) {
      return res.status(400).json({ error: "No updates provided" });
    }

    const updated = await prisma.communication.update({
      where: { id: communicationId },
      data,
      include: {
        job: true,
        connected_email: { select: { email_address: true } },
      },
    });

    const candidateId = updated.candidate_id;
    if (candidateId && updated.job_id && updated.job) {
      const candidate = await prisma.candidate.findUnique({
        where: { id: candidateId },
        select: { id: true, name: true, email: true },
      });
      if (candidate) {
        emitMessageUpdated(
          buildMessageSocketPayload(updated, candidate, {
            id: updated.job.id,
            title: updated.job.title,
            job_code: updated.job.job_code,
          }),
        );
      }
    }

    return res.json({
      ok: true,
      scheduledFor: updated.scheduled_for?.toISOString() ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: msg });
  }
});

app.get("/api/admin/sms/numbers", async (_req, res) => {
  try {
    const numbers = await getAllSmsNumbers();
    return res.json({ numbers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: msg });
  }
});

app.get("/api/admin/sms/opt-out-summary", async (_req, res) => {
  try {
    const [granted, pending, optedOut] = await Promise.all([
      prisma.candidate.count({ where: { sms_consent_status: "granted" } }),
      prisma.candidate.count({ where: { sms_consent_status: "pending" } }),
      prisma.candidate.count({ where: { sms_consent_status: "revoked" } }),
    ]);
    return res.json({ granted, pending, optedOut });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: msg });
  }
});

app.get("/api/admin/sms/config", (_req, res) => {
  const mode =
    process.env.SMS_INBOUND_MODE?.trim().toLowerCase() || "polling";
  const smsInboundMode = mode === "webhook" ? "webhook" : "polling";
  const webhookBaseUrl = process.env.WEBHOOK_BASE_URL?.trim() || null;
  return res.json({
    smsInboundMode,
    webhookBaseUrl,
    compliance: {
      brandRegistrationStatus: "verified",
      campaignStatus: "approved",
      trustScore: 82,
    },
  });
});

app.get("/api/admin/sms/assignable-users", (_req, res) => {
  return res.json({ users: getAssignableUsers() });
});

app.get("/api/admin/sms/available-numbers", async (req, res) => {
  try {
    const country =
      typeof req.query.country === "string" && req.query.country.trim()
        ? req.query.country.trim().toUpperCase()
        : "US";
    const areaCode =
      typeof req.query.areaCode === "string" ? req.query.areaCode.trim() : "";
    const contains =
      typeof req.query.contains === "string" ? req.query.contains.trim() : "";
    const limitRaw =
      typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : NaN;
    const limit = Number.isFinite(limitRaw) ? limitRaw : undefined;

    const numbers = await searchTwilioAvailableNumbers({
      country,
      ...(areaCode ? { areaCode } : {}),
      ...(contains ? { contains } : {}),
      ...(limit !== undefined ? { limit } : {}),
    });
    return res.json({ numbers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = /not configured/i.test(msg) ? 503 : 400;
    return res.status(status).json({ error: msg });
  }
});

app.post("/api/admin/sms/provision", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const phoneNumber =
      typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : "";
    const displayLabel =
      typeof body.displayLabel === "string" ? body.displayLabel.trim() : "";
    const numberTypeRaw =
      typeof body.numberType === "string" ? body.numberType.trim().toLowerCase() : "";
    const numberType =
      numberTypeRaw === "shared" ? "shared" : "dedicated";
    const assignedToId =
      typeof body.assignedToId === "string" && body.assignedToId.trim()
        ? body.assignedToId.trim()
        : null;
    const assignedToName =
      typeof body.assignedToName === "string" && body.assignedToName.trim()
        ? body.assignedToName.trim()
        : null;

    if (!phoneNumber) {
      return res.status(400).json({ error: "phoneNumber is required" });
    }

    const row = await provisionTwilioSmsNumber({
      phoneNumber,
      displayLabel: displayLabel || phoneNumber,
      numberType,
      assignedToId,
      assignedToName,
    });
    return res.status(201).json({ number: row });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = /not configured/i.test(msg) ? 503 : 400;
    return res.status(status).json({ error: msg });
  }
});

app.post("/api/admin/sms/sync-twilio", async (_req, res) => {
  try {
    const result = await syncTwilioSmsNumbers();
    return res.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = /not configured/i.test(msg) ? 503 : 500;
    return res.status(status).json({ error: msg });
  }
});

app.patch("/api/admin/sms/numbers/:id/assign", async (req, res) => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id.trim() : "";
    if (!id) return res.status(400).json({ error: "id is required" });

    const body = req.body as Record<string, unknown>;
    const assignedToId =
      body.assignedToId === null
        ? null
        : typeof body.assignedToId === "string"
          ? body.assignedToId.trim() || null
          : undefined;
    const assignedToName =
      body.assignedToName === null
        ? null
        : typeof body.assignedToName === "string"
          ? body.assignedToName.trim() || null
          : undefined;
    const numberTypeRaw =
      typeof body.numberType === "string" ? body.numberType.trim().toLowerCase() : "";
    const numberType =
      numberTypeRaw === "shared"
        ? "shared"
        : numberTypeRaw === "dedicated"
          ? "dedicated"
          : undefined;
    const displayLabel =
      body.displayLabel === null
        ? null
        : typeof body.displayLabel === "string"
          ? body.displayLabel
          : undefined;

    const updated = await assignSmsNumberRow(id, {
      ...(assignedToId !== undefined ? { assignedToId } : {}),
      ...(assignedToName !== undefined ? { assignedToName } : {}),
      ...(numberType !== undefined ? { numberType } : {}),
      ...(displayLabel !== undefined ? { displayLabel } : {}),
    });
    return res.json({ number: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code: string }).code === "P2025"
    ) {
      return res.status(404).json({ error: "SMS number not found" });
    }
    return res.status(500).json({ error: msg });
  }
});

app.patch("/api/admin/sms/numbers/:id/deactivate", async (req, res) => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id.trim() : "";
    if (!id) return res.status(400).json({ error: "id is required" });
    const updated = await deactivateSmsNumberRow(id);
    return res.json({ number: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code: string }).code === "P2025"
    ) {
      return res.status(404).json({ error: "SMS number not found" });
    }
    return res.status(500).json({ error: msg });
  }
});

app.get("/api/sms-numbers/for-user/:userId", async (req, res) => {
  try {
    const userId =
      typeof req.params.userId === "string" ? req.params.userId.trim() : "";
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    const row = await getSmsNumberForUser(userId);
    const envFallback = process.env.TWILIO_PHONE_NUMBER?.trim() ?? null;
    if (row) {
      return res.json({
        phoneNumber: row.phone_number,
        displayLabel: row.display_label?.trim() || row.phone_number,
        fromDatabase: true,
      });
    }
    return res.json({
      phoneNumber: envFallback,
      displayLabel: envFallback ? "Default (environment)" : null,
      fromDatabase: false,
      ...(envFallback
        ? {}
        : {
            warning:
              "No SMS number is assigned for this user and TWILIO_PHONE_NUMBER is not set.",
          }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

app.get("/api/auth/email/connect/google", (req, res) => {
  const userId =
    typeof req.query.userId === "string" ? req.query.userId.trim() : "";
  if (!userId) {
    return res.status(400).json({ error: "userId query parameter is required" });
  }
  try {
    const url = getGoogleAuthUrl(userId);
    return res.redirect(302, url);
  } catch (e) {
    console.error("[email-oauth] connect URL failed:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return res.redirect(
      302,
      buildEmailOAuthSettingsRedirectUrl({
        email_oauth_error: "config",
        email_oauth_message: msg,
      }),
    );
  }
});

app.get("/api/auth/email/callback", async (req, res) => {
  const code = typeof req.query.code === "string" ? req.query.code.trim() : "";
  const stateRaw =
    typeof req.query.state === "string" ? req.query.state.trim() : "";

  const failRedirect = (reason: string, message?: string) => {
    console.error("[email-oauth] callback error:", reason, message ?? "");
    return res.redirect(
      302,
      buildEmailOAuthSettingsRedirectUrl({
        email_oauth_error: reason,
        ...(message ? { email_oauth_message: message } : {}),
      }),
    );
  };

  if (!code) {
    return failRedirect("missing_code");
  }
  if (!stateRaw) {
    return failRedirect("missing_state");
  }

  let userId: string;
  try {
    const parsed = JSON.parse(stateRaw) as { userId?: string };
    userId = typeof parsed.userId === "string" ? parsed.userId.trim() : "";
    if (!userId) {
      return failRedirect("invalid_state", "userId missing in state");
    }
  } catch (e) {
    console.error("[email-oauth] state JSON parse failed:", e);
    return failRedirect("invalid_state");
  }

  try {
    await handleGoogleCallback(code, userId);
    return res.redirect(
      302,
      buildEmailOAuthSettingsRedirectUrl({ email_oauth: "success" }),
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[email-oauth] handleGoogleCallback failed:", e);
    return failRedirect("token_exchange", msg);
  }
});

app.get("/api/auth/email/status", async (req, res) => {
  const userId =
    typeof req.query.userId === "string" ? req.query.userId.trim() : "";
  if (!userId) {
    return res.status(400).json({ error: "userId query parameter is required" });
  }
  try {
    const row = await getConnectedEmailForUser(userId);
    if (!row) {
      return res.json({ connected: false });
    }
    return res.json({
      connected: true,
      connectedEmailId: row.id,
      email: row.email_address,
      provider: row.provider,
      lastSyncAt: row.last_sync_at?.toISOString() ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[email-oauth] status failed:", e);
    return res.status(500).json({ error: msg });
  }
});

app.delete("/api/auth/email/disconnect/:id", async (req, res) => {
  const id = typeof req.params.id === "string" ? req.params.id.trim() : "";
  if (!id) {
    return res.status(400).json({ error: "id is required" });
  }
  try {
    await disconnectGoogleEmail(id);
    return res.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[email-oauth] disconnect failed:", e);
    if (msg.includes("not found")) {
      return res.status(404).json({ error: msg });
    }
    return res.status(500).json({ error: msg });
  }
});

app.get("/api/auth/email/connected-emails", async (_req, res) => {
  try {
    const rows = await getAllConnectedEmails();
    return res.json(rows);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[email-oauth] connected-emails failed:", e);
    return res.status(500).json({ error: msg });
  }
});

app.post("/api/candidates/:candidateId/compose-sms", async (req, res) => {
  const { candidateId } = req.params;
  const body = req.body as {
    jobId?: string;
    text?: string;
    senderName?: string;
    senderUserId?: string;
  };

  const jobId = typeof body.jobId === "string" ? body.jobId.trim() : "";
  const text = typeof body.text === "string" ? body.text : "";
  const senderName =
    typeof body.senderName === "string" && body.senderName.trim()
      ? body.senderName.trim()
      : "Recruiter";
  const senderUserId =
    typeof body.senderUserId === "string" && body.senderUserId.trim()
      ? body.senderUserId.trim()
      : undefined;

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

    const eligibility = await evaluateSmsSendEligibility(
      candidate.sms_consent_status,
      senderUserId,
    );
    if (!eligibility.eligible) {
      return res.status(403).json({
        code: eligibility.reason,
        error: eligibility.message,
      });
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
      senderUserId,
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

/** Activity Command Center — recruitment comms hub (Task: analytics activity + thread). */
app.get(
  "/api/v1/recruitment/comms-hub/analytics/activity",
  async (req, res) => {
    const period =
      typeof req.query.period === "string" && req.query.period.trim()
        ? req.query.period.trim()
        : "quarter";
    const status =
      typeof req.query.status === "string" ? req.query.status.trim() : "";
    const jobId =
      typeof req.query.job_id === "string" ? req.query.job_id.trim() : "";
    const sort =
      typeof req.query.sort === "string" && req.query.sort.trim()
        ? req.query.sort.trim()
        : "newest";
    const search =
      typeof req.query.q === "string" ? req.query.q.trim() : "";
    const channel =
      typeof req.query.channel === "string" ? req.query.channel.trim() : "";
    const smsOwnerIdRaw =
      typeof req.query.sms_owner_id === "string"
        ? req.query.sms_owner_id.trim()
        : "";
    const smsConsentRaw =
      typeof req.query.sms_consent === "string"
        ? req.query.sms_consent.trim()
        : "";
    const page = Math.max(
      1,
      Number.parseInt(String(req.query.page ?? "1"), 10) || 1,
    );
    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(String(req.query.limit ?? "10"), 10) || 10),
    );

    try {
      const result = await fetchActivityFeed({
        period,
        status,
        jobId,
        sort,
        page,
        limit,
        search,
        channel,
        smsOwnerId: smsOwnerIdRaw || undefined,
        smsConsent: smsConsentRaw || undefined,
      });
      res.json(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ error: msg });
    }
  },
);

app.get(
  "/api/v1/recruitment/comms-hub/analytics/dashboard",
  async (req, res) => {
    const period =
      typeof req.query.period === "string" && req.query.period.trim()
        ? req.query.period.trim()
        : "quarter";
    const jobOpeningId =
      typeof req.query.job_opening_id === "string"
        ? req.query.job_opening_id.trim()
        : "";

    if (
      period !== "week" &&
      period !== "month" &&
      period !== "quarter" &&
      period !== "all"
    ) {
      return res.status(400).json({
        error: "period must be week, month, quarter, or all",
      });
    }

    try {
      const data = await fetchCommsHubDashboard({
        period,
        jobOpeningId: jobOpeningId || undefined,
      });
      res.json(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ error: msg });
    }
  },
);

app.get(
  "/api/v1/recruitment/comms-hub/analytics/scheduled",
  async (req, res) => {
    const jobOpeningId =
      typeof req.query.job_opening_id === "string"
        ? req.query.job_opening_id.trim()
        : "";
    const pageRaw =
      typeof req.query.page === "string" ? req.query.page.trim() : "1";
    const limitRaw =
      typeof req.query.limit === "string" ? req.query.limit.trim() : "20";
    const page = Math.max(1, Number.parseInt(pageRaw, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(limitRaw, 10) || 20));

    try {
      const data = await fetchScheduledMessagesPage({
        jobOpeningId: jobOpeningId || undefined,
        page,
        limit,
      });
      res.json(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ error: msg });
    }
  },
);

app.post("/api/meetings/:meetingId/cancel-scheduled", async (req, res) => {
  const { meetingId } = req.params;
  try {
    const m = await prisma.meeting.findFirst({
      where: { id: meetingId, status: "scheduled" },
      include: { communication: true, job: true },
    });
    if (!m) {
      return res.status(404).json({ error: "Scheduled meeting not found" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.meeting.update({
        where: { id: meetingId },
        data: { status: "cancelled" },
      });
      if (m.communication_id) {
        await tx.communication.update({
          where: { id: m.communication_id },
          data: { delivery_status: "cancelled" },
        });
      }
    });

    const updatedComm = m.communication_id
      ? await prisma.communication.findUnique({
          where: { id: m.communication_id },
          include: {
            job: true,
            connected_email: { select: { email_address: true } },
          },
        })
      : null;
    if (updatedComm?.candidate_id && updatedComm.job_id && updatedComm.job) {
      const candidate = await prisma.candidate.findUnique({
        where: { id: updatedComm.candidate_id },
        select: { id: true, name: true, email: true },
      });
      if (candidate) {
        emitMessageUpdated(
          buildMessageSocketPayload(updatedComm, candidate, {
            id: updatedComm.job.id,
            title: updatedComm.job.title,
            job_code: updatedComm.job.job_code,
          }),
        );
      }
    }

    return res.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: msg });
  }
});

app.get("/api/v1/recruitment/comms-hub/thread", async (req, res) => {
  const candidateId =
    typeof req.query.candidate_id === "string"
      ? req.query.candidate_id.trim()
      : "";
  const jobOpeningId =
    typeof req.query.job_opening_id === "string"
      ? req.query.job_opening_id.trim()
      : "";
  if (!candidateId || !jobOpeningId) {
    return res
      .status(400)
      .json({ error: "candidate_id and job_opening_id are required" });
  }
  try {
    const data = await fetchThread({
      candidateId,
      jobOpeningId,
    });
    if (!data) {
      return res.status(404).json({ error: "Thread not found" });
    }
    res.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

/** Same anchors as inbound SMS threading (see inbound-poller). */
const SIM_SMS_THREAD_ANCHOR_CHANNELS = ["email", "sms", "whatsapp"] as const;

function simOutboundThreadAnchorId(row: {
  id: string;
  thread_id: string | null;
}): string {
  return row.thread_id?.trim() || row.id;
}

const SMS_SIM_STOP_KEYWORDS = new Set([
  "stop",
  "unsubscribe",
  "cancel",
  "end",
  "quit",
]);

function isSimInboundSmsStopKeyword(body: string): boolean {
  const t = body.trim().toLowerCase();
  return t.length > 0 && SMS_SIM_STOP_KEYWORDS.has(t);
}

app.get("/api/dev/candidates-for-sim", async (_req, res) => {
  try {
    const rows = await prisma.candidate.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        phone: true,
        sms_consent_status: true,
        jobs: {
          where: { is_current: true },
          take: 1,
          select: { job: { select: { title: true } } },
        },
      },
    });
    res.json(
      rows.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        currentJobTitle: c.jobs[0]?.job.title ?? null,
        sms_consent_status: c.sms_consent_status,
      })),
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

app.post("/api/dev/simulate-inbound-sms", async (req, res) => {
  const candidateId =
    typeof req.body?.candidateId === "string"
      ? req.body.candidateId.trim()
      : "";
  const bodyText = typeof req.body?.body === "string" ? req.body.body : "";
  const jobIdFromBody =
    typeof req.body?.jobId === "string" ? req.body.jobId.trim() : "";

  if (!candidateId) {
    return res.status(400).json({ error: "candidateId is required" });
  }

  const twilioTo = process.env.TWILIO_PHONE_NUMBER?.trim() ?? "";
  if (!twilioTo) {
    return res.status(400).json({ error: "TWILIO_PHONE_NUMBER is not set" });
  }

  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    });
    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    const fromPhone = candidate.phone?.trim() ?? "";
    if (!fromPhone) {
      return res.status(400).json({ error: "Candidate has no phone number" });
    }

    let jobId: string | null = jobIdFromBody || null;
    if (jobId) {
      const link = await prisma.candidateJob.findUnique({
        where: {
          candidate_id_job_id: { candidate_id: candidateId, job_id: jobId },
        },
      });
      if (!link) {
        return res
          .status(400)
          .json({ error: "jobId is not linked to this candidate" });
      }
    } else {
      const current = await prisma.candidateJob.findFirst({
        where: { candidate_id: candidateId, is_current: true },
      });
      jobId = current?.job_id ?? null;
    }
    if (!jobId) {
      return res.status(400).json({
        error:
          "Could not resolve job: pass jobId or set a current job (CandidateJob is_current=true)",
      });
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, title: true, job_code: true },
    });
    if (!job) {
      return res.status(400).json({ error: "Job not found" });
    }

    const lastOutboundSms = await prisma.communication.findFirst({
      where: {
        candidate_id: candidateId,
        channel: "sms",
        direction: "outbound",
      },
      orderBy: { sent_at: "desc" },
    });
    let threadId: string | null = null;
    if (lastOutboundSms) {
      threadId = simOutboundThreadAnchorId(lastOutboundSms);
    } else {
      const lastOutboundAny = await prisma.communication.findFirst({
        where: {
          candidate_id: candidateId,
          direction: "outbound",
          channel: { in: [...SIM_SMS_THREAD_ANCHOR_CHANNELS] },
        },
        orderBy: { sent_at: "desc" },
      });
      if (lastOutboundAny) {
        threadId = simOutboundThreadAnchorId(lastOutboundAny);
      }
    }

    const inboundOwner = await resolveInboundSmsOwner(fromPhone, twilioTo);

    const vendorMessageId = `SIM_${Date.now()}`;
    const sentAt = new Date();

    const created = await prisma.communication.create({
      data: {
        candidate_id: candidateId,
        job_id: jobId,
        unmatched: false,
        channel: "sms",
        direction: "inbound",
        sender_type: "candidate",
        sender_name: null,
        thread_id: threadId,
        from_address: fromPhone,
        to_address: twilioTo,
        subject: null,
        body: bodyText,
        delivery_status: "delivered",
        vendor_message_id: vendorMessageId,
        sent_at: sentAt,
        read_at: null,
        ...(inboundOwner.smsNumberId
          ? { sms_number_id: inboundOwner.smsNumberId }
          : {}),
      },
    });

    let row = created;
    if (!threadId) {
      row = await prisma.communication.update({
        where: { id: created.id },
        data: { thread_id: created.id },
      });
    }

    if (isSimInboundSmsStopKeyword(bodyText)) {
      const updated = await prisma.candidate.update({
        where: { id: candidateId },
        data: {
          sms_consent_status: "revoked",
          sms_opted_out_at: new Date(),
        },
      });
      emitSmsConsentChanged({
        candidateId: updated.id,
        status: "revoked",
      });
      emitSmsConsentUpdated({
        candidate_id: updated.id,
        sms_consent_status: updated.sms_consent_status,
        sms_consent_at: updated.sms_consent_at?.toISOString() ?? null,
        sms_opted_out_at: updated.sms_opted_out_at?.toISOString() ?? null,
      });
    }

    emitNewMessage({
      communication: {
        id: row.id,
        candidate_id: row.candidate_id,
        job_id: row.job_id,
        channel: row.channel,
        direction: row.direction,
        sender_type: row.sender_type,
        sender_id: row.sender_id,
        sender_name: row.sender_name,
        thread_id: row.thread_id,
        from_address: row.from_address,
        to_address: row.to_address,
        cc_addresses: row.cc_addresses,
        subject: row.subject,
        body: row.body,
        template_id: row.template_id,
        delivery_status: row.delivery_status,
        vendor_message_id: row.vendor_message_id,
        sent_at: row.sent_at.toISOString(),
        read_at: row.read_at ? row.read_at.toISOString() : null,
        scheduled_for: row.scheduled_for?.toISOString() ?? null,
        sms_number_id: row.sms_number_id ?? null,
      },
      candidate: {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
      },
      job: {
        id: job.id,
        title: job.title,
        job_code: job.job_code,
      },
      smsNumberOwner: {
        smsNumberId: inboundOwner.smsNumberId,
        ownerId: inboundOwner.ownerId,
        ownerName: inboundOwner.ownerName,
        lineLabel: inboundOwner.lineLabel,
      },
      ...(inboundOwner.smsNumberId != null
        ? {
            sms_line: {
              id: inboundOwner.smsNumberId,
              display_label: inboundOwner.lineLabel,
              assigned_to_id: inboundOwner.ownerId,
              assigned_to_name: inboundOwner.ownerName,
            },
          }
        : {}),
    });

    return res.json({
      success: true,
      communicationId: row.id,
      routedTo: inboundOwner.ownerId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: msg });
  }
});

app.post("/api/dev/simulate-inbound-email", async (req, res) => {
  const candidateId =
    typeof req.body?.candidateId === "string"
      ? req.body.candidateId.trim()
      : "";
  const bodyText = typeof req.body?.body === "string" ? req.body.body : null;
  const jobIdFromBody =
    typeof req.body?.jobId === "string" ? req.body.jobId.trim() : "";
  const subjectRaw =
    typeof req.body?.subject === "string" ? req.body.subject.trim() : "";

  if (!candidateId) {
    return res.status(400).json({ error: "candidateId is required" });
  }
  if (bodyText === null) {
    return res.status(400).json({ error: "body is required" });
  }

  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        name: true,
        email: true,
        recruiter_id: true,
      },
    });
    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    const fromEmail = candidate.email?.trim() ?? "";
    if (!fromEmail) {
      return res.status(400).json({ error: "Candidate has no email address" });
    }

    let jobId: string | null = jobIdFromBody || null;
    if (jobId) {
      const link = await prisma.candidateJob.findUnique({
        where: {
          candidate_id_job_id: { candidate_id: candidateId, job_id: jobId },
        },
      });
      if (!link) {
        return res
          .status(400)
          .json({ error: "jobId is not linked to this candidate" });
      }
    } else {
      const current = await prisma.candidateJob.findFirst({
        where: { candidate_id: candidateId, is_current: true },
      });
      jobId = current?.job_id ?? null;
    }
    if (!jobId) {
      return res.status(400).json({
        error:
          "Could not resolve job: pass jobId or set a current job (CandidateJob is_current=true)",
      });
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, title: true, job_code: true },
    });
    if (!job) {
      return res.status(400).json({ error: "Job not found" });
    }

    const recruiterId = candidate.recruiter_id?.trim() ?? "";
    const connectedEmail = recruiterId
      ? await getConnectedEmailForUser(recruiterId)
      : null;

    const lastOutboundEmail = await prisma.communication.findFirst({
      where: {
        candidate_id: candidateId,
        channel: "email",
        direction: "outbound",
      },
      orderBy: { sent_at: "desc" },
    });

    const resolvedSubject = subjectRaw
      ? subjectRaw
      : lastOutboundEmail?.subject?.trim()
        ? `Re: ${lastOutboundEmail.subject.trim()}`
        : "Re: (no subject)";

    let threadId: string | null = null;
    if (lastOutboundEmail) {
      threadId =
        lastOutboundEmail.thread_id?.trim() || lastOutboundEmail.id || null;
    }

    const toAddress =
      connectedEmail?.email_address?.trim() || "contact@darwinbox.in";
    const vendorMessageId = `EMAIL_SIM_${Date.now()}`;
    const sentAt = new Date();

    const created = await prisma.communication.create({
      data: {
        candidate_id: candidateId,
        job_id: jobId,
        unmatched: false,
        channel: "email",
        direction: "inbound",
        sender_type: "candidate",
        sender_name: candidate.name,
        thread_id: threadId,
        from_address: fromEmail,
        to_address: toAddress,
        subject: resolvedSubject,
        body: bodyText,
        delivery_status: "delivered",
        vendor_message_id: vendorMessageId,
        sent_at: sentAt,
        read_at: null,
        ...(connectedEmail ? { connected_email_id: connectedEmail.id } : {}),
      },
    });

    let row = created;
    if (!threadId) {
      row = await prisma.communication.update({
        where: { id: created.id },
        data: { thread_id: created.id },
      });
    }

    emitNewMessage({
      communication: {
        id: row.id,
        candidate_id: row.candidate_id,
        job_id: row.job_id,
        channel: row.channel,
        direction: row.direction,
        sender_type: row.sender_type,
        sender_id: row.sender_id,
        sender_name: row.sender_name,
        thread_id: row.thread_id,
        from_address: row.from_address,
        to_address: row.to_address,
        cc_addresses: row.cc_addresses,
        subject: row.subject,
        body: row.body,
        template_id: row.template_id,
        delivery_status: row.delivery_status,
        vendor_message_id: row.vendor_message_id,
        sent_at: row.sent_at.toISOString(),
        read_at: row.read_at ? row.read_at.toISOString() : null,
        scheduled_for: row.scheduled_for?.toISOString() ?? null,
        ...(row.connected_email_id != null
          ? {
              connected_email_id: row.connected_email_id,
              ...(connectedEmail
                ? {
                    connected_email: {
                      email_address: connectedEmail.email_address,
                    },
                  }
                : {}),
            }
          : {}),
      },
      candidate: {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
      },
      job: {
        id: job.id,
        title: job.title,
        job_code: job.job_code,
      },
    });

    return res.json({
      success: true,
      communicationId: row.id,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: msg });
  }
});

// Serve Vite frontend build in production
if (process.env.NODE_ENV === "production") {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const distPath = path.resolve(__dirname, "../../dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const httpServer = createServer(app);
const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? [process.env.PUBLIC_URL || ""].filter(Boolean)
    : ["http://localhost:5173", "http://127.0.0.1:5173"];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    methods: ["GET", "POST"],
  },
});
setSocketIo(io);

async function runScheduledEmailSweep() {
  try {
    const rows = await deliverDueScheduledCommunications();
    for (const row of rows) {
      if (!row.candidate_id || !row.job_id || !row.job) continue;
      const candidate = await prisma.candidate.findUnique({
        where: { id: row.candidate_id },
        select: { id: true, name: true, email: true },
      });
      if (!candidate) continue;
      emitMessageUpdated(
        buildMessageSocketPayload(row, candidate, {
          id: row.job.id,
          title: row.job.title,
          job_code: row.job.job_code,
        }),
      );
    }
  } catch (e) {
    console.error("[scheduled-email] sweep failed:", e);
  }
}

setInterval(() => {
  void runScheduledEmailSweep();
}, 60_000);

const EMAIL_SYNC_MODE = (process.env.EMAIL_SYNC_MODE || "disabled")
  .trim()
  .toLowerCase();

async function runEmailInboxSyncTick(): Promise<void> {
  const activeConnected = await prisma.connectedEmail.count({
    where: { is_active: true, provider: "google" },
  });
  if (activeConnected === 0) return;
  await syncAllConnectedInboxes();
}

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`API listening on 0.0.0.0:${PORT}`);
  startPolling();

  if (EMAIL_SYNC_MODE === "polling") {
    console.log(
      "📧 Email Sync: POLLING — checking connected inboxes every 60s",
    );
    setInterval(() => {
      void runEmailInboxSyncTick();
    }, 60_000);
    void runEmailInboxSyncTick();
  } else {
    console.log("📧 Email Sync: DISABLED");
  }
});
