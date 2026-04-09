import type { Candidate, Communication, Job } from "@prisma/client";
import { prisma } from "../db";

const ACTIVITY_CHANNELS = ["email", "sms", "whatsapp", "meeting"] as const;

const THREAD_CHANNELS = [
  "email",
  "sms",
  "whatsapp",
  "meeting",
  "system_notification",
] as const;

export function getSlaMs(): number {
  const d = Number(process.env.COMMS_SLA_DAYS);
  const days = Number.isFinite(d) && d > 0 ? d : 3;
  return days * 24 * 60 * 60 * 1000;
}

export function periodBounds(period: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  switch (period) {
    case "month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case "week": {
      const dow = start.getDay();
      start.setDate(start.getDate() - dow);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case "all":
      start.setTime(0);
      break;
    case "quarter":
    default: {
      const m = start.getMonth();
      const qStart = Math.floor(m / 3) * 3;
      start.setMonth(qStart, 1);
      start.setHours(0, 0, 0, 0);
      break;
    }
  }
  return { start, end };
}

export type ActivityRowStatus = "engaged" | "pending" | "unresponsive";

function deriveStatus(
  last: Communication,
  now: number,
  slaMs: number,
): ActivityRowStatus {
  if (last.direction === "inbound") return "engaged";
  const t = last.sent_at.getTime();
  if (now - t <= slaMs) return "pending";
  return "unresponsive";
}

export type ActivityListItem = {
  communicationId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  candidateWhatsapp: string;
  jobId: string;
  jobTitle: string;
  jobCode: string;
  currentStage: string;
  channel: string;
  direction: string;
  preview: string;
  sentAt: string;
  status: ActivityRowStatus;
};

function matchesSearch(
  needle: string,
  candidateName: string,
  jobTitle: string,
  bodySnippet: string,
): boolean {
  const q = needle.trim().toLowerCase();
  if (!q) return true;
  const hay = `${candidateName} ${jobTitle} ${bodySnippet}`.toLowerCase();
  return hay.includes(q);
}

/** Comma-separated channel ids (email, sms, whatsapp, meeting). Empty = no filter. */
function parseChannelCsv(param: string): string[] {
  if (!param || !param.trim()) return [];
  const allowed = new Set<string>(ACTIVITY_CHANNELS);
  return param
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((c) => allowed.has(c));
}

