import type { Candidate, Communication, Job } from "@prisma/client";
import type { CurrentJobEmailRow } from "../candidatesClient";
import { prisma } from "../db";
import {
  getActivityPrimaryActionFromTimelineRows,
  type ActivityPrimaryActionType,
} from "../../utils/communicationTimeline";
import { getSpanJobIds, spanUserIdFromEnv } from "./comms-hub-span";

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

export type ActivitySmsNumberSummary = {
  id: string;
  displayLabel: string | null;
  assignedToName: string | null;
  numberType: string;
};

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
  primaryAction: ActivityPrimaryActionType;
  /** Present for SMS rows tied to an {@link SmsNumber}. */
  smsNumber: ActivitySmsNumberSummary | null;
};

function senderLabelForTimeline(
  senderType: string,
  senderName: string | null,
): {
  senderLabel: string;
  filterBucket: "system" | "user";
  senderType: string;
} {
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

function prismaCommunicationToTimelineRow(row: Communication): CurrentJobEmailRow {
  const mapped = senderLabelForTimeline(row.sender_type, row.sender_name);
  const ch = row.channel;
  const channel: CurrentJobEmailRow["channel"] =
    ch === "sms" || ch === "whatsapp"
      ? ch
      : ch === "meeting"
        ? "meeting"
        : ch === "system_notification"
          ? "system"
          : "email";
  return {
    id: row.id,
    channel,
    direction: row.direction === "inbound" ? "inbound" : "outbound",
    senderType: mapped.senderType,
    senderLabel: mapped.senderLabel,
    filterBucket: mapped.filterBucket,
    subject: row.subject,
    body: row.body,
    sentAt: row.sent_at.toISOString(),
    fromAddress: row.from_address ?? "",
    toAddress: row.to_address ?? "",
    deliveryStatus: row.delivery_status as CurrentJobEmailRow["deliveryStatus"],
    scheduledFor: row.scheduled_for?.toISOString() ?? null,
    threadId: channel === "email" ? (row.thread_id?.trim() || row.id) : null,
    meeting: null,
  };
}

function emailThreadMembers(
  all: Communication[],
  anchor: Communication,
): Communication[] {
  if (anchor.channel !== "email") return [];
  const key = anchor.thread_id?.trim() || anchor.id;
  return all.filter((c) => {
    if (c.channel !== "email") return false;
    const k = c.thread_id?.trim() || c.id;
    return k === key;
  });
}

function computePrimaryActionForPair(
  all: Communication[],
  lastOverall: Communication,
): ActivityPrimaryActionType {
  const ch = lastOverall.channel.toLowerCase();
  if (ch === "system_notification") return "view";
  if (ch === "meeting") return "view";
  if (ch === "sms" || ch === "whatsapp") {
    const row = prismaCommunicationToTimelineRow(lastOverall);
    return getActivityPrimaryActionFromTimelineRows([row]);
  }
  if (ch === "email") {
    const members = emailThreadMembers(all, lastOverall);
    const rows = members
      .map(prismaCommunicationToTimelineRow)
      .sort(
        (a, b) =>
          new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
      );
    return getActivityPrimaryActionFromTimelineRows(rows);
  }
  return "view";
}

function sortActivityItems(
  builtAll: ActivityListItem[],
  sort: string,
): ActivityListItem[] {
  const s = sort || "newest";
  const copy = [...builtAll];
  if (s === "name_asc") {
    copy.sort((a, b) => {
      const n = a.candidateName.localeCompare(b.candidateName);
      if (n !== 0) return n;
      return new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime();
    });
  } else if (s === "unresponsive_first") {
    const rank: Record<ActivityRowStatus, number> = {
      unresponsive: 0,
      pending: 1,
      engaged: 2,
    };
    copy.sort((a, b) => {
      const dr = rank[a.status] - rank[b.status];
      if (dr !== 0) return dr;
      return new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime();
    });
  } else {
    copy.sort(
      (a, b) =>
        new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
    );
  }
  return copy;
}

/**
 * Builds the full activity list (one row per candidate–job pair) using the same rules as
 * {@link fetchActivityFeed}, including span filtering.
 */
function smsNumberFromPrisma(
  row: {
    sms_number: {
      id: string;
      display_label: string | null;
      assigned_to_name: string | null;
      number_type: string;
      assigned_to_id: string | null;
    } | null;
  },
): ActivitySmsNumberSummary | null {
  const sn = row.sms_number;
  if (!sn) return null;
  return {
    id: sn.id,
    displayLabel: sn.display_label,
    assignedToName: sn.assigned_to_name,
    numberType: sn.number_type,
  };
}

export async function buildActivityListItems(params: {
  period: string;
  jobId: string;
  sort: string;
  search: string;
  channel: string;
  /** When set, only pairs whose period anchor is SMS on a line assigned to this user id. */
  smsOwnerId?: string;
}): Promise<{ builtAll: ActivityListItem[]; slaDays: number }> {
  const slaMs = getSlaMs();
  const slaDays = Math.round(slaMs / (24 * 60 * 60 * 1000));
  const { start, end } = periodBounds(params.period);
  const now = Date.now();

  const jobIds = await getSpanJobIds(spanUserIdFromEnv());
  if (jobIds.length === 0) {
    return { builtAll: [], slaDays };
  }

  const jobFilter = params.jobId.trim();
  const effectiveJobIds =
    jobFilter && jobIds.includes(jobFilter)
      ? [jobFilter]
      : jobFilter && !jobIds.includes(jobFilter)
        ? []
        : jobIds;

  if (effectiveJobIds.length === 0) {
    return { builtAll: [], slaDays };
  }

  const rows = await prisma.communication.findMany({
    where: {
      job_id: { in: effectiveJobIds },
      candidate_id: { not: null },
      channel: { in: [...ACTIVITY_CHANNELS] },
    },
    include: {
      candidate: true,
      job: true,
      sms_number: {
        select: {
          id: true,
          display_label: true,
          assigned_to_name: true,
          number_type: true,
          assigned_to_id: true,
        },
      },
    },
    orderBy: { sent_at: "desc" },
  });

  type CommRow = (typeof rows)[number];

  type PairAgg = {
    all: CommRow[];
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

  const searchRaw = params.search.trim();
  const channelFilter = parseChannelCsv(params.channel);
  const smsOwnerFilter = params.smsOwnerId?.trim() ?? "";

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
    const primaryAction = computePrimaryActionForPair(all, lastOverall);

    const anchorCh = anchor.channel.toLowerCase();
    if (channelFilter.length > 0 && !channelFilter.includes(anchorCh)) {
      continue;
    }

    if (smsOwnerFilter) {
      if (anchorCh !== "sms") continue;
      const ownerId = anchor.sms_number?.assigned_to_id ?? null;
      if (ownerId !== smsOwnerFilter) continue;
    }

    const body = anchor.body ?? "";
    const preview =
      body.length <= 120 ? body.trim() : `${body.slice(0, 119).trim()}…`;

    if (!matchesSearch(searchRaw, candidate.name, job.title, body)) {
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
      primaryAction,
      smsNumber: smsNumberFromPrisma(anchor),
    });
  }

  return { builtAll: sortActivityItems(builtAll, params.sort), slaDays };
}

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
  /** Only SMS anchors on a line whose assigned user matches this id (e.g. prototype persona user). */
  smsOwnerId?: string;
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
  const { builtAll, slaDays } = await buildActivityListItems({
    period: params.period,
    jobId: params.jobId,
    sort: params.sort,
    search: params.search,
    channel: params.channel,
    smsOwnerId: params.smsOwnerId,
  });

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

