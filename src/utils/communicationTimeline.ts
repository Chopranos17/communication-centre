/** Plain text for email body (seed data is plain; strip tags if HTML appears later). */
export function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
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
