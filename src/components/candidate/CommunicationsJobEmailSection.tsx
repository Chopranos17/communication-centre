import { Fragment, useMemo, useState, useEffect, useRef } from "react";
import type { CurrentJobEmailRow, TimelineChannel } from "../../api/candidatesClient";
import {
  buildTimelineMessagePreview,
  buildTimelineThreadGroups,
  type TimelineGroupSortOrder,
  formatMeetingTimelineFooter,
  formatTimelineTime,
  getContactThreadActions,
  stripHtml,
} from "../../utils/communicationTimeline";
import {
  ScheduledEmailTimelineMenu,
  ScheduledSendTimestamp,
} from "./ScheduledEmailTimelineMenu";
import {
  IconFollowUp,
  IconMoreVertical,
  IconReply,
} from "./CommunicationToolbarIcons";
import { ChannelTimelineIcon } from "./ChannelTimelineIcon";
import { ChannelTypeBadge } from "./ChannelTypeBadge";
import { DeliveryStatusGlyph } from "./DeliveryStatusGlyph";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import {
  sdsButtonIconTertiaryMini,
  sdsButtonLink,
  sdsButtonPrimarySplitLeft,
  sdsButtonPrimarySplitRight,
  sdsButtonSecondaryCompact,
  sdsButtonSecondarySm,
  sdsMenuItemBtn,
  sdsPillMdSelected,
  sdsPillMdUnselected,
} from "../../lib/sdsButtonClasses";

export type EmailTypeFilter = "all" | "system" | "user";

const FILTER_OPTIONS: { id: EmailTypeFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "system", label: "System Initiated" },
  { id: "user", label: "User Initiated" },
];

const INITIAL_VISIBLE = 6;
const EXPANDED_CAP = 10;
const SCROLL_MAX_HEIGHT_PX = 560;

function filterEmails(
  rows: CurrentJobEmailRow[],
  f: EmailTypeFilter,
): CurrentJobEmailRow[] {
  if (f === "all") return rows;
  if (f === "system") return rows.filter((r) => r.filterBucket === "system");
  return rows.filter((r) => r.filterBucket === "user");
}

