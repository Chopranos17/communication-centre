import "dotenv/config";
import twilio from "twilio";
import type { Candidate, Communication, Job } from "@prisma/client";
import { prisma } from "../db";
import { emitNewMessage } from "../socket-io";
import {
  resolveInboundSmsOwner,
  type InboundSmsOwnerResolution,
} from "./sms-number-lookup";

const POLL_MS = 30_000;

/** Twilio list window start; overlapped each poll via buffer. Dedupe prevents duplicates. */
const TWILIO_LOOKBACK_MS = 24 * 60 * 60 * 1000;
const TWILIO_OVERLAP_MS = 2 * 60 * 1000;

let lastPollTimestamp = new Date(Date.now() - TWILIO_LOOKBACK_MS);
let intervalId: ReturnType<typeof setInterval> | null = null;

function getTwilioClient(): ReturnType<typeof twilio> | null {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!sid || !token) return null;
  return twilio(sid, token);
}

function parseFromHeader(from: string): { email: string; displayName: string | null } {
  const t = from.trim();
  const bracket = t.match(/<([^>]+@[^>]+)>/);
  if (bracket) {
    const display = t.slice(0, bracket.index).trim().replace(/^["']|["']$/g, "");
    return {
      email: bracket[1].trim(),
      displayName: display.length ? display : null,
    };
  }
  return { email: t, displayName: null };
}

function normalizeMessageId(raw: string): string {
  return raw.trim().replace(/^<|>$/g, "").trim();
}

function headerValue(
  headers: Record<string, string> | null | undefined,
  name: string,
): string | undefined {
  if (!headers) return undefined;
  const want = name.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === want && typeof v === "string") return v;
  }
  return undefined;
}