/** One queued scheduled communication or meeting for dashboard / scheduled list APIs. */
export type ScheduledMessageRow = {
  communicationId: string;
  candidateId: string;
  candidateName: string;
  channel: string;
  subject: string;
  scheduledAt: string;
  jobId: string;
  /** Set when this row is a 1:1 meeting (cancel uses meeting id). */
  meetingId: string | null;
};

export type CommsHubDashboardResponse = {
  summary: {
    messagesSent: number;
    responseRate: number | null;
    avgResponseTimeHrs: number | null;
    activeCandidates: number;
  };
  channelDistribution: Array<{ channel: string; count: number }>;
  recentActivity: Array<{
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
    status: ActivityRowStatus;
    sentAt: string;
    primaryAction: ActivityPrimaryActionType;
    smsNumber: ActivitySmsNumberSummary | null;
  }>;
  scheduled: ScheduledMessageRow[];
  scheduledQueuedTotal: number;
  unresponsiveCount: number;
};

function shortCandidateLabel(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!;
  const last = parts[parts.length - 1]!;
  return `${parts[0]} ${last[0]}.`;
}

async function computeDashboardSummaryMetrics(
  jobIds: string[],
  start: Date,
  end: Date,
): Promise<CommsHubDashboardResponse["summary"]> {
  if (jobIds.length === 0) {
    return {
      messagesSent: 0,
      responseRate: null,
      avgResponseTimeHrs: null,
      activeCandidates: 0,
    };
  }

  const window = {
    job_id: { in: jobIds },
    sent_at: { gte: start, lte: end },
  };

  const messagesSent = await prisma.communication.count({
    where: { ...window, direction: "outbound" },
  });

  const activeRows = await prisma.communication.findMany({
    where: { ...window, candidate_id: { not: null } },
    distinct: ["candidate_id"],
    select: { candidate_id: true },
  });
  const activeCandidates = activeRows.filter((r) => r.candidate_id).length;

  const outboundCandidates = await prisma.communication.findMany({
    where: {
      ...window,
      direction: "outbound",
      candidate_id: { not: null },
    },
    distinct: ["candidate_id"],
    select: { candidate_id: true },
  });
  const obSet = new Set(
    outboundCandidates.map((o) => o.candidate_id!).filter(Boolean),
  );

  const inboundCandidates = await prisma.communication.findMany({
    where: {
      ...window,
      direction: "inbound",
      candidate_id: { not: null },
    },
    distinct: ["candidate_id"],
    select: { candidate_id: true },
  });
  const inSet = new Set(
    inboundCandidates.map((i) => i.candidate_id!).filter(Boolean),
  );

  let replied = 0;
  for (const id of obSet) {
    if (inSet.has(id)) replied += 1;
  }
  const responseRate =
    obSet.size === 0 ? null : (replied / obSet.size) * 100;

  const aggRows = await prisma.communication.findMany({
    where: { ...window, candidate_id: { not: null } },
    select: { candidate_id: true, direction: true, sent_at: true },
  });

  type G = { outs: Date[]; ins: Date[] };
  const byCand = new Map<string, G>();
  for (const r of aggRows) {
    if (!r.candidate_id) continue;
    let g = byCand.get(r.candidate_id);
    if (!g) {
      g = { outs: [], ins: [] };
      byCand.set(r.candidate_id, g);
    }
    if (r.direction === "outbound") g.outs.push(r.sent_at);
    else if (r.direction === "inbound") g.ins.push(r.sent_at);
  }

  const deltasHrs: number[] = [];
  for (const [, g] of byCand) {
    if (g.ins.length === 0 || g.outs.length === 0) continue;
    const lastOut = new Date(Math.max(...g.outs.map((d) => d.getTime())));
    const inAfter = g.ins
      .filter((d) => d.getTime() >= lastOut.getTime())
      .sort((a, b) => a.getTime() - b.getTime())[0];
    if (!inAfter) continue;
    deltasHrs.push((inAfter.getTime() - lastOut.getTime()) / 3600000);
  }

  const avgResponseTimeHrs =
    deltasHrs.length === 0
      ? null
      : deltasHrs.reduce((a, b) => a + b, 0) / deltasHrs.length;

  return {
    messagesSent,
    responseRate,
    avgResponseTimeHrs,
    activeCandidates,
  };
}

