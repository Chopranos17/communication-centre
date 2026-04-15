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

      const currentJob = await prisma.candidateJob.findFirst({
        where: { candidate_id: candidate.id, is_current: true },
      });
      if (!currentJob) {
        console.info(
          `[email-inbox-sync] skip ${messageId}: candidate ${candidate.id} has no current job`,
        );
        continue;
      }

      const subject = headers["subject"] || null;
      const body = decodeGmailBody(payload);
      const sentAt = parseSentAt(headers["date"]);

      const row = await prisma.communication.create({
        data: {
          candidate_id: candidate.id,
          job_id: currentJob.job_id,
          channel: "email",
          direction: "inbound",
          sender_type: "candidate",
          sender_name: candidate.name,
          thread_id: null,
          from_address: senderEmail,
          to_address: connectedEmail.email_address,
          subject,
          body: body.length ? body : "(no body)",
          delivery_status: "delivered",
          vendor_message_id: messageId,
          sent_at: sentAt,
          connected_email_id: connectedEmail.id,
        },
      });

      if (!row.thread_id) {
        await prisma.communication.update({
          where: { id: row.id },
          data: { thread_id: row.id },
        });
      }

      const job = await prisma.job.findUniqueOrThrow({
        where: { id: currentJob.job_id },
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
