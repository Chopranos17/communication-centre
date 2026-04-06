import type { CurrentJobEmailRow } from "../api/candidatesClient";

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
  row: Pick<CurrentJobEmailRow, "channel" | "subject" | "body">,
  max = 75,
): { subjectPart: string; bodyPart: string } {
  if (row.channel === "sms" || row.channel === "whatsapp") {
    const plain = stripHtml(row.body).replace(/\s+/g, " ").trim();
    if (plain.length <= max) {
      return { subjectPart: "", bodyPart: plain || "—" };
    }
    return { subjectPart: "", bodyPart: plain.slice(0, max) };
  }
  return buildEmailPreviewLine(row.subject, row.body, max);
}

/** "Today" / "Yesterday" / short date for timeline Time column (PRD §4.4). */
export function formatTimelineTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  const startOf = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();

  const t0 = startOf(now);
  const t = startOf(d);
  const dayMs = 86400000;

  if (t === t0) {
    return "Today";
  }
  if (t === t0 - dayMs) {
    return "Yesterday";
  }
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
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
