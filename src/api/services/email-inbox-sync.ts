import "dotenv/config";
import { google } from "googleapis";
import type { Candidate, ConnectedEmail } from "@prisma/client";
import { prisma } from "../db";
import { emitNewMessage } from "../socket-io";
import { getAllConnectedEmails } from "./connected-email-lookup";
import { getValidAccessToken } from "./email-oauth";

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

function buildCandidateLookup(
  candidates: Pick<Candidate, "id" | "name" | "email">[],
): Map<string, Pick<Candidate, "id" | "name" | "email">> {
  const map = new Map<string, Pick<Candidate, "id" | "name" | "email">>();
  for (const c of candidates) {
    for (const v of emailMatchVariants(c.email)) {
      map.set(v, c);
    }
  }
  return map;
}

function findCandidateByEmailVariants(
  lookup: Map<string, Pick<Candidate, "id" | "name" | "email">>,
  senderEmail: string,
): Pick<Candidate, "id" | "name" | "email"> | null {
  for (const v of emailMatchVariants(senderEmail)) {
    const hit = lookup.get(v);
    if (hit) return hit;
  }
  return null;
}

function headerMap(
  headers: { name?: string | null; value?: string | null }[] | null | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers) return out;
  for (const h of headers) {
    const n = h.name?.trim();
    if (!n) continue;
    out[n.toLowerCase()] = h.value?.trim() ?? "";
  }
  return out;
}

function parseSentAt(dateHeader: string | undefined): Date {
  if (!dateHeader?.trim()) return new Date();
  const d = new Date(dateHeader);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

/** Strips nested Re:/Fwd: prefixes for matching an inbound reply to its outbound. */
function normalizeEmailSubject(s: string | null | undefined): string {
  if (!s?.trim()) return "";
  let t = s.trim();
  for (let i = 0; i < 12; i++) {
    const next = t.replace(/^(re|fw|fwd)\s*:\s*/i, "").trim();
    if (next === t) break;
    t = next;
  }
  return t.toLowerCase();
}

export function extractEmailAddress(fromHeader: string): string {
  const t = fromHeader.trim();
  const bracket = t.match(/<([^>]+@[^>]+)>/);
  if (bracket?.[1]) return bracket[1].trim().toLowerCase();
  const loose = t.match(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  );
  return (loose?.[0] ?? t).trim().toLowerCase();
}

function collectMimeBodies(part: unknown): { html: string; plain: string } {
  let html = "";
  let plain = "";

  function visit(p: Record<string, unknown> | null | undefined): void {
    if (!p || typeof p !== "object") return;

    const mime = String(p.mimeType ?? "").toLowerCase();
    const body = p.body as { data?: string } | undefined;
    if (body?.data) {
      try {
        const decoded = Buffer.from(body.data, "base64url").toString("utf8");
        if (mime.includes("text/html") && decoded && !html) html = decoded;
        else if (mime.includes("text/plain") && decoded && !plain) {
          plain = decoded;
        }
      } catch {
        /* ignore bad segment */
      }
    }

    const parts = p.parts;
    if (Array.isArray(parts)) {
      for (const sub of parts) visit(sub as Record<string, unknown>);
    }
  }

  visit(part as Record<string, unknown>);
  return { html, plain };
}

/**
 * Removes embedded &lt;style&gt;/&lt;script&gt;/&lt;head&gt; blocks and leading CSS rule text
 * (e.g. Outlook's `P {margin-top:0;margin-bottom:0;}`) that otherwise leak into the stored body.
 */
function sanitizeInboundEmailBody(raw: string): string {
  let s = raw
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, "");
  s = stripLeadingCssRules(s);
  return s.trim();
}

/** Strip simple `selector { ... }` chunks at the start when they appear as plain text (malformed or stripped tags). */
function stripLeadingCssRules(text: string): string {
  let t = text.trimStart();
  const simpleRule = /^[^{<]*?\{[^}]*\}\s*/;
  let guard = 0;
  while (simpleRule.test(t) && guard++ < 40) {
    t = t.replace(simpleRule, "").trimStart();
  }
  return t;
}

