import type { CurrentJobEmailRow } from "../api/candidatesClient";

/** One visual row in the timeline: a single message or a full email thread. */
export type TimelineThreadGroup = {
  key: string
  /** Messages in chronological order (oldest first). */
  rows: CurrentJobEmailRow[]
}

export type TimelineGroupSortOrder = "newest" | "oldest";

/**
 * Group flat timeline rows into threads (email + same threadId) and singletons (SMS/WhatsApp,
 * standalone email). Sort groups by latest activity. PRD §4.5 / Task 12.
 */
export function buildTimelineThreadGroups(
  rows: CurrentJobEmailRow[],
  groupOrder: TimelineGroupSortOrder = "newest",
): TimelineThreadGroup[] {
  const emailRows = rows.filter((r) => r.channel === "email")
  const otherRows = rows.filter((r) => r.channel !== "email")

  const threadMap = new Map<string, CurrentJobEmailRow[]>()
  const singletonEmails: CurrentJobEmailRow[] = []

  for (const r of emailRows) {
    if (r.threadId) {
      const arr = threadMap.get(r.threadId) ?? []
      arr.push(r)
      threadMap.set(r.threadId, arr)
    } else {
      singletonEmails.push(r)
    }
  }

  const groups: TimelineThreadGroup[] = []

  for (const r of singletonEmails) {
    groups.push({ key: `email-${r.id}`, rows: [r] })
  }

  for (const [tid, list] of threadMap) {
    const sorted = [...list].sort(
      (a, b) =>
        new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
    )
    groups.push({ key: `thread-${tid}`, rows: sorted })
  }

  for (const r of otherRows) {
    groups.push({ key: `${r.channel}-${r.id}`, rows: [r] })
  }

  groups.sort((a, b) => {
    const maxA = Math.max(
      ...a.rows.map((x) => new Date(x.sentAt).getTime()),
    )
    const maxB = Math.max(
      ...b.rows.map((x) => new Date(x.sentAt).getTime()),
    )
    const cmp = maxB - maxA
    return groupOrder === "newest" ? cmp : -cmp
  })

  return groups
}

/**
 * Sender column for a thread: "{Candidate Name} (N)" if any inbound/candidate message; else
 * "{root sender} (N)" using chronologically first message. PRD §4.5.
 */