async function computeChannelDistribution(
  jobIds: string[],
  start: Date,
  end: Date,
): Promise<CommsHubDashboardResponse["channelDistribution"]> {
  const order = ["email", "sms", "whatsapp", "meeting"] as const;
  if (jobIds.length === 0) {
    return order.map((channel) => ({ channel, count: 0 }));
  }

  const rows = await prisma.communication.groupBy({
    by: ["channel"],
    where: {
      direction: "outbound",
      job_id: { in: jobIds },
      sent_at: { gte: start, lte: end },
      channel: { not: "system_notification" },
    },
    _count: { _all: true },
  });

  const map = new Map(rows.map((r) => [r.channel, r._count._all]));
  return order.map((channel) => ({
    channel,
    count: map.get(channel) ?? 0,
  }));
}

async function buildAllScheduledRows(jobIds: string[]): Promise<{
  rows: ScheduledMessageRow[];
  total: number;
}> {
  if (jobIds.length === 0) {
    return { rows: [], total: 0 };
  }

  const now = new Date();

  const [commCount, mtgCount, scheduledComms, scheduledMeetings] =
    await Promise.all([
      prisma.communication.count({
        where: {
          job_id: { in: jobIds },
          delivery_status: "scheduled",
          scheduled_for: { not: null, gt: now },
          candidate_id: { not: null },
        },
      }),
      prisma.meeting.count({
        where: {
          job_id: { in: jobIds },
          status: "scheduled",
          scheduled_at: { gt: now },
        },
      }),
      prisma.communication.findMany({
        where: {
          job_id: { in: jobIds },
          delivery_status: "scheduled",
          scheduled_for: { not: null, gt: now },
          candidate_id: { not: null },
        },
        include: { candidate: true },
      }),
      prisma.meeting.findMany({
        where: {
          job_id: { in: jobIds },
          status: "scheduled",
          scheduled_at: { gt: now },
        },
        include: { candidate: true, communication: true },
      }),
    ]);

  const combined: ScheduledMessageRow[] = [];

  for (const c of scheduledComms) {
    if (!c.candidate || !c.scheduled_for || !c.job_id) continue;
    combined.push({
      communicationId: c.id,
      candidateId: c.candidate_id!,
      candidateName: shortCandidateLabel(c.candidate.name),
      channel: c.channel,
      subject: (c.subject ?? "").trim() || "(No subject)",
      scheduledAt: c.scheduled_for.toISOString(),
      jobId: c.job_id,
      meetingId: null,
    });
  }

  for (const m of scheduledMeetings) {
    const comm = m.communication;
    const cand = m.candidate;
    if (!cand) continue;
    const commId = comm?.id ?? m.id;
    combined.push({
      communicationId: commId,
      candidateId: m.candidate_id,
      candidateName: shortCandidateLabel(cand.name),
      channel: "meeting",
      subject: (m.title ?? "").trim() || "(Meeting)",
      scheduledAt: m.scheduled_at.toISOString(),
      jobId: m.job_id,
      meetingId: m.id,
    });
  }

  combined.sort(
    (a, b) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );

  return {
    rows: combined,
    total: commCount + mtgCount,
  };
}

