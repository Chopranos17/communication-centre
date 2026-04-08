import type {
  CurrentJobEmailRow,
  MeetingTimelineMeta,
} from "../api/candidatesClient";

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

/** Maps a Communication-shaped record to the timeline row used by the Communications tab. */
export function communicationToTimelineRow(
  row: {
    id: string;
    channel: string;
    direction: string;
    sender_type: string;
    sender_name: string | null;
    subject: string | null;
    body: string;
    sent_at: string | Date;
    from_address: string | null;
    to_address: string | null;
    delivery_status: string;
    thread_id: string | null;
  },
  meeting: MeetingTimelineMeta | null = null,
): CurrentJobEmailRow {
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
  const sentAt =
    typeof row.sent_at === "string"
      ? row.sent_at
      : row.sent_at.toISOString();
  return {
    id: row.id,
    channel,
    direction: row.direction === "inbound" ? "inbound" : "outbound",
    senderType: mapped.senderType,
    senderLabel: mapped.senderLabel,
    filterBucket: mapped.filterBucket,
    subject: row.subject,
    body: row.body,
    sentAt,
    fromAddress: row.from_address ?? "",
    toAddress: row.to_address ?? "",
    deliveryStatus: row.delivery_status as CurrentJobEmailRow["deliveryStatus"],
    threadId:
      channel === "email" ? (row.thread_id?.trim() || row.id) : null,
    meeting:
      channel === "meeting" && meeting
        ? meeting
        : undefined,
  };
}