function referencesTokens(references: string | undefined): string[] {
  if (!references?.trim()) return [];
  return references
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Gmail treats dots in the local part as equivalent; try both for matching. */
function emailMatchVariants(addr: string): string[] {
  const e = addr.trim().toLowerCase();
  if (!e.includes("@")) return [e];
  const [local, domain] = e.split("@");
  const d = domain ?? "";
  const variants = new Set<string>([e]);
  if (d === "gmail.com" || d === "googlemail.com") {
    variants.add(`${local.replace(/\./g, "")}@${d}`);
  }
  return [...variants];
}

function emailVariantSetsOverlap(a: string[], b: string[]): boolean {
  const setB = new Set(b);
  return a.some((x) => setB.has(x));
}

async function findCandidateByEmail(email: string): Promise<Candidate | null> {
  const incoming = emailMatchVariants(email);
  if (incoming.length === 0) return null;
  const rows = await prisma.candidate.findMany();
  for (const c of rows) {
    const dbVars = emailMatchVariants(c.email);
    if (emailVariantSetsOverlap(incoming, dbVars)) return c;
  }
  return null;
}

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

function phoneDigitsMatch(incomingDigits: string, stored: string | null | undefined): boolean {
  if (!stored || !incomingDigits) return false;
  const b = digitsOnly(stored);
  if (!b) return false;
  return (
    incomingDigits === b ||
    incomingDigits.endsWith(b) ||
    b.endsWith(incomingDigits)
  );
}

/** Channels used to anchor inbound SMS/WhatsApp to an existing outbound thread/job. */
const OUTBOUND_THREAD_ANCHOR_CHANNELS = ["email", "sms", "whatsapp"] as const;

function canonicalThreadIdFromOutbound(row: {
  id: string;
  thread_id: string | null;
}): string {
  return row.thread_id?.trim() || row.id;
}

/** Strip whatsapp: prefix, spaces, dashes, etc.; compare using digit sequences only. */
function normalizeInboundPhoneDigits(
  fromRaw: string,
  channel: "sms" | "whatsapp",
): string {
  let s = fromRaw.trim();
  if (channel === "whatsapp") {
    s = s.replace(/^whatsapp:/i, "");
  }
  return digitsOnly(s);
}

/** Demo-safe log line (masks all but last 4 digits). */
function formatInboundLogPhone(digits: string): string {
  if (!digits) return "(unknown)";
  if (digits.length <= 4) return `+${digits}`;
  const masked =
    digits.slice(0, -4).replace(/\d/g, "X") + digits.slice(-4);
  return `+${masked}`;
}

async function findAllCandidatesByPhoneDigits(
  digits: string,
): Promise<Candidate[]> {
  if (!digits) return [];
  const rows = await prisma.candidate.findMany();
  const byId = new Map<string, Candidate>();
  for (const c of rows) {
    if (
      phoneDigitsMatch(digits, c.phone) ||
      phoneDigitsMatch(digits, c.whatsapp_number)
    ) {
      byId.set(c.id, c);
    }
  }
  return [...byId.values()];
}

type SmsWaInboundRouting =
  | {
      kind: "matched";
      candidate: Candidate;
      jobId: string;
      threadId: string | null;
    }
  | { kind: "unmatched" }
  | { kind: "skip"; reason: string };

async function resolveSmsWaInboundRouting(
  channel: "sms" | "whatsapp",
  candidates: Candidate[],
): Promise<SmsWaInboundRouting> {
  if (candidates.length === 0) return { kind: "unmatched" };

  if (candidates.length === 1) {
    const c = candidates[0];
    const lastSame = await prisma.communication.findFirst({
      where: {
        candidate_id: c.id,
        channel,
        direction: "outbound",
      },
      orderBy: { sent_at: "desc" },
    });
    if (lastSame) {
      const jobId =
        lastSame.job_id ?? (await resolveJobIdForInbound(c.id, null));
      if (!jobId) {
        return {
          kind: "skip",
          reason: `candidate ${c.id} has no job link (had ${channel} outbound)`,
        };
      }
      return {
        kind: "matched",
        candidate: c,
        jobId,
        threadId: canonicalThreadIdFromOutbound(lastSame),
      };
    }

    const lastAny = await prisma.communication.findFirst({
      where: {
        candidate_id: c.id,
        direction: "outbound",
        channel: { in: [...OUTBOUND_THREAD_ANCHOR_CHANNELS] },
      },
      orderBy: { sent_at: "desc" },
    });
    if (lastAny) {
      const jobId =
        lastAny.job_id ?? (await resolveJobIdForInbound(c.id, null));
      if (!jobId) {
        return {
          kind: "skip",
          reason: `candidate ${c.id} has no job link (had outbound on another channel)`,
        };
      }
      return {
        kind: "matched",
        candidate: c,
        jobId,
        threadId: canonicalThreadIdFromOutbound(lastAny),
      };
    }

    const jobId = await resolveJobIdForInbound(c.id, null);
    if (!jobId) {
      return { kind: "skip", reason: `candidate ${c.id} has no job link` };
    }
    return {
      kind: "matched",
      candidate: c,
      jobId,
      threadId: null,
    };
  }

  const ids = candidates.map((x) => x.id);
  const lastAcross = await prisma.communication.findFirst({
    where: {
      candidate_id: { in: ids },
      direction: "outbound",
      channel: { in: [...OUTBOUND_THREAD_ANCHOR_CHANNELS] },
    },
    orderBy: { sent_at: "desc" },
  });
  if (lastAcross?.candidate_id) {
    const cand = candidates.find((x) => x.id === lastAcross.candidate_id);
    if (cand) {
      const jobId =
        lastAcross.job_id ?? (await resolveJobIdForInbound(cand.id, null));
      if (jobId) {
        return {
          kind: "matched",
          candidate: cand,
          jobId,
          threadId: canonicalThreadIdFromOutbound(lastAcross),
        };
      }
    }
  }

  const sorted = [...candidates].sort((a, b) => a.id.localeCompare(b.id));
  for (const pick of sorted) {
    const jobId = await resolveJobIdForInbound(pick.id, null);
    if (jobId) {
      return {
        kind: "matched",
        candidate: pick,
        jobId,
        threadId: null,
      };
    }
  }
  return {
    kind: "skip",
    reason:
      "multiple phone matches, no outbound and no job link for any candidate",
  };
}

async function resolveJobIdForInbound(
  candidateId: string,
  preferredJobId: string | null,
): Promise<string | null> {
  if (preferredJobId) return preferredJobId;
  const current = await prisma.candidateJob.findFirst({
    where: { candidate_id: candidateId, is_current: true },
  });
  if (current) return current.job_id;
  const anyJob = await prisma.candidateJob.findFirst({
    where: { candidate_id: candidateId },
  });
  return anyJob?.job_id ?? null;
}

function decodeBasicHtmlEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      const c = Number(n);
      return Number.isFinite(c) ? String.fromCharCode(c) : _;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      const c = parseInt(h, 16);
      return Number.isFinite(c) ? String.fromCharCode(c) : _;
    });
}