async function fetchScheduledDashboardRows(
  jobIds: string[],
  take: number,
): Promise<{
  rows: ScheduledMessageRow[];
  total: number;
}> {
  const { rows, total } = await buildAllScheduledRows(jobIds);
  return {
    rows: rows.slice(0, take),
    total,
  };
}

export async function fetchScheduledMessagesPage(params: {
  jobOpeningId?: string;
  page: number;
  limit: number;
}): Promise<{
  items: ScheduledMessageRow[];
  total: number;
  page: number;
  limit: number;
}> {
  let jobIds = await getSpanJobIds(spanUserIdFromEnv());
  const jobOpeningId = params.jobOpeningId?.trim();
  if (jobOpeningId) {
    jobIds = jobIds.includes(jobOpeningId) ? [jobOpeningId] : [];
  }

  const page = Math.max(1, params.page);
  const limit = Math.min(100, Math.max(1, params.limit));
  const { rows, total } = await buildAllScheduledRows(jobIds);
  const start = (page - 1) * limit;
  const items = rows.slice(start, start + limit);

  return {
    items,
    total,
    page,
    limit,
  };
}

export async function fetchCommsHubDashboard(params: {
  period: string;
  jobOpeningId?: string;
}): Promise<CommsHubDashboardResponse> {
  const period = params.period?.trim() || "quarter";
  const { start, end } = periodBounds(period);

  let jobIds = await getSpanJobIds(spanUserIdFromEnv());
  const jobOpeningId = params.jobOpeningId?.trim();
  if (jobOpeningId) {
    jobIds = jobIds.includes(jobOpeningId) ? [jobOpeningId] : [];
  }

  const [summary, channelDistribution, sched, list] = await Promise.all([
    computeDashboardSummaryMetrics(jobIds, start, end),
    computeChannelDistribution(jobIds, start, end),
    fetchScheduledDashboardRows(jobIds, 5),
    buildActivityListItems({
      period,
      jobId: jobOpeningId ?? "",
      sort: "newest",
      search: "",
      channel: "",
    }),
  ]);

  const { builtAll } = list;
  const recentActivity = builtAll.slice(0, 5).map((r) => ({
    communicationId: r.communicationId,
    candidateId: r.candidateId,
    candidateName: r.candidateName,
    candidateEmail: r.candidateEmail,
    candidatePhone: r.candidatePhone,
    candidateWhatsapp: r.candidateWhatsapp,
    jobId: r.jobId,
    jobTitle: r.jobTitle,
    jobCode: r.jobCode,
    currentStage: r.currentStage,
    channel: r.channel,
    direction: r.direction,
    preview: r.preview,
    status: r.status,
    sentAt: r.sentAt,
    primaryAction: r.primaryAction,
    smsNumber: r.smsNumber,
  }));

  const unresponsiveCount = builtAll.filter(
    (r) => r.status === "unresponsive",
  ).length;

  return {
    summary,
    channelDistribution,
    recentActivity,
    scheduled: sched.rows,
    scheduledQueuedTotal: sched.total,
    unresponsiveCount,
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
