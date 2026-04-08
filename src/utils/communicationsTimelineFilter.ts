import type { CurrentJobEmailRow } from "../api/candidatesClient";

/** Panel + timeline filter shape (also used by `CommunicationFilterPanel`). */
export interface CommunicationFilters {
  sortBy: "newest" | "oldest";
  direction: "all" | "outbound" | "inbound";
  deliveryStatus: "all" | "sent" | "delivered" | "failed" | "pending";
  dateRange: "all" | "7d" | "30d" | "90d";
  senderType:
    | "all"
    | "recruiter"
    | "hiring_lead"
    | "system"
    | "candidate";
}

export const DEFAULT_COMMUNICATION_FILTERS: CommunicationFilters = {
  sortBy: "newest",
  direction: "all",
  deliveryStatus: "all",
  dateRange: "all",
  senderType: "all",
};

export function countNonDefaultPanelFilters(f: CommunicationFilters): number {
  let n = 0;
  if (f.sortBy !== "newest") n += 1;
  if (f.direction !== "all") n += 1;
  if (f.deliveryStatus !== "all") n += 1;
  if (f.dateRange !== "all") n += 1;
  if (f.senderType !== "all") n += 1;
  return n;
}

export const CHANNEL_FILTER_IDS = [
  "all",
  "email",
  "sms",
  "whatsapp",
  "meeting",
] as const;

export type ChannelFilterId = (typeof CHANNEL_FILTER_IDS)[number];

export type DirectionFilterId = "all" | "outbound" | "inbound";

export function stripHtmlTags(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function rowMatchesSearch(
  row: CurrentJobEmailRow,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    row.subject ?? "",
    stripHtmlTags(row.body ?? ""),
    row.senderLabel ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export function rowMatchesDirection(
  row: CurrentJobEmailRow,
  dir: DirectionFilterId,
): boolean {
  if (dir === "all") return true;
  return row.direction === dir;
}

export function rowMatchesChannel(
  row: CurrentJobEmailRow,
  channel: ChannelFilterId,
): boolean {
  if (channel === "all") return true;
  return row.channel === channel;
}

export function applySearchAndDirection(
  rows: CurrentJobEmailRow[],
  query: string,
  direction: DirectionFilterId,
): CurrentJobEmailRow[] {
  return rows.filter(
    (r) => rowMatchesSearch(r, query) && rowMatchesDirection(r, direction),
  );
}

export function rowMatchesDeliveryStatus(
  row: CurrentJobEmailRow,
  status: CommunicationFilters["deliveryStatus"],
): boolean {
  if (status === "all") return true;
  return row.deliveryStatus === status;
}

export function rowMatchesDateRange(
  row: CurrentJobEmailRow,
  range: CommunicationFilters["dateRange"],
): boolean {
  if (range === "all") return true;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const ms = days * 24 * 60 * 60 * 1000;
  const t = new Date(row.sentAt).getTime();
  return Date.now() - t <= ms;
}

export function rowMatchesSenderTypeFilter(
  row: CurrentJobEmailRow,
  sender: CommunicationFilters["senderType"],
): boolean {
  if (sender === "all") return true;
  if (sender === "recruiter") return row.senderType === "recruiter";
  if (sender === "hiring_lead") return row.senderType === "hiring_lead";
  if (sender === "system")
    return row.senderType === "system" || row.senderType === "CRM";
  if (sender === "candidate") return row.senderType === "candidate";
  return true;
}

export function applyPanelRowFilters(
  rows: CurrentJobEmailRow[],
  panel: CommunicationFilters,
): CurrentJobEmailRow[] {
  return rows.filter(
    (r) =>
      rowMatchesDirection(r, panel.direction) &&
      rowMatchesDeliveryStatus(r, panel.deliveryStatus) &&
      rowMatchesDateRange(r, panel.dateRange) &&
      rowMatchesSenderTypeFilter(r, panel.senderType),
  );
}

/** Search + panel row filters (direction, delivery, date, sender) — excludes channel pill. */
export function applySearchAndPanelRowFilters(
  rows: CurrentJobEmailRow[],
  query: string,
  panel: CommunicationFilters,
): CurrentJobEmailRow[] {
  return applyPanelRowFilters(
    rows.filter((r) => rowMatchesSearch(r, query)),
    panel,
  );
}

export function applyFullGlobalFilter(
  rows: CurrentJobEmailRow[],
  query: string,
  panel: CommunicationFilters,
  channel: ChannelFilterId,
): CurrentJobEmailRow[] {
  return applySearchAndPanelRowFilters(rows, query, panel).filter((r) =>
    rowMatchesChannel(r, channel),
  );
}

export type ChannelCounts = {
  all: number;
  email: number;
  sms: number;
  whatsapp: number;
  meeting: number;
};

export function countMessagesByChannel(rows: CurrentJobEmailRow[]): ChannelCounts {
  const counts: ChannelCounts = {
    all: rows.length,
    email: 0,
    sms: 0,
    whatsapp: 0,
    meeting: 0,
  };
  for (const r of rows) {
    const ch = r.channel;
    if (ch === "email") counts.email += 1;
    else if (ch === "sms") counts.sms += 1;
    else if (ch === "whatsapp") counts.whatsapp += 1;
    else if (ch === "meeting") counts.meeting += 1;
  }
  return counts;
}