function htmlToPlainText(html: string): string {
  let s = html;
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/(p|div|h[1-6]|tr|li|table)\s*>/gi, "\n");
  s = s.replace(/<[^>]+>/g, "");
  return decodeBasicHtmlEntities(s);
}

function stripCssArtifactLines(text: string): string {
  return text
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      if (!t) return true;
      if (/^[\w#.:*\s,-]+\{[^}]*}\s*$/i.test(t)) return false;
      if (/^[a-z*][^{]*\{[^}]*margin[^}]*\}/i.test(t)) return false;
      return true;
    })
    .join("\n");
}

function truncateAtReplySeparators(plain: string): string {
  const patterns: RegExp[] = [
    /\r?\n-----Original Message-----\s*/i,
    /\r?\n----- Forwarded message -----\s*/i,
    /\r?\nBegin forwarded message\s*/i,
    /(?:^|\r?\n)From:\s+/i,
    /\r?\nOn .+ wrote:\s*/i,
    /\r?\n_{10,}\s*/i,
    /\r?\nSent from my [^\r\n]*/i,
    /\r?\nGet Outlook for [^\r\n]*/i,
    /(?:^|\r?\n)CAUTION:\s*/i,
    /(?:^|\r?\n)The information contained in this electronic message[^\r\n]*/i,
  ];
  let minIdx = plain.length;
  for (const re of patterns) {
    const m = re.exec(plain);
    if (m && m.index < minIdx) minIdx = m.index;
  }
  return minIdx < plain.length ? plain.slice(0, minIdx) : plain;
}

/** First block before `>`-quoted lines or "On … wrote:" / "From:" headers (reply-only). */
function takeLeadingNonQuotedBlock(plain: string): string {
  const lines = plain.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (/^>{1,2}\s/.test(t) || /^&gt;/.test(t)) break;
    if (/^On .+ wrote:\s*$/i.test(t)) break;
    if (/^From:\s+/i.test(t)) break;
    out.push(line);
  }
  return out.join("\n");
}