function stripQuotedReply(html: string): string {
  // Gmail pattern: <div class="gmail_quote">...</div>
  const gmailQuoteIndex = html.indexOf('<div class="gmail_quote"');
  if (gmailQuoteIndex !== -1) {
    return html.substring(0, gmailQuoteIndex).trim();
  }

  // Outlook pattern: <div id="appendonsend"></div> or <div style="border-top:...">
  // Outlook also uses <hr> before quoted content
  const outlookPatterns = [
    /<div id="appendonsend"><\/div>/i,
    /<div style="border-top:\s*solid/i,
    /<hr\s*style="display:\s*inline-block/i,
    /<!--\s*Original\s*Message\s*-->/i,
  ];
  for (const pattern of outlookPatterns) {
    const match = html.search(pattern);
    if (match !== -1) {
      return html.substring(0, match).trim();
    }
  }

  // Plain text pattern: line starting with "On ... wrote:" or "From: ..."
  const plainTextPatterns = [
    /\n\s*On .+ wrote:\s*\n/,
    /\n\s*From:\s+.+\n/,
    /\n\s*-{3,}\s*Original Message\s*-{3,}/i,
    /\n\s*_{3,}\s*\n/,
  ];
  for (const pattern of plainTextPatterns) {
    const match = html.search(pattern);
    if (match !== -1) {
      return html.substring(0, match).trim();
    }
  }

  return html;
}

export function decodeGmailBody(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const p = payload as Record<string, unknown>;

  if (p.body && typeof p.body === "object") {
    const data = (p.body as { data?: string }).data;
    if (data) {
      try {
        const mime = String(p.mimeType ?? "").toLowerCase();
        const decoded = Buffer.from(data, "base64url").toString("utf8");
        if (mime.includes("text/html")) return decoded;
        if (mime.includes("text/plain")) return decoded;
      } catch {
        /* fall through to parts */
      }
    }
  }

  const { html, plain } = collectMimeBodies(p);
  if (html) return html;
  if (plain) return plain;
  return "";
}

export async function syncAllConnectedInboxes(): Promise<void> {
  const all = await getAllConnectedEmails();
  const active = all.filter((e) => e.is_active && e.provider === "google");
  let totalNew = 0;
  const checked = active.length;
  for (const ce of active) {
    try {
      totalNew += await syncSingleInbox(ce);
    } catch (e) {
      console.error("[email-inbox-sync] syncSingleInbox failed:", ce.id, e);
    }
  }
  console.log(
    `Email sync: checked ${checked} inboxes, found ${totalNew} new messages`,
  );
}