function timelineDotClasses(channel: TimelineChannel): {
  circle: string;
  icon: string;
} {
  switch (channel) {
    case "email":
      return { circle: "bg-blue-100", icon: "text-blue-600" };
    case "whatsapp":
      return { circle: "bg-green-100", icon: "text-green-600" };
    case "sms":
      return { circle: "bg-amber-100", icon: "text-amber-600" };
    case "meeting":
      return { circle: "bg-purple-100", icon: "text-purple-600" };
    case "system":
      return { circle: "bg-gray-100", icon: "text-gray-400" };
    default:
      return { circle: "bg-gray-100", icon: "text-gray-400" };
  }
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InboundBadge() {
  return (
    <span className="rounded-full bg-[#E6F3FF] px-2 py-0.5 text-[11px] font-medium text-[#0169CC]">
      Inbound
    </span>
  );
}

function threadParentDisplayName(
  rows: CurrentJobEmailRow[],
  candidateName: string,
): string {
  const fromCandidate = rows.find((r) => r.senderType === "candidate");
  if (fromCandidate) {
    return candidateName.trim() || fromCandidate.senderLabel || "Candidate";
  }
  const sorted = [...rows].sort(
    (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
  );
  return sorted[0]?.senderLabel ?? "—";
}

function formatSenderTypeLabel(raw: string): string {
  const t = raw.trim();
  if (!t) return "—";
  return t
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

type CommunicationsJobEmailSectionProps = {
  defaultSectionOpen: boolean;
  jobTitle: string;
  jobId: string;
  jobCode?: string | null;
  titleSuffix?: string | null;
  showNewEmailButton: boolean;
  emails: CurrentJobEmailRow[];
  preGlobalEmailCount?: number;
  onClearGlobalFilters?: () => void;
  loading?: boolean;
  loadError?: string | null;
  onRetry?: () => void;
  missingJobMessage?: string | null;
  emptyFilterMessage?: string;
  emptyTimelineMessage?: string;
  onSelectEmail?: (row: CurrentJobEmailRow) => void;
  onInvalidateDetail?: () => void;
  onNewEmail?: () => void;
  newEmailDisabled?: boolean;
  newEmailDisabledTitle?: string;
  onSendSms?: () => void;
  onSendWhatsApp?: () => void;
  onScheduleMeeting?: () => void;
  smsDisabled?: boolean;
  whatsappDisabled?: boolean;
  scheduleMeetingDisabled?: boolean;
  smsDisabledTitle?: string;
  whatsappDisabledTitle?: string;
  scheduleMeetingDisabledTitle?: string;
  candidateName?: string;
  onFollowUp?: (threadRows: CurrentJobEmailRow[]) => void;
  onReply?: (threadRows: CurrentJobEmailRow[]) => void;
  timelineGroupOrder?: TimelineGroupSortOrder;
  /** ⋯ menu on scheduled email cards: edit modal + refetch after mutations. */
  scheduledEmailActions?: {
    onEdit: (row: CurrentJobEmailRow) => void;
    onMutated: () => void | Promise<void>;
  };
};

export function CommunicationsJobEmailSection({
  defaultSectionOpen,
  jobTitle,
  jobId,
  jobCode,
  titleSuffix,
  showNewEmailButton,
  emails,
  preGlobalEmailCount,
  onClearGlobalFilters,
  loading = false,
  loadError = null,
  onRetry,
  missingJobMessage = null,
  emptyFilterMessage = "No messages match this filter for this job.",
  emptyTimelineMessage = "No communications yet. Send the first message.",
  onSelectEmail,
  onInvalidateDetail,
  onNewEmail,
  newEmailDisabled = false,
  newEmailDisabledTitle,
  onSendSms,
  onSendWhatsApp,
  onScheduleMeeting,
  smsDisabled = false,
  whatsappDisabled = false,
  scheduleMeetingDisabled = false,
  smsDisabledTitle,
  whatsappDisabledTitle,
  scheduleMeetingDisabledTitle,
  candidateName = "",
  onFollowUp,
  onReply,
  timelineGroupOrder = "newest",
  scheduledEmailActions,
}: CommunicationsJobEmailSectionProps) {
  const sourceEmailCount =
    preGlobalEmailCount !== undefined ? preGlobalEmailCount : emails.length;
  const isGlobalFilterEmpty = sourceEmailCount > 0 && emails.length === 0;

  const [sectionOpen, setSectionOpen] = useState(defaultSectionOpen);
  const [emailFilter, setEmailFilter] = useState<EmailTypeFilter>("all");
  const [expandedList, setExpandedList] = useState(false);
  const [expandedThreadIds, setExpandedThreadIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const splitCommActionsRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => (emails.length ? filterEmails(emails, emailFilter) : []),
    [emails, emailFilter],
  );

  const emailListKey = useMemo(
    () => emails.map((e) => e.id).join("\u001f"),
    [emails],
  );

  useEffect(() => {
    setExpandedList(false);
    setExpandedThreadIds(new Set());
  }, [emailFilter, emailListKey]);

  useEffect(() => {
    onInvalidateDetail?.();
  }, [emailFilter, emailListKey, onInvalidateDetail]);

  useEffect(() => {
    if (!moreMenuOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const el = splitCommActionsRef.current;
      if (el && !el.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreMenuOpen]);

  const threadGroups = useMemo(
    () => buildTimelineThreadGroups(filtered, timelineGroupOrder),
    [filtered, timelineGroupOrder],
  );

  const visibleGroups = useMemo(() => {
    if (!expandedList) return threadGroups.slice(0, INITIAL_VISIBLE);
    return threadGroups;
  }, [threadGroups, expandedList]);

  const showMoreControl = threadGroups.length > INITIAL_VISIBLE && !expandedList;

  const tableScroll = expandedList && threadGroups.length > EXPANDED_CAP;

  const showBody = missingJobMessage == null;

  const showThreadActions = Boolean(jobId.trim() && (onFollowUp || onReply));

  const openDetail = onSelectEmail ?? (() => {});

  const toggleThread = (key: string) => {
    setExpandedThreadIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSection = () => setSectionOpen((o) => !o);

  return (
    <div className="rounded-sds-8 border border-[#e0e0e0] bg-white shadow-none">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <button
          type="button"
          onClick={toggleSection}
          className="min-w-0 flex-1 text-left"
          aria-expanded={sectionOpen}
        >
          <span className="font-medium text-[#131313]">
            {jobTitle}
            {titleSuffix ? (
              <span className="text-sm font-normal text-[#4d4d4d]">
                {titleSuffix}
              </span>
            ) : null}
            {jobCode ? (
              <span className="ml-2 text-xs font-normal text-[#aaaaaa]">
                {jobCode}
              </span>
            ) : null}
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {showNewEmailButton ? (
            <div ref={splitCommActionsRef} className="relative flex items-center">
              <div
                className="grid w-max max-w-full grid-cols-[auto_auto] overflow-hidden rounded-sds-4 border border-[#131313] shadow-none"
                role="group"
                aria-label="Email actions"
              >
                <button
                  type="button"
                  className={sdsButtonPrimarySplitLeft}
                  disabled={Boolean(newEmailDisabled || !onNewEmail)}
                  title={
                    newEmailDisabled ? (newEmailDisabledTitle ?? "") : "Email"
                  }
                  onClick={() => onNewEmail?.()}
                >
                  <span className="text-body-m font-medium leading-none" aria-hidden>
                    +
                  </span>
                  <span>Email</span>
                </button>
                <button
                  type="button"
                  id="comm-actions-more-trigger"
                  className={sdsButtonPrimarySplitRight}
                  aria-expanded={moreMenuOpen}
                  aria-haspopup="menu"
                  aria-controls="comm-actions-more-menu"
                  aria-label="More communication actions"
                  onClick={() => setMoreMenuOpen((o) => !o)}
                >
                  <IconMoreVertical className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
              {moreMenuOpen ? (
                <div
                  id="comm-actions-more-menu"
                  role="menu"
                  aria-labelledby="comm-actions-more-trigger"
                  className="absolute right-0 top-full z-[60] mt-1 min-w-[12rem] rounded-sds-8 border border-[#e0e0e0]/60 bg-white py-1 shadow-[var(--elevation-2)]"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className={`${sdsMenuItemBtn} font-medium`}
                    disabled={Boolean(smsDisabled || !onSendSms)}
                    title={smsDisabled ? smsDisabledTitle : undefined}
                    onClick={() => {
                      setMoreMenuOpen(false);
                      if (!smsDisabled && onSendSms) onSendSms();
                    }}
                  >
                    SMS
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={`${sdsMenuItemBtn} font-medium`}
                    disabled={Boolean(whatsappDisabled || !onSendWhatsApp)}
                    title={whatsappDisabled ? whatsappDisabledTitle : undefined}
                    onClick={() => {
                      setMoreMenuOpen(false);
                      if (!whatsappDisabled && onSendWhatsApp) {
                        onSendWhatsApp();
                      }
                    }}
                  >
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={`${sdsMenuItemBtn} font-medium`}
                    disabled={Boolean(
                      scheduleMeetingDisabled || !onScheduleMeeting,
                    )}
                    title={
                      scheduleMeetingDisabled
                        ? scheduleMeetingDisabledTitle
                        : undefined
                    }
                    onClick={() => {
                      setMoreMenuOpen(false);
                      if (!scheduleMeetingDisabled && onScheduleMeeting) {
                        onScheduleMeeting();
                      }
                    }}
                  >
                    1:1 Meeting
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          <button
            type="button"
            onClick={toggleSection}
            className={sdsButtonIconTertiaryMini}
            aria-label={sectionOpen ? "Collapse job section" : "Expand job section"}
          >
            <ChevronDownIcon
              className={`h-4 w-4 text-[#aaaaaa] transition-transform duration-200 ${
                sectionOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {sectionOpen ? (
        <div className="px-5 pb-5">
          <div className="mb-5 flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((opt) => {
              const active = emailFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setEmailFilter(opt.id)}
                  className={
                    active ? sdsPillMdSelected : sdsPillMdUnselected
                  }
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div
              className="flex items-center gap-2 py-6 text-sm text-[#4d4d4d]"
              role="status"
            >
              <LoadingSpinner size="sm" aria-hidden />
              <span>Loading communications…</span>
            </div>
          ) : loadError ? (
            <div className="space-y-2">
              <p className="text-sm text-[#d32f2f]">{loadError}</p>
              {onRetry ? (
                <button
                  type="button"
                  onClick={() => onRetry()}
                  className={sdsButtonSecondarySm}
                >
                  Retry
                </button>
              ) : null}
            </div>
          ) : missingJobMessage ? (
            <p className="text-sm text-[#4d4d4d]">{missingJobMessage}</p>
          ) : showBody && sourceEmailCount === 0 ? (
            <p className="text-sm text-[#4d4d4d]">{emptyTimelineMessage}</p>
          ) : showBody && isGlobalFilterEmpty ? (
            <div
              className="flex flex-col items-center justify-center gap-3 py-10 text-center"
              role="status"
            >
              <span className="text-[#aaaaaa]" aria-hidden>
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="mx-auto"
                >
                  <path
                    d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8 9h8M8 13h5"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <p className="max-w-sm text-sm text-[#4d4d4d]">
                No messages match your filters
              </p>
              {onClearGlobalFilters ? (
                <button
                  type="button"
                  onClick={() => onClearGlobalFilters()}
                  className={sdsButtonLink}
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          ) : showBody && filtered.length === 0 ? (
            <p className="text-sm text-[#4d4d4d]">{emptyFilterMessage}</p>
          ) : showBody ? (
            <>
              <div
                className={
                  tableScroll ? "scrollbar-sleek overflow-y-auto rounded-sds-8" : ""
                }
                style={tableScroll ? { maxHeight: SCROLL_MAX_HEIGHT_PX } : undefined}
              >
                <div className="relative pl-9">
                  <div className="absolute bottom-0 left-[13px] top-0 w-px bg-[#e0e0e0]/60" />

                  {visibleGroups.map((group) => {
                    const rows = group.rows;
                    const latest = rows[rows.length - 1];
                    const isThread = rows.length > 1;
                    const expanded = expandedThreadIds.has(group.key);
                    const ch = latest.channel ?? "email";
                    const { subjectPart } = buildTimelineMessagePreview(latest);
                    const bodyOneLine = stripHtml(latest.body)
                      .replace(/\s+/g, " ")
                      .trim();
                    const nameForThread = threadParentDisplayName(
                      rows,
                      candidateName,
                    );
                    const displayName = isThread ? nameForThread : latest.senderLabel;
                    const threadActions = getContactThreadActions(rows);
                    const canThreadAct =
                      showThreadActions &&
                      threadActions.eligible &&
                      latest.channel === "email";
                    const dot = timelineDotClasses(ch);

                    const showTimelineDeliveryGlyph =
                      (latest.channel === "email" ||
                        latest.channel === "sms" ||
                        latest.channel === "whatsapp") &&
                      !(
                        latest.channel === "email" &&
                        latest.deliveryStatus === "scheduled"
                      );

                    if (ch === "system") {
                      const systemText =
                        stripHtml(latest.body).replace(/\s+/g, " ").trim() ||
                        "—";
                      return (
                        <div key={group.key} className="relative mb-5">
                          <div
                            className="absolute -left-9 top-0.5 z-[1] flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-[#f5f5f5] bg-[#f5f5f5]"
                            aria-hidden
                          >
                            <ChannelTimelineIcon
                              channel="system"
                              className="h-3 w-3 text-[#aaaaaa]"
                            />
                          </div>
                          <button
                            type="button"
                            className="w-full py-1.5 text-left"
                            onClick={() => openDetail(latest)}
                          >
                            <span className="text-xs italic text-[#aaaaaa]">
                              {systemText}
                            </span>
                            <span className="ml-2 text-[11px] text-[#aaaaaa]">
                              {formatTimelineTime(latest.sentAt)}
                            </span>
                          </button>
                        </div>
                      );
                    }

                    const meetingSubject =
                      latest.subject?.trim() || "1:1 Meeting";
                    const meetingFooter = formatMeetingTimelineFooter(
                      latest,
                      candidateName,
                    );

                    const showHoverSmsWaReply =
                      (latest.channel === "sms" ||
                        latest.channel === "whatsapp") &&
                      latest.direction === "inbound";
                    const showEmailHoverActions =
                      latest.channel === "email" &&
                      !isThread &&
                      canThreadAct &&
                      (threadActions.reply || threadActions.followUp);

                    const timelineCircle = (
                      <div
                        className={`absolute -left-9 top-0.5 z-[1] flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-[#f5f5f5] ${dot.circle}`}
                        aria-hidden
                      >
                        <ChannelTimelineIcon
                          channel={ch}
                          filterBucket={latest.filterBucket}
                          className={`h-3 w-3 ${dot.icon}`}
                        />
                      </div>
                    );

                    const headerLine1 = (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-[#131313]">
                            {displayName}
                          </span>
                          <ChannelTypeBadge
                            channel={ch}
                            filterBucket={latest.filterBucket}
                            senderType={latest.senderType}
                          />
                          {latest.direction === "inbound" &&
                          latest.channel !== "meeting" ? (
                            <InboundBadge />
                          ) : null}
                          {isThread ? (
                            <span className="rounded-full bg-[#f5f5f5] px-2 py-0.5 text-[11px] font-medium text-[#4d4d4d]">
                              {rows.length} messages
                            </span>
                          ) : null}
                          {latest.channel === "email" &&
                          latest.deliveryStatus === "scheduled" ? (
                            <span className="rounded-full bg-[#EDE9FE] px-2 py-0.5 text-[11px] font-medium text-[#5B21B6]">
                              Scheduled
                            </span>
                          ) : null}
                          {latest.channel === "email" &&
                          latest.deliveryStatus === "cancelled" ? (
                            <span className="rounded-full bg-[#FFEBEE] px-2 py-0.5 text-[11px] font-medium text-[#d32f2f]">
                              Cancelled
                            </span>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {showEmailHoverActions ? (
                            <div className="mr-2 hidden items-center gap-1 group-hover:flex">
                              {threadActions.reply ? (
                                <button
                                  type="button"
                                  className={sdsButtonIconTertiaryMini}
                                  title="Reply"
                                  aria-label="Reply"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onReply?.([latest]);
                                  }}
                                >
                                  <IconReply className="h-3.5 w-3.5 text-[#aaaaaa]" />
                                </button>
                              ) : null}
                              {threadActions.followUp ? (
                                <button
                                  type="button"
                                  className={sdsButtonIconTertiaryMini}
                                  title="Follow up"
                                  aria-label="Follow up"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onFollowUp?.([latest]);
                                  }}
                                >
                                  <IconFollowUp className="h-3.5 w-3.5 text-[#aaaaaa]" />
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                          {showHoverSmsWaReply ? (
                            <div className="mr-2 hidden items-center gap-1 group-hover:flex">
                              <button
                                type="button"
                                className={sdsButtonIconTertiaryMini}
                                title="Reply"
                                aria-label="Reply"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (latest.channel === "whatsapp") {
                                    if (!whatsappDisabled && onSendWhatsApp) {
                                      onSendWhatsApp();
                                      return;
                                    }
                                  } else if (latest.channel === "sms") {
                                    if (!smsDisabled && onSendSms) {
                                      onSendSms();
                                      return;
                                    }
                                  }
                                  openDetail(latest);
                                }}
                              >
                                <IconReply className="h-3.5 w-3.5 text-[#aaaaaa]" />
                              </button>
                            </div>
                          ) : null}
                          {latest.channel === "email" &&
                          latest.deliveryStatus === "scheduled" &&
                          scheduledEmailActions ? (
                            <ScheduledEmailTimelineMenu
                              row={latest}
                              onEdit={() =>
                                scheduledEmailActions.onEdit(latest)
                              }
                              onMutated={scheduledEmailActions.onMutated}
                            />
                          ) : null}
                          {showTimelineDeliveryGlyph ? (
                            <DeliveryStatusGlyph
                              status={latest.deliveryStatus}
                              scheduledForIso={latest.scheduledFor}
                              size="sm"
                            />
                          ) : null}
                          {latest.channel === "email" &&
                          latest.deliveryStatus === "scheduled" &&
                          latest.scheduledFor ? (
                            <ScheduledSendTimestamp
                              variant="scheduled"
                              scheduledForIso={latest.scheduledFor}
                            />
                          ) : latest.channel === "email" &&
                            latest.deliveryStatus === "cancelled" &&
                            latest.scheduledFor ? (
                            <ScheduledSendTimestamp
                              variant="cancelled"
                              scheduledForIso={latest.scheduledFor}
                            />
                          ) : (
                            <span className="text-xs text-[#aaaaaa]">
                              {formatTimelineTime(latest.sentAt)}
                            </span>
                          )}
                          {isThread ? (
                            <ChevronDownIcon
                              className={`h-3.5 w-3.5 shrink-0 text-[#aaaaaa] transition-transform duration-200 ${
                                expanded ? "rotate-180" : ""
                              }`}
                            />
                          ) : null}
                        </div>
                      </div>
                    );

                    const contentBlock =
                      latest.channel === "email" ? (
                        <>
                          <p className="mt-1.5 truncate text-sm font-medium text-[#131313]">
                            {subjectPart}
                          </p>
                          <p className="truncate text-sm text-[#4d4d4d]">
                            {bodyOneLine || "—"}
                          </p>
                        </>
                      ) : latest.channel === "meeting" ? (
                        <>
                          <p className="mt-1.5 truncate text-sm font-medium text-[#131313]">
                            {meetingSubject}
                          </p>
                          <p className="truncate text-xs text-[#aaaaaa]">
                            {meetingFooter}
                          </p>
                        </>
                      ) : (
                        <p className="mt-1.5 truncate text-sm text-[#4d4d4d]">
                          {bodyOneLine || "—"}
                        </p>
                      );

                    if (isThread && latest.channel === "email") {
                      return (
                        <Fragment key={group.key}>
                          <div className="relative mb-5">
                            {timelineCircle}
                            {!expanded ? (
                              <>
                                <div className="relative pb-1.5">
                                  <div
                                    className="pointer-events-none absolute bottom-0 left-1 right-1 top-[6px] rounded-sds-8 border border-[#e0e0e0]/60 bg-white opacity-50"
                                    aria-hidden
                                  />
                                  <div
                                    className="pointer-events-none absolute bottom-0 left-0.5 right-0.5 top-[3px] rounded-sds-8 border border-[#e0e0e0]/60 bg-white opacity-75"
                                    aria-hidden
                                  />
                                  <button
                                    type="button"
                                    className="group relative z-[1] w-full cursor-pointer rounded-sds-8 border border-[#e0e0e0]/60 bg-white px-4 py-3 text-left transition-colors hover:border-[#e0e0e0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0183FF]"
                                    aria-expanded={expanded}
                                    onClick={() => toggleThread(group.key)}
                                  >
                                    {headerLine1}
                                    <p className="mt-1.5 truncate text-sm font-medium text-[#131313]">
                                      {subjectPart}
                                    </p>
                                    <p className="truncate text-sm text-[#4d4d4d]">
                                      {bodyOneLine || "—"}
                                    </p>
                                  </button>
                                </div>
                                <div className="h-1.5" aria-hidden />
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="w-full cursor-pointer rounded-t-sds-8 border border-b-0 border-[#e0e0e0]/60 bg-white px-4 py-3 text-left transition-colors hover:bg-[#f5f5f5]/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0183FF]"
                                  aria-expanded={expanded}
                                  onClick={() => toggleThread(group.key)}
                                >
                                  {headerLine1}
                                  <p className="mt-1.5 truncate text-sm font-medium text-[#131313]">
                                    {subjectPart}
                                  </p>
                                  <p className="truncate text-sm text-[#4d4d4d]">
                                    {bodyOneLine || "—"}
                                  </p>
                                </button>
                                <div
                                  className={`border-x border-[#e0e0e0]/60 bg-white ${
                                    !canThreadAct ||
                                    (!threadActions.reply && !threadActions.followUp)
                                      ? "rounded-b-sds-8 border-b border-[#e0e0e0]/60"
                                      : ""
                                  }`}
                                >
                                  {rows.map((row) => {
                                    const prev = buildTimelineMessagePreview(row);
                                    const childBody = stripHtml(row.body)
                                      .replace(/\s+/g, " ")
                                      .trim();
                                    return (
                                      <div
                                        key={`${group.key}-${row.id}`}
                                        role="button"
                                        tabIndex={0}
                                        className="cursor-pointer border-t border-[#e0e0e0]/60 bg-[#f5f5f5] px-4 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0183FF]"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openDetail(row);
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            openDetail(row);
                                          }
                                        }}
                                      >
                                        <div className="mb-1 flex items-center justify-between">
                                          <div className="flex items-center gap-1.5">
                                            <div
                                              className="h-[5px] w-[5px] shrink-0 rounded-full bg-blue-300"
                                              aria-hidden
                                            />
                                            <span className="text-xs text-[#4d4d4d]">
                                              {formatSenderTypeLabel(
                                                row.senderType,
                                              )}
                                            </span>
                                            <span className="text-[11px] text-[#aaaaaa]">
                                              ·
                                            </span>
                                            <span className="text-[11px] text-[#aaaaaa]">
                                              {row.direction === "inbound"
                                                ? "Inbound"
                                                : "Outbound"}
                                            </span>
                                          </div>
                                          <span className="text-[11px] text-[#aaaaaa]">
                                            {formatTimelineTime(row.sentAt)}
                                          </span>
                                        </div>
                                        <p className="truncate pl-[11px] text-xs font-medium text-[#131313]">
                                          {prev.subjectPart}
                                        </p>
                                        <p className="truncate pl-[11px] text-xs text-[#aaaaaa]">
                                          {childBody || "—"}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                                {canThreadAct &&
                                (threadActions.reply || threadActions.followUp) ? (
                                  <div className="flex gap-3 rounded-b-sds-8 border border-t border-[#e0e0e0]/60 bg-white px-4 py-2">
                                    {threadActions.reply ? (
                                      <button
                                        type="button"
                                        className={`${sdsButtonSecondaryCompact} inline-flex gap-1.5`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onReply?.(rows);
                                        }}
                                      >
                                        <IconReply className="h-3 w-3" />
                                        Reply
                                      </button>
                                    ) : null}
                                    {threadActions.followUp ? (
                                      <button
                                        type="button"
                                        className={`${sdsButtonSecondaryCompact} inline-flex gap-1.5`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onFollowUp?.(rows);
                                        }}
                                      >
                                        <IconFollowUp className="h-3 w-3" />
                                        Follow up
                                      </button>
                                    ) : null}
                                  </div>
                                ) : null}
                              </>
                            )}
                          </div>
                        </Fragment>
                      );
                    }

                    return (
                      <Fragment key={group.key}>
                        <div className="relative mb-5">
                          {timelineCircle}
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => openDetail(latest)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                openDetail(latest);
                              }
                            }}
                            className={`group cursor-pointer rounded-sds-8 border border-[#e0e0e0]/60 bg-white px-4 py-3 text-left transition-colors hover:border-[#e0e0e0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0183FF] ${
                              latest.channel === "meeting" ? "" : ""
                            }`}
                          >
                            {headerLine1}
                            {contentBlock}
                          </div>
                        </div>
                      </Fragment>
                    );
                  })}
                </div>
              </div>

              {showMoreControl ? (
                <div className="mt-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setExpandedList(true)}
                    className={sdsButtonLink}
                  >
                    Show more
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