function collapseBlankLines(text: string): string {
  return text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Keep the candidate's top reply; drop quoted chains, HTML, and common noise.
 */
function cleanInboundEmailBody(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "(no body)";
  const looksHtml = /<\s*[a-z!/?]/i.test(trimmed);
  let plain = looksHtml ? htmlToPlainText(trimmed) : trimmed;
  plain = plain.replace(/<style[\s\S]*?<\/style>/gi, "");
  plain = stripCssArtifactLines(plain);
  plain = takeLeadingNonQuotedBlock(plain);
  for (let i = 0; i < 3; i++) {
    const next = truncateAtReplySeparators(plain);
    if (next === plain) break;
    plain = next;
  }
  plain = plain.replace(/\{[^{}]*\}/g, (block) =>
    /margin|padding|font-|color:|display:/i.test(block) ? "" : block,
  );
  plain = collapseBlankLines(plain);
  return plain.length ? plain : "(no body)";
}

/** Prefer the shorter cleaned variant when both text and HTML exist (reply is usually above the quote). */
function pickBestCleanedBody(html: string | null, text: string | null): string {
  const candidates: string[] = [];
  if (text?.trim()) candidates.push(cleanInboundEmailBody(text));
  if (html?.trim()) candidates.push(cleanInboundEmailBody(html));
  const good = candidates.filter((c) => c && c !== "(no body)");
  if (good.length === 0) return "(no body)";
  good.sort((a, b) => a.length - b.length);
  return good[0]!;
}

function stripReplySubjectPrefixes(subject: string): string {
  let s = subject.trim();
  for (;;) {
    const next = s.replace(/^(re|fw|fwd)\s*:\s*/i, "").trim();
    if (next === s) break;
    s = next;
  }
  return s.trim();
}

function normalizeSubjectForMatch(subject: string): string {
  return stripReplySubjectPrefixes(subject).replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * 1) Outbound with same normalized subject (after Re:/Fwd:). 2) Else most recent outbound email.
 */
async function findOutboundForInboundThreading(
  candidateId: string,
  subject: string | null,
): Promise<Communication | null> {
  if (subject?.trim()) {
    const target = normalizeSubjectForMatch(subject);
    const outbounds = await prisma.communication.findMany({
      where: {
        candidate_id: candidateId,
        channel: "email",
        direction: "outbound",
        subject: { not: null },
      },
      orderBy: { sent_at: "desc" },
      take: 200,
    });
    for (const o of outbounds) {
      if (!o.subject) continue;
      if (normalizeSubjectForMatch(o.subject) === target) return o;
    }
  }

  return prisma.communication.findFirst({
    where: {
      candidate_id: candidateId,
      channel: "email",
      direction: "outbound",
    },
    orderBy: { sent_at: "desc" },
  });
}

async function findParentByVendorMessageIds(
  ids: string[],
  channel: "email",
): Promise<Communication | null> {
  const variants = new Set<string>();
  for (const raw of ids) {
    const t = raw.trim();
    if (!t) continue;
    const n = normalizeMessageId(t);
    variants.add(t);
    if (n) {
      variants.add(n);
      variants.add(`<${n}>`);
    }
  }
  const list = [...variants];
  if (list.length === 0) return null;
  return prisma.communication.findFirst({
    where: { vendor_message_id: { in: list }, channel },
  });
}

function emitInboundSaved(
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
    scheduled_for?: Date | null;
    sms_number_id?: string | null;
  },
  candidate: Pick<Candidate, "id" | "name" | "email"> | null,
  job: Pick<Job, "id" | "title" | "job_code"> | null,
  smsOwner?: InboundSmsOwnerResolution | null,
): void {
  if (
    !row.candidate_id ||
    !row.job_id ||
    !candidate ||
    !job
  ) {
    return;
  }
  const payload = {
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
    ...(smsOwner?.smsNumberId != null
      ? {
          sms_line: {
            id: smsOwner.smsNumberId,
            display_label: smsOwner.lineLabel,
            assigned_to_id: smsOwner.ownerId,
            assigned_to_name: smsOwner.ownerName,
          },
        }
      : {}),
  };
  emitNewMessage(payload);
}