export function threadSenderColumnLabel(
  rows: CurrentJobEmailRow[],
  candidateName: string,
): string {
  const n = rows.length
  const hasCandidate = rows.some((r) => r.senderType === "candidate")
  if (hasCandidate) {
    return `${candidateName} (${n})`
  }
  const sorted = [...rows].sort(
    (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
  )
  return `${sorted[0].senderLabel} (${n})`
}

/** Plain text for email body (seed data is plain; strip tags if HTML appears later). */
export function stripHtml(s: string | undefined | null): string {
  return String(s ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Subject (bold in UI) + body preview; combined visible text capped at `max` chars (PRD §4.4).
 */
export function buildEmailPreviewLine(
  subject: string | null,
  body: string,
  max = 75,
): { subjectPart: string; bodyPart: string } {
  const sub = subject?.trim() || "(No subject)";
  const plain = stripHtml(body).replace(/\s+/g, " ").trim();
  const full = plain ? `${sub} ${plain}` : sub;
  if (full.length <= max) {
    return { subjectPart: sub, bodyPart: plain ? ` ${plain}` : "" };
  }
  if (sub.length >= max) {
    return { subjectPart: sub.slice(0, max), bodyPart: "" };
  }
  const take = max - sub.length - 1;
  if (take <= 0) {
    return { subjectPart: sub, bodyPart: "" };
  }
  return { subjectPart: sub, bodyPart: ` ${plain.slice(0, take)}` };
}

/**
 * Message column preview: email uses subject + body; SMS/WhatsApp use body only (channel icon shown separately).
 */
export function buildTimelineMessagePreview(
  row: Pick<
    CurrentJobEmailRow,
    "channel" | "subject" | "body" | "meeting"
  >,
  max = 75,
): { subjectPart: string; bodyPart: string } {
  if (row.channel === "system") {
    const plain = stripHtml(row.body).replace(/\s+/g, " ").trim();
    if (plain.length <= max) {
      return { subjectPart: "", bodyPart: plain || "—" };
    }
    return { subjectPart: "", bodyPart: plain.slice(0, max) };
  }
  if (row.channel === "sms" || row.channel === "whatsapp") {
    const plain = stripHtml(row.body).replace(/\s+/g, " ").trim();
    if (plain.length <= max) {
      return { subjectPart: "", bodyPart: plain || "—" };
    }
    return { subjectPart: "", bodyPart: plain.slice(0, max) };
  }
  if (row.channel === "meeting") {
    const sub = row.subject?.trim() || "1:1 Meeting";
    const mtg = row.meeting;
    const tail = mtg
      ? ` · ${new Date(mtg.scheduledAt).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}`
      : "";
    const full = `${sub}${tail}`.replace(/\s+/g, " ").trim();
    if (full.length <= max) {
      return { subjectPart: sub, bodyPart: tail };
    }
    if (sub.length >= max) {
      return { subjectPart: sub.slice(0, max), bodyPart: "" };
    }
    const take = max - sub.length;
    return {
      subjectPart: sub,
      bodyPart: tail.trim().slice(0, Math.max(0, take)),
    };
  }
  return buildEmailPreviewLine(row.subject, row.body, max);
}

/** Badge label for 1:1 meeting status (Task 14). */
export function meetingStatusBadgeLabel(status: string): string {
  const m: Record<string, string> = {
    scheduled: "Scheduled",
    rescheduled: "Rescheduled",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return m[status] ?? status;
}

/** Human label for meeting channel key (schema / API). */
export function meetingChannelLabel(ch: string): string {
  const m: Record<string, string> = {
    google_meet: "Google Meet",
    ms_teams: "Microsoft Teams",
    zoom: "Zoom",
    darwinbox_meet: "Darwinbox Meet",
    in_person: "In person",
  };
  return m[ch] ?? ch;
}

function startOfDay(x: Date): Date {
  return new Date(x.getFullYear(), x.getMonth(), x.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function yesterday(ref: Date): Date {
  const d = new Date(ref);
  d.setDate(d.getDate() - 1);
  return d;
}

/** True when `date` is 2–6 calendar days before `ref` (not today/yesterday). */
function isWithinDays(date: Date, ref: Date, n: number): boolean {
  const dayMs = 86400000;
  const diffDays = Math.round(
    (startOfDay(ref).getTime() - startOfDay(date).getTime()) / dayMs,
  );
  return diffDays >= 2 && diffDays < n;
}

/**
 * Timeline list timestamps: always includes time; relative labels for recent dates.
 * Same day → "Today, 3:42 PM"; yesterday → "Yesterday, …"; within prior 7 days → "Mon, …";
 * older same year → "6 Apr, 3:42 PM"; other year → "15 Dec 2025, 9:00 AM".
 */
export function formatTimelineTime(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isSameDay(date, now)) {
    return `Today, ${timeStr}`;
  }
  if (isSameDay(date, yesterday(now))) {
    return `Yesterday, ${timeStr}`;
  }
  if (isWithinDays(date, now, 7)) {
    const day = date.toLocaleDateString("en-US", { weekday: "short" });
    return `${day}, ${timeStr}`;
  }
  if (date.getFullYear() === now.getFullYear()) {
    const d = date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
    });
    return `${d}, ${timeStr}`;
  }
  const d = date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${d}, ${timeStr}`;
}

/** Third row preview for meeting cards: "30 min · Google Meet · with …". */
export function formatMeetingTimelineFooter(
  row: Pick<CurrentJobEmailRow, "senderLabel" | "meeting" | "body">,
  candidateName: string,
): string {
  const mtg = row.meeting;
  if (!mtg) {
    return stripHtml(row.body).replace(/\s+/g, " ").trim() || "—";
  }
  const parts: string[] = [
    `${mtg.durationMinutes} min`,
    meetingChannelLabel(mtg.meetingChannel),
  ];
  const names = [candidateName.trim(), row.senderLabel].filter(Boolean);
  const uniq: string[] = [];
  for (const n of names) {
    if (n && !uniq.includes(n)) uniq.push(n);
  }
  if (uniq.length) {
    parts.push(`with ${uniq.join(", ")}`);
  }
  return parts.join(" · ");
}

/** Full date, time, and timezone for email detail modal (PRD §4.4). */
export function formatEmailDetailDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  // Do not mix `dateStyle`/`timeStyle` with `timeZoneName` — Chromium throws Invalid option.
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

/** Tooltip / banner copy for scheduled outbound email. */
export function formatScheduledSendLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Scheduled";
  return `Scheduled for ${d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })}`;
}

/** PRD §4.5: only threads involving contact@darwinbox.in support Reply / Follow Up. */
export function isContactDarwinboxDisplay(fromAddress: string): boolean {
  return fromAddress.toLowerCase().includes("contact@darwinbox.in");
}

/**
 * Task 13: whether to show Follow Up vs Reply on a timeline email group.
 * `rows` must be one thread or one standalone email (all `channel === "email"`).
 */
/** Primary CTA for touchpoints (Recent Activity, etc.) — aligns with Communications timeline rules. */
export type ActivityPrimaryActionType = "reply" | "followup" | "view";

/**
 * Derives Reply vs Follow up vs View from timeline rows for one thread or one non-email message.
 * Email: reuses {@link getContactThreadActions} (contact@ threads). SMS/WhatsApp: Reply only when
 * the latest row is inbound (matches hover Reply on the Communications tab). Meeting/system: view.
 */
export function getActivityPrimaryActionFromTimelineRows(
  rows: CurrentJobEmailRow[],
): ActivityPrimaryActionType {
  if (!rows.length) return "view";
  const sorted = [...rows].sort(
    (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
  );
  const latest = sorted[sorted.length - 1]!;
  const ch = latest.channel;
  if (ch === "system") return "view";
  if (ch === "meeting") return "view";
  if (ch === "sms" || ch === "whatsapp") {
    return latest.direction === "inbound" ? "reply" : "view";
  }
  if (ch === "email") {
    const ta = getContactThreadActions(rows);
    if (!ta.eligible) return "view";
    if (ta.reply) return "reply";
    if (ta.followUp) return "followup";
  }
  return "view";
}

export function getContactThreadActions(rows: CurrentJobEmailRow[]): {
  eligible: boolean;
  followUp: boolean;
  reply: boolean;
} {
  if (!rows.length) {
    return { eligible: false, followUp: false, reply: false };
  }
  if (rows.some((r) => r.channel !== "email")) {
    return { eligible: false, followUp: false, reply: false };
  }
  const hasContactOutbound = rows.some(
    (r) =>
      r.senderType !== "candidate" &&
      isContactDarwinboxDisplay(r.fromAddress),
  );
  if (!hasContactOutbound) {
    return { eligible: false, followUp: false, reply: false };
  }
  const hasCandidate = rows.some((r) => r.senderType === "candidate");
  return {
    eligible: true,
    followUp: !hasCandidate,
    reply: hasCandidate,
  };
}

/** API `threadId` for compose: shared thread key, or root communication id when not yet threaded. */
export function getThreadComposeKey(rows: CurrentJobEmailRow[]): string | null {
  if (!rows.length || rows.some((r) => r.channel !== "email")) return null;
  return rows[0].threadId ?? rows[0].id;
}

/** Chronological order (oldest first) for thread UIs. */
export function sortEmailRowsChronological(
  rows: CurrentJobEmailRow[],
): CurrentJobEmailRow[] {
  return [...rows].sort(
    (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
  );
}

/** Subject line for Re: replies (Task 13). */
export function replySubjectFromThread(rows: CurrentJobEmailRow[]): string {
  const sorted = sortEmailRowsChronological(rows);
  const sub =
    sorted.map((r) => r.subject?.trim()).find((s) => s && s.length > 0) ??
    "(No subject)";
  if (/^re:\s*/i.test(sub)) return sub;
  return `Re: ${sub}`;
}