export async function syncSingleInbox(
  connectedEmail: ConnectedEmail,
): Promise<number> {
  const accessToken = await getValidAccessToken(connectedEmail);
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth });

  const distinctRows = await prisma.$queryRaw<Array<{ email: string }>>`
    SELECT DISTINCT email FROM Candidate WHERE email IS NOT NULL
  `;
  const distinctEmails = distinctRows
    .map((r) => r.email?.trim())
    .filter((e): e is string => Boolean(e));
  const candidates =
    distinctEmails.length > 0
      ? await prisma.candidate.findMany({
          where: { email: { in: distinctEmails } },
          select: { id: true, name: true, email: true },
        })
      : [];
  const candidateLookup = buildCandidateLookup(candidates);
  if (candidates.length === 0) {
    await prisma.connectedEmail.update({
      where: { id: connectedEmail.id },
      data: { last_sync_at: new Date() },
    });
    return 0;
  }

  const listRes = await gmail.users.messages.list({
    userId: "me",
    q: "newer_than:2m",
    maxResults: 20,
  });

  const listed = listRes.data.messages ?? [];
  let created = 0;

  for (const ref of listed) {
    const messageId = ref.id;
    if (!messageId) continue;

    try {
      const exists = await prisma.communication.findFirst({
        where: { vendor_message_id: messageId },
      });
      if (exists) continue;

      const full = await gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full",
      });

      const payload = full.data.payload;
      if (!payload) continue;

      const headers = headerMap(payload.headers);
      const fromRaw =
        headers["from"] ?? headers["sender"] ?? "";
      const senderEmail = extractEmailAddress(fromRaw);
      if (!senderEmail) continue;

      const candidate = findCandidateByEmailVariants(
        candidateLookup,
        senderEmail,
      );
      if (!candidate) continue;

      const lastOutbound = await prisma.communication.findFirst({
        where: {
          candidate_id: candidate.id,
          channel: "email",
          direction: "outbound",
        },
        orderBy: { sent_at: "desc" },
        select: { job_id: true },
      });

      const currentJob = await prisma.candidateJob.findFirst({
        where: { candidate_id: candidate.id, is_current: true },
      });

      let resolvedJobId =
        currentJob?.job_id ?? lastOutbound?.job_id ?? null;

      const subject = headers["subject"] || null;
      const rawBody = decodeGmailBody(payload);
      const cleanBody = stripQuotedReply(sanitizeInboundEmailBody(rawBody));
      const sentAt = parseSentAt(headers["date"]);

      const gmailApiThreadId = full.data.threadId?.trim() || null;

      let resolvedThreadId: string | null = null;

      if (gmailApiThreadId) {
        const gmailPeer = await prisma.communication.findFirst({
          where: {
            candidate_id: candidate.id,
            gmail_thread_id: gmailApiThreadId,
          },
          orderBy: { sent_at: "desc" },
          select: { thread_id: true, job_id: true, id: true },
        });
        if (gmailPeer) {
          resolvedThreadId =
            gmailPeer.thread_id?.trim() || gmailPeer.id;
          if (gmailPeer.job_id) {
            resolvedJobId = gmailPeer.job_id;
          }
        }
      }

      if (
        !resolvedThreadId &&
        resolvedJobId &&
        normalizeEmailSubject(subject).length > 0
      ) {
        const outbounds = await prisma.communication.findMany({
          where: {
            candidate_id: candidate.id,
            job_id: resolvedJobId,
            channel: "email",
            direction: "outbound",
          },
          orderBy: { sent_at: "desc" },
          take: 80,
          select: { id: true, thread_id: true, subject: true },
        });
        const subjNorm = normalizeEmailSubject(subject);
        const subjectHit = outbounds.find(
          (o) => normalizeEmailSubject(o.subject) === subjNorm,
        );
        if (subjectHit) {
          resolvedThreadId =
            subjectHit.thread_id?.trim() || subjectHit.id;
        }
      }

      if (!resolvedJobId) {
        console.info(
          `[email-inbox-sync] skip ${messageId}: candidate ${candidate.id} has no job (no current CandidateJob and no prior outbound)`,
        );
        continue;
      }

      const row = await prisma.communication.create({
        data: {
          candidate_id: candidate.id,
          job_id: resolvedJobId,
          channel: "email",
          direction: "inbound",
          sender_type: "candidate",
          sender_name: candidate.name,
          thread_id: resolvedThreadId,
          from_address: senderEmail,
          to_address: connectedEmail.email_address,
          subject,
          body: cleanBody.length ? cleanBody : "(no body)",
          delivery_status: "delivered",
          vendor_message_id: messageId,
          sent_at: sentAt,
          connected_email_id: connectedEmail.id,
          ...(gmailApiThreadId ? { gmail_thread_id: gmailApiThreadId } : {}),
        },
      });

      if (!resolvedThreadId) {
        await prisma.communication.update({
          where: { id: row.id },
          data: { thread_id: row.id },
        });
      }

      const job = await prisma.job.findUniqueOrThrow({
        where: { id: resolvedJobId },
      });
      const comm = await prisma.communication.findUniqueOrThrow({
        where: { id: row.id },
      });

      emitNewMessage({
        communication: {
          id: comm.id,
          candidate_id: comm.candidate_id,
          job_id: comm.job_id,
          channel: comm.channel,
          direction: comm.direction,
          sender_type: comm.sender_type,
          sender_id: comm.sender_id,
          sender_name: comm.sender_name,
          thread_id: comm.thread_id,
          from_address: comm.from_address,
          to_address: comm.to_address,
          cc_addresses: comm.cc_addresses,
          subject: comm.subject,
          body: comm.body,
          template_id: comm.template_id,
          delivery_status: comm.delivery_status,
          vendor_message_id: comm.vendor_message_id,
          sent_at: comm.sent_at.toISOString(),
          read_at: comm.read_at ? comm.read_at.toISOString() : null,
          scheduled_for: comm.scheduled_for?.toISOString() ?? null,
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

      created += 1;
    } catch (e) {
      console.error("[email-inbox-sync] message ingest error:", messageId, e);
    }
  }

  await prisma.connectedEmail.update({
    where: { id: connectedEmail.id },
    data: { last_sync_at: new Date() },
  });

  return created;
}