async function resendFetchJson(
  apiKey: string,
  path: string,
): Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }> {
  const res = await fetch(`https://api.resend.com${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  return {
    ok: res.ok,
    status: res.status,
    json: () => res.json() as Promise<unknown>,
  };
}

type ResendListItem = { id: string };

function extractResendListData(body: unknown): ResendListItem[] {
  if (!body || typeof body !== "object") return [];
  const o = body as { data?: unknown };
  if (!Array.isArray(o.data)) return [];
  return o.data
    .map((x) => {
      if (x != null && typeof x === "object" && "id" in x) {
        const id = (x as { id: unknown }).id;
        if (typeof id === "string") return { id };
        if (typeof id === "number") return { id: String(id) };
      }
      return null;
    })
    .filter((x): x is ResendListItem => x != null);
}

/**
 * Probe alternate URLs (debug). Resend dashboard "Receiving Emails" is served by
 * GET /emails/receiving — not GET /emails (outbound/sent).
 */
async function probeResendInboundEndpoints(apiKey: string): Promise<void> {
  const endpoints = [
    "https://api.resend.com/emails/received",
    "https://api.resend.com/received",
    "https://api.resend.com/inbound",
    "https://api.resend.com/emails?direction=inbound",
  ];
  const auth = { Authorization: `Bearer ${apiKey}` };
  for (const url of endpoints) {
    try {
      const resp = await fetch(url, { headers: auth });
      const body = await resp.text();
      console.log(
        `[Poller Debug] ${url} => status ${resp.status}, body: ${body}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`[Poller Debug] ${url} => error: ${msg}`);
    }
  }
}

/**
 * List candidate replies: official Received Emails API only (never GET /emails).
 * Candidate = From; our inbound address = To (stored when persisting each message).
 */
async function listResendReceivedEmails(apiKey: string): Promise<ResendListItem[]> {
  const key = apiKey.trim();
  if (process.env.RESEND_PROBE_INBOUND_URLS === "true") {
    await probeResendInboundEndpoints(key);
  }

  const listUrl = "https://api.resend.com/emails/receiving?limit=100";
  const resp = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const text = await resp.text();
  if (!resp.ok) {
    console.warn(
      "[inbound-poller] GET /emails/receiving failed:",
      resp.status,
      text.slice(0, 500),
    );
    return [];
  }
  let data: unknown;
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    console.warn("[inbound-poller] GET /emails/receiving: non-JSON body");
    return [];
  }
  const list = extractResendListData(data);
  if (list.length > 0) {
    console.log(
      `[inbound-poller] Received ${list.length} inbound email id(s) from GET /emails/receiving`,
    );
  }
  return list;
}

async function getResendReceivedEmail(
  apiKey: string,
  id: string,
): Promise<Record<string, unknown> | null> {
  let r = await resendFetchJson(
    apiKey,
    `/emails/receiving/${encodeURIComponent(id)}`,
  );
  if (!r.ok) {
    r = await resendFetchJson(apiKey, `/emails/${encodeURIComponent(id)}`);
  }
  if (!r.ok) return null;
  const data = await r.json();
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (o.object === "email" || o.id) return o;
    const inner = o.data;
    if (inner && typeof inner === "object") return inner as Record<string, unknown>;
  }
  return null;
}

