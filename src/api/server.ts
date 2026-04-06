import "dotenv/config";
import express from "express";
import { prisma } from "./db";
import { sendMessage } from "./services/message-sender";

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

/** Task 6: email timeline for Current Job (channel = email only). */
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
        channel: "email",
      },
      orderBy: { sent_at: "desc" },
    });

    const mapEmailRow = (row: (typeof rows)[number]) => {
      const mapped = senderLabelForTimeline(row.sender_type, row.sender_name);
      return {
        id: row.id,
        senderType: mapped.senderType,
        senderLabel: mapped.senderLabel,
        filterBucket: mapped.filterBucket,
        subject: row.subject,
        body: row.body,
        sentAt: row.sent_at.toISOString(),
      };
    };

    const emails = rows.map(mapEmailRow);

    const otherJobLinks = candidate.jobs.filter((j) => j.job_id !== jobId);
    const otherJobEmailSectionsRaw = await Promise.all(
      otherJobLinks.map(async (link) => {
        const otherRows = await prisma.communication.findMany({
          where: {
            candidate_id: candidateId,
            job_id: link.job_id,
            channel: "email",
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
          emails: otherRows.map(mapEmailRow),
        };
      }),
    );

    const otherJobEmailSections = otherJobEmailSectionsRaw.filter(
      (x): x is NonNullable<typeof x> => x != null,
    );
    otherJobEmailSections.sort(
      (a, b) =>
        new Date(b.emails[0].sentAt).getTime() -
        new Date(a.emails[0].sentAt).getTime(),
    );

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
        department: job?.department ?? "—",
        job: job ? `${job.title} (${job.job_code})` : "—",
        jobTitle: job?.title ?? "—",
        jobCode: job?.job_code ?? "",
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

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