export async function fetchActivityFeed(params: {
  period: string;
  /** Single status: engaged | pending | unresponsive — empty or "all" = no status filter */
  status: string;
  jobId: string;
  sort: string;
  page: number;
  limit: number;
  /** Filter by candidate name, job title, or message text (client-style contains) */
  search: string;
  /** Comma-separated: email, sms, whatsapp, meeting — empty = all channels */
  channel: string;
}): Promise<{
  items: ActivityListItem[];
  total: number;
  page: number;
  limit: number;
  summary: {
    total: number;
    engaged: number;
    pending: number;
    unresponsive: number;
  };
  slaDays: number;
}> {
  const slaMs = getSlaMs();
  const slaDays = Math.round(slaMs / (24 * 60 * 60 * 1000));
  const { start, end } = periodBounds(params.period);
  const now = Date.now();

  const jobs = await prisma.job.findMany({ select: { id: true } });
  const jobIds = jobs.map((j) => j.id);
  if (jobIds.length === 0) {
    return {
      items: [],
      total: 0,
      page: params.page,
      limit: params.limit,
      summary: { total: 0, engaged: 0, pending: 0, unresponsive: 0 },
      slaDays,
    };
  }

  const rows = await prisma.communication.findMany({
    where: {
      job_id: { in: jobIds },
      candidate_id: { not: null },
      channel: { in: [...ACTIVITY_CHANNELS] },
    },
    include: { candidate: true, job: true },
    orderBy: { sent_at: "desc" },
  });

  type PairAgg = {
    all: Communication[];
    candidate: Candidate;
    job: Job;
  };

  const byPair = new Map<string, PairAgg>();
  for (const row of rows) {
    if (!row.candidate_id || !row.job_id || !row.candidate || !row.job) continue;
    const key = `${row.candidate_id}:${row.job_id}`;
    let agg = byPair.get(key);
    if (!agg) {
      agg = { all: [], candidate: row.candidate, job: row.job };
      byPair.set(key, agg);
    }
    agg.all.push(row);
  }

  const jobFilter = params.jobId.trim();
  const searchRaw = params.search.trim();
  const channelFilter = parseChannelCsv(params.channel);

  const builtAll: ActivityListItem[] = [];

  for (const agg of byPair.values()) {
    const { all, candidate, job } = agg;
    const inPeriod = all.filter(
      (c) => c.sent_at >= start && c.sent_at <= end,
    );
    if (inPeriod.length === 0) continue;

    const anchor = inPeriod.reduce((a, b) =>
      a.sent_at >= b.sent_at ? a : b,
    );
    const lastOverall = all.reduce((a, b) =>
      a.sent_at >= b.sent_at ? a : b,
    );
    const status = deriveStatus(lastOverall, now, slaMs);

    if (jobFilter && anchor.job_id !== jobFilter) continue;

    const anchorCh = anchor.channel.toLowerCase();
    if (channelFilter.length > 0 && !channelFilter.includes(anchorCh)) {
      continue;
    }

    const body = anchor.body ?? "";
    const preview =
      body.length <= 120 ? body.trim() : `${body.slice(0, 119).trim()}…`;

    if (
      !matchesSearch(searchRaw, candidate.name, job.title, body)
    ) {
      continue;
    }

    builtAll.push({
      communicationId: anchor.id,
      candidateId: candidate.id,
      candidateName: candidate.name,
      candidateEmail: candidate.email,
      candidatePhone: candidate.phone ?? "",
      candidateWhatsapp: candidate.whatsapp_number ?? "",
      jobId: job.id,
      jobTitle: job.title,
      jobCode: job.job_code,
      currentStage: candidate.current_stage,
      channel: anchor.channel,
      direction: anchor.direction,
      preview,
      sentAt: anchor.sent_at.toISOString(),
      status,
    });
  }

  const sort = params.sort || "newest";
  if (sort === "name_asc") {
    builtAll.sort((a, b) => {
      const n = a.candidateName.localeCompare(b.candidateName);
      if (n !== 0) return n;
      return new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime();
    });
  } else if (sort === "unresponsive_first") {
    const rank: Record<ActivityRowStatus, number> = {
      unresponsive: 0,
      pending: 1,
      engaged: 2,
    };
    builtAll.sort((a, b) => {
      const dr = rank[a.status] - rank[b.status];
      if (dr !== 0) return dr;
      return new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime();
    });
  } else {
    builtAll.sort(
      (a, b) =>
        new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
    );
  }

  const summary = {
    total: builtAll.length,
    engaged: builtAll.filter((r) => r.status === "engaged").length,
    pending: builtAll.filter((r) => r.status === "pending").length,
    unresponsive: builtAll.filter((r) => r.status === "unresponsive").length,
  };

  const st = params.status.trim().toLowerCase();
  const filtered =
    st && st !== "all" && (st === "engaged" || st === "pending" || st === "unresponsive")
      ? builtAll.filter((r) => r.status === st)
      : builtAll;

  const page = Math.max(1, params.page);
  const limit = Math.min(50, Math.max(1, params.limit));
  const offset = (page - 1) * limit;
  const slice = filtered.slice(offset, offset + limit);

  return {
    items: slice,
    total: filtered.length,
    page,
    limit,
    summary: {
      total: summary.total,
      engaged: summary.engaged,
      pending: summary.pending,
      unresponsive: summary.unresponsive,
    },
    slaDays,
  };
}

export type ThreadMessage = {
  id: string;
  channel: string;
  direction: "inbound" | "outbound";
  body: string;
  sentAt: string;
  senderName: string | null;
};

export async function fetchThread(params: {
  candidateId: string;
  jobOpeningId: string;
}): Promise<{
  messages: ThreadMessage[];
  candidate: {
    id: string;
    name: string;
    email: string;
    phone: string;
    whatsappNumber: string;
    currentStage: string;
  };
  job: { id: string; title: string; jobCode: string };
  slaDays: number;
} | null> {
  const slaMs = getSlaMs();
  const slaDays = Math.round(slaMs / (24 * 60 * 60 * 1000));

  const candidate = await prisma.candidate.findUnique({
    where: { id: params.candidateId },
  });
  const job = await prisma.job.findUnique({
    where: { id: params.jobOpeningId },
  });
  if (!candidate || !job) return null;

  const hasLink = await prisma.candidateJob.findUnique({
    where: {
      candidate_id_job_id: {
        candidate_id: params.candidateId,
        job_id: params.jobOpeningId,
      },
    },
  });
  if (!hasLink) return null;

  const comms = await prisma.communication.findMany({
    where: {
      candidate_id: params.candidateId,
      job_id: params.jobOpeningId,
      channel: { in: [...THREAD_CHANNELS] },
    },
    orderBy: { sent_at: "asc" },
  });

  const messages: ThreadMessage[] = comms.map((c) => ({
    id: c.id,
    channel: c.channel,
    direction: c.direction === "inbound" ? "inbound" : "outbound",
    body: c.body,
    sentAt: c.sent_at.toISOString(),
    senderName: c.sender_name,
  }));

  return {
    messages,
    candidate: {
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone ?? "",
      whatsappNumber: candidate.whatsapp_number ?? "",
      currentStage: candidate.current_stage,
    },
    job: {
      id: job.id,
      title: job.title,
      jobCode: job.job_code,
    },
    slaDays,
  };
}