async function pollEmailInbox(apiKey: string): Promise<number> {
  let created = 0;
  const items = await listResendReceivedEmails(apiKey);
  if (items.length > 0) {
    console.log(
      `[inbound-poller] Resend returned ${items.length} received email id(s) to process`,
    );
  } else {
    console.log(
      "[inbound-poller] Resend: 0 received email(s) from API (if you see mail in Resend Receiving, check API key permissions and receiving domain).",
    );
  }
  for (const item of items) {
    const id = item.id;
    if (!id) continue;
    try {
      const exists = await prisma.communication.findFirst({
        where: { vendor_message_id: id },
      });
      if (exists) continue;

      const full = await getResendReceivedEmail(apiKey, id);
      if (!full) {
        console.warn(
          `[inbound-poller] Could not fetch full body for received email id ${id}`,
        );
        continue;
      }

      // Received mail: candidate is the From address; our inbound mailbox is To.
      const fromRaw = String(full.from ?? "");
      const { email: fromEmail, displayName } = parseFromHeader(fromRaw);
      if (!fromEmail) continue;

      const toArr = Array.isArray(full.to) ? (full.to as string[]) : [];
      const inboundAddr =
        process.env.RESEND_INBOUND_ADDRESS?.trim() || toArr[0] || "";

      const subject =
        typeof full.subject === "string" ? full.subject : null;
      const html = typeof full.html === "string" ? full.html : null;
      const text = typeof full.text === "string" ? full.text : null;
      const body = pickBestCleanedBody(html, text);

      const headers =
        full.headers && typeof full.headers === "object"
          ? (full.headers as Record<string, string>)
          : null;
      const inReplyTo = headerValue(headers, "In-Reply-To");
      const references = headerValue(headers, "References");
      const msgIds = [
        ...(inReplyTo ? [inReplyTo] : []),
        ...referencesTokens(references),
      ];
      const parent = await findParentByVendorMessageIds(msgIds, "email");

      const candidate = await findCandidateByEmail(fromEmail);
      if (!candidate) {
        console.info(
          `[inbound-poller] Skip received email ${id}: no candidate with email matching "${fromEmail}"`,
        );
        continue;
      }

      const anchor = await findOutboundForInboundThreading(
        candidate.id,
        subject,
      );

      const jobId = await resolveJobIdForInbound(
        candidate.id,
        parent?.job_id ?? anchor?.job_id ?? null,
      );
      if (!jobId) {
        console.info(
          `[inbound-poller] Skip received email ${id}: candidate ${candidate.id} has no job link`,
        );
        continue;
      }

      let threadId: string | null = null;
      if (parent) {
        threadId = parent.thread_id?.trim() || parent.id;
      } else if (anchor) {
        threadId = anchor.thread_id?.trim() || anchor.id;
      }

      const createdAtRaw = full.created_at;
      let sentAt = new Date();
      if (typeof createdAtRaw === "string") {
        const d = new Date(createdAtRaw);
        if (!Number.isNaN(d.getTime())) sentAt = d;
      }

      const row = await prisma.communication.create({
        data: {
          candidate_id: candidate.id,
          job_id: jobId,
          channel: "email",
          direction: "inbound",
          sender_type: "candidate",
          sender_name: displayName,
          thread_id: threadId,
          from_address: fromEmail,
          to_address: inboundAddr || null,
          subject,
          body,
          delivery_status: "delivered",
          vendor_message_id: id,
          sent_at: sentAt,
        },
      });

      let finalThreadId = threadId ?? row.id;
      if (!threadId) {
        await prisma.communication.update({
          where: { id: row.id },
          data: { thread_id: row.id },
        });
      }

      const subjLog = subject ?? "(no subject)";
      console.log(
        `[Poller] Threaded inbound email '${subjLog.replace(/'/g, "\\'")}' with outbound thread ${finalThreadId}`,
      );

      const withJob = await prisma.communication.findUniqueOrThrow({
        where: { id: row.id },
        include: { job: true },
      });
      const { job, ...comm } = withJob;
      emitInboundSaved(comm, candidate, job);
      created += 1;
    } catch (e) {
      console.error("[inbound-poller] Email ingest error:", e);
    }
  }
  return created;
}

function normalizeTwilioListTo(
  channel: "sms" | "whatsapp",
  raw: string,
): string {
  const t = raw.trim();
  if (channel === "whatsapp") {
    if (/^whatsapp:/i.test(t)) return t;
    const d = t.replace(/\s/g, "");
    if (d.startsWith("+")) return `whatsapp:${d}`;
    const digits = d.replace(/\D/g, "");
    return digits ? `whatsapp:+${digits}` : t;
  }
  return t.replace(/\s/g, "");
}

function twilioToMatchesOurNumber(
  channel: "sms" | "whatsapp",
  msgTo: string,
  ourRaw: string,
): boolean {
  const a = normalizeTwilioListTo(channel, msgTo);
  const b = normalizeTwilioListTo(channel, ourRaw);
  if (a === b) return true;
  return digitsOnly(a) === digitsOnly(b) && digitsOnly(a).length >= 10;
}

async function pollTwilioChannel(
  client: ReturnType<typeof twilio>,
  channel: "sms" | "whatsapp",
  toNumber: string,
): Promise<number> {
  let created = 0;
  const listTo = normalizeTwilioListTo(channel, toNumber);
  const since = new Date(
    Math.max(0, lastPollTimestamp.getTime() - TWILIO_OVERLAP_MS),
  );
  let messages: Awaited<ReturnType<typeof client.messages.list>>;
  try {
    messages = await client.messages.list({
      to: listTo,
      dateSentAfter: since,
      pageSize: 50,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const chain = msg.includes("SELF_SIGNED_CERT") || msg.includes("certificate");
    console.error(
      `[inbound-poller] Twilio messages.list failed (${channel}, to=${listTo}):`,
      e,
    );
    if (chain) {
      console.error(
        "[inbound-poller] TLS to api.twilio.com failed (often corporate SSL inspection). Fix: set NODE_EXTRA_CA_CERTS to your org root CA PEM, or disable HTTPS inspection for api.twilio.com.",
      );
    }
    return 0;
  }

  if (messages.length === 0) {
    try {
      const broad = await client.messages.list({
        dateSentAfter: since,
        pageSize: 50,
      });
      messages = broad.filter(
        (m) =>
          m.direction === "inbound" &&
          twilioToMatchesOurNumber(channel, m.to ?? "", toNumber),
      );
      if (messages.length > 0) {
        console.log(
          `[inbound-poller] Twilio ${channel}: using unfiltered list fallback, ${messages.length} inbound to our number`,
        );
      }
    } catch (e2) {
      console.error(
        `[inbound-poller] Twilio ${channel} fallback list also failed:`,
        e2,
      );
    }
  }

  const inbound = messages.filter((m) => m.direction === "inbound");
  if (messages.length > 0 || inbound.length > 0) {
    console.log(
      `[inbound-poller] Twilio ${channel}: list returned ${messages.length} message(s), ${inbound.length} inbound (to=${listTo})`,
    );
  }

  for (const msg of messages) {
    if (msg.direction !== "inbound") continue;
    try {
      const sid = msg.sid;
      const exists = await prisma.communication.findFirst({
        where: { vendor_message_id: sid },
      });
      if (exists) continue;

      const fromRaw = msg.from ?? "";
      const digits = normalizeInboundPhoneDigits(fromRaw, channel);
      const chLabel = channel === "whatsapp" ? "WhatsApp" : "SMS";
      const phoneForLog = formatInboundLogPhone(digits);

      const sentAt = msg.dateCreated ?? new Date();
      const toStored = msg.to;

      const matches = await findAllCandidatesByPhoneDigits(digits);
      const routing = await resolveSmsWaInboundRouting(channel, matches);

      if (routing.kind === "unmatched") {
        console.warn(
          `[inbound-poller] Inbound ${chLabel} from ${phoneForLog} — no matching candidate found`,
        );
        const inboundOwnerUnmatched =
          channel === "sms" && toStored
            ? await resolveInboundSmsOwner("", toStored)
            : null;
        await prisma.communication.create({
          data: {
            candidate_id: null,
            job_id: null,
            unmatched: true,
            channel,
            direction: "inbound",
            sender_type: "candidate",
            sender_name: null,
            thread_id: null,
            from_address: msg.from ?? null,
            to_address: toStored ?? null,
            subject: null,
            body: msg.body ?? "",
            delivery_status: "delivered",
            vendor_message_id: sid,
            sent_at: sentAt,
            ...(channel === "sms" && inboundOwnerUnmatched?.smsNumberId
              ? { sms_number_id: inboundOwnerUnmatched.smsNumberId }
              : {}),
          },
        });
        created += 1;
        continue;
      }

      if (routing.kind === "skip") {
        console.info(
          `[inbound-poller] Skip ${channel} ${sid}: ${routing.reason} (from=${msg.from})`,
        );
        continue;
      }

      const { candidate, jobId, threadId } = routing;

      const inboundSmsOwner =
        channel === "sms" && toStored
          ? await resolveInboundSmsOwner(digits, toStored)
          : null;

      const row = await prisma.communication.create({
        data: {
          candidate_id: candidate.id,
          job_id: jobId,
          unmatched: false,
          channel,
          direction: "inbound",
          sender_type: "candidate",
          sender_name: null,
          thread_id: threadId,
          from_address: msg.from ?? null,
          to_address: toStored ?? null,
          subject: null,
          body: msg.body ?? "",
          delivery_status: "delivered",
          vendor_message_id: sid,
          sent_at: sentAt,
          ...(channel === "sms" && inboundSmsOwner?.smsNumberId
            ? { sms_number_id: inboundSmsOwner.smsNumberId }
            : {}),
        },
      });

      const finalThreadId = threadId ?? row.id;
      if (!threadId) {
        await prisma.communication.update({
          where: { id: row.id },
          data: { thread_id: row.id },
        });
      }

      const job = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });
      console.log(
        `Inbound ${chLabel} from ${phoneForLog} matched to Candidate ${candidate.name} on Job ${job.title}, Thread ${finalThreadId}`,
      );

      const comm = await prisma.communication.findUniqueOrThrow({
        where: { id: row.id },
      });
      emitInboundSaved(
        comm,
        candidate,
        job,
        channel === "sms" ? inboundSmsOwner : null,
      );
      created += 1;
    } catch (e) {
      console.error(`[inbound-poller] ${channel} ingest error:`, e);
    }
  }
  return created;
}

async function runPollCycle(): Promise<void> {
  let newEmails = 0;
  let newSms = 0;
  let newWa = 0;

  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) {
    console.warn(
      "[inbound-poller] RESEND_API_KEY missing — skipping email polling",
    );
  } else {
    try {
      newEmails = await pollEmailInbox(resendKey);
    } catch (e) {
      console.error("[inbound-poller] Email poll failed:", e);
    }
  }

  const twilioClient = getTwilioClient();
  if (!twilioClient) {
    console.warn(
      "[inbound-poller] Twilio credentials missing — skipping SMS/WhatsApp polling",
    );
  } else {
    const smsTo = process.env.TWILIO_PHONE_NUMBER?.trim();
    if (!smsTo) {
      console.warn(
        "[inbound-poller] TWILIO_PHONE_NUMBER missing — skipping SMS polling",
      );
    } else {
      try {
        newSms = await pollTwilioChannel(twilioClient, "sms", smsTo);
      } catch (e) {
        console.error("[inbound-poller] SMS poll failed:", e);
      }
    }

    const waTo = process.env.TWILIO_WHATSAPP_NUMBER?.trim();
    if (!waTo) {
      console.warn(
        "[inbound-poller] TWILIO_WHATSAPP_NUMBER missing — skipping WhatsApp polling",
      );
    } else {
      try {
        newWa = await pollTwilioChannel(twilioClient, "whatsapp", waTo);
      } catch (e) {
        console.error("[inbound-poller] WhatsApp poll failed:", e);
      }
    }
  }

  lastPollTimestamp = new Date();
  console.log(
    `Polling for inbound messages... Found ${newEmails} new emails, ${newSms} new SMS, ${newWa} new WhatsApp`,
  );
}

export function startPolling(): void {
  if (intervalId != null) return;
  lastPollTimestamp = new Date(Date.now() - TWILIO_LOOKBACK_MS);
  void runPollCycle();
  intervalId = setInterval(() => {
    void runPollCycle();
  }, POLL_MS);
}

export function stopPolling(): void {
  if (intervalId != null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
