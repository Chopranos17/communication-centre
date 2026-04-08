import { Fragment, useMemo, useState, useEffect, useRef } from "react";
import type { CurrentJobEmailRow, TimelineChannel } from "../../api/candidatesClient";
import {
  buildTimelineMessagePreview,
  buildTimelineThreadGroups,
  type TimelineGroupSortOrder,
  formatMeetingTimelineFooter,
  formatTimelineTime,
  getContactThreadActions,
  meetingStatusBadgeLabel,
  stripHtml,
} from "../../utils/communicationTimeline";
import {
  IconFollowUp,
  IconMoreVertical,
  IconReply,
} from "./CommunicationToolbarIcons";
import { ChannelTimelineIcon } from "./ChannelTimelineIcon";
import { ChannelTypeBadge } from "./ChannelTypeBadge";
import { DeliveryStatusGlyph } from "./DeliveryStatusGlyph";
import { LoadingSpinner } from "../ui/LoadingSpinner";

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
    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
      Inbound
    </span>
  );
}

function MailGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
      />
      <path
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M22 6l-10 7L2 6"
      />
    </svg>
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
}: CommunicationsJobEmailSectionProps) {
  const sourceEmailCount =
    preGlobalEmailCount !== undefined ? preGlobalEmailCount : emails.length;
  const isGlobalFilterEmpty = sourceEmailCount > 0 && emails.length === 0;

  const [sectionOpen, setSectionOpen] = useState(defaultSectionOpen);
  const [emailFilter, setEmailFilter] = useState<EmailTypeFilter>("all");
  const [expandedList, setExpandedList] = useState(false);
  const [expandedThreadKeys, setExpandedThreadKeys] = useState<
    Record<string, boolean>
  >({});
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [cardMenuGroupKey, setCardMenuGroupKey] = useState<string | null>(null);
  const splitCommActionsRef = useRef<HTMLDivElement>(null);
  const cardMenuRef = useRef<HTMLDivElement>(null);

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
    setExpandedThreadKeys({});
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

  useEffect(() => {
    if (!cardMenuGroupKey) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const el = cardMenuRef.current;
      if (el && !el.contains(e.target as Node)) {
        setCardMenuGroupKey(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCardMenuGroupKey(null);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [cardMenuGroupKey]);

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
    setExpandedThreadKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleSection = () => setSectionOpen((o) => !o);

  return (
    <div className="rounded-lg border border-gray-200 bg-slate-50 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={toggleSection}
          className="min-w-0 flex-1 text-left"
          aria-expanded={sectionOpen}
        >
          <span className="text-sm font-bold text-gray-900 sm:text-base">
            {jobTitle}
            {titleSuffix ? (
              <span className="font-medium text-gray-600">{titleSuffix}</span>
            ) : null}
            {jobCode ? (
              <span className="ml-2 text-sm font-normal text-gray-500">
                {jobCode}
              </span>
            ) : null}
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {showNewEmailButton ? (
            <div ref={splitCommActionsRef} className="relative flex items-center">
              <div className="inline-flex overflow-hidden rounded-md border border-black bg-black shadow-sm">
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-1 border-r border-white/25 px-3 text-sm font-semibold text-white hover:bg-neutral-900 focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={Boolean(newEmailDisabled || !onNewEmail)}
                  title={
                    newEmailDisabled ? (newEmailDisabledTitle ?? "") : "Email"
                  }
                  onClick={() => onNewEmail?.()}
                >
                  <span className="text-lg font-medium leading-none" aria-hidden>
                    +
                  </span>
                  <span>Email</span>
                </button>
                <button
                  type="button"
                  id="comm-actions-more-trigger"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center text-white hover:bg-neutral-900 focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                  aria-expanded={moreMenuOpen}
                  aria-haspopup="menu"
                  aria-controls="comm-actions-more-menu"
                  aria-label="More communication actions"
                  onClick={() => setMoreMenuOpen((o) => !o)}
                >
                  <IconMoreVertical className="h-4 w-4 text-white" />
                </button>
              </div>
              {moreMenuOpen ? (
                <div
                  id="comm-actions-more-menu"
                  role="menu"
                  aria-labelledby="comm-actions-more-trigger"
                  className="absolute right-0 top-full z-[60] mt-1 min-w-[12rem] rounded-md border border-gray-200 bg-white py-1 shadow-lg"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full px-4 py-2.5 text-left text-sm font-medium text-neutral-900 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
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
                    className="flex w-full px-4 py-2.5 text-left text-sm font-medium text-neutral-900 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
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
                    className="flex w-full px-4 py-2.5 text-left text-sm font-medium text-neutral-900 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100"
            aria-label={sectionOpen ? "Collapse job section" : "Expand job section"}
          >
            <ChevronDownIcon
              className={`h-4 w-4 transition-transform duration-200 ${
                sectionOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {sectionOpen ? (
        <div className="px-4 py-4 sm:px-5">
          <div className="mb-4 flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((opt) => {
              const active = emailFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setEmailFilter(opt.id)}
                  className={[
                    "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                    active
                      ? "border-gray-300 bg-white text-gray-900"
                      : "border-transparent bg-white/70 text-gray-600 hover:bg-white",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div
              className="flex items-center gap-2 py-6 text-sm text-gray-500"
              role="status"
            >
              <LoadingSpinner size="sm" aria-hidden />
              <span>Loading communications…</span>
            </div>
          ) : loadError ? (
            <div className="space-y-2">
              <p className="text-sm text-red-600">{loadError}</p>
              {onRetry ? (
                <button
                  type="button"
                  onClick={() => onRetry()}
                  className="rounded border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-50"
                >
                  Retry
                </button>
              ) : null}
            </div>
          ) : missingJobMessage ? (
            <p className="text-sm text-gray-500">{missingJobMessage}</p>
          ) : showBody && sourceEmailCount === 0 ? (
            <p className="text-sm text-gray-500">{emptyTimelineMessage}</p>
          ) : showBody && isGlobalFilterEmpty ? (
            <div
              className="flex flex-col items-center justify-center gap-3 py-10 text-center"
              role="status"
            >
              <span className="text-gray-400" aria-hidden>
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
              <p className="max-w-sm text-sm text-gray-700">
                No messages match your filters
              </p>
              {onClearGlobalFilters ? (
                <button
                  type="button"
                  onClick={() => onClearGlobalFilters()}
                  className="text-sm font-medium text-blue-600 underline hover:text-blue-700"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          ) : showBody && filtered.length === 0 ? (
            <p className="text-sm text-gray-500">{emptyFilterMessage}</p>
          ) : showBody ? (
            <>
              <div
                className={tableScroll ? "overflow-y-auto rounded-lg" : ""}
                style={tableScroll ? { maxHeight: SCROLL_MAX_HEIGHT_PX } : undefined}
              >
                <div className="relative pl-9">
                  <div className="absolute bottom-0 left-[13px] top-0 w-px bg-gray-200" />

                  {visibleGroups.map((group) => {
                    const rows = group.rows;
                    const latest = rows[rows.length - 1];
                    const isThread = rows.length > 1;
                    const expanded = Boolean(expandedThreadKeys[group.key]);
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

                    if (ch === "system") {
                      const systemText =
                        stripHtml(latest.body).replace(/\s+/g, " ").trim() ||
                        "—";
                      return (
                        <div key={group.key} className="relative mb-6">
                          <div
                            className="absolute -left-9 top-0.5 z-[1] flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-gray-50 bg-gray-100"
                            aria-hidden
                          >
                            <ChannelTimelineIcon
                              channel="system"
                              className="h-3 w-3 text-gray-400"
                            />
                          </div>
                          <button
                            type="button"
                            className="w-full py-1.5 text-left"
                            onClick={() => openDetail(latest)}
                          >
                            <span className="text-xs italic text-gray-400">
                              System · {systemText}
                            </span>
                            <span className="ml-2 text-[11px] text-gray-400">
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
                    const showEmailCardMenu = latest.channel === "email";

                    return (
                      <Fragment key={group.key}>
                        <div className="relative mb-6">
                          <div
                            className={`absolute -left-9 top-0.5 z-[1] flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-gray-50 ${dot.circle}`}
                            aria-hidden
                          >
                            <ChannelTimelineIcon
                              channel={ch}
                              filterBucket={latest.filterBucket}
                              className={`h-3 w-3 ${dot.icon}`}
                            />
                          </div>

                          <div
                            role="button"
                            tabIndex={0}
                            aria-expanded={isThread ? expanded : undefined}
                            onClick={() => {
                              if (isThread) toggleThread(group.key);
                              else openDetail(latest);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                if (isThread) toggleThread(group.key);
                                else openDetail(latest);
                              }
                            }}
                            className="group relative cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-3 text-left transition-colors hover:border-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
                          >
                            <div className="flex items-baseline justify-between gap-2 pr-14">
                              <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-1.5">
                                <span className="text-sm font-medium text-gray-900">
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
                                  <span className="text-xs text-gray-400">
                                    {rows.length} messages in thread
                                  </span>
                                ) : null}
                              </div>
                              <div className="flex shrink-0 items-center gap-1.5">
                                <span className="text-xs text-gray-400">
                                  {formatTimelineTime(latest.sentAt)}
                                </span>
                                <DeliveryStatusGlyph
                                  status={latest.deliveryStatus}
                                  size="sm"
                                />
                                {isThread ? (
                                  <ChevronDownIcon
                                    className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${
                                      expanded ? "rotate-180" : ""
                                    }`}
                                  />
                                ) : null}
                              </div>
                            </div>

                            {latest.channel === "email" ? (
                              <p className="mt-1 truncate text-sm font-medium text-gray-900">
                                {subjectPart}
                              </p>
                            ) : null}
                            {latest.channel === "meeting" ? (
                              <div className="mt-1 flex min-w-0 items-start gap-2">
                                <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                                  {meetingSubject}
                                </span>
                                {latest.meeting ? (
                                  <span
                                    className="shrink-0 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-purple-800"
                                    title="Meeting status"
                                  >
                                    {meetingStatusBadgeLabel(
                                      latest.meeting.status,
                                    )}
                                  </span>
                                ) : null}
                              </div>
                            ) : null}

                            <p className="mt-0.5 truncate text-sm text-gray-500">
                              {latest.channel === "meeting"
                                ? meetingFooter
                                : bodyOneLine || "—"}
                            </p>

                            {/* Last in DOM so hit-testing stacks above the header row; avoid fake Reply/FU that only opened detail. */}
                            <div
                              className={`pointer-events-none absolute right-2 top-2 z-20 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 ${
                                latest.channel === "meeting" ? "hidden" : ""
                              }`}
                            >
                              {canThreadAct && threadActions.followUp ? (
                                <button
                                  type="button"
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
                                  title="Follow up"
                                  aria-label="Follow up on this thread"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onFollowUp?.(rows);
                                  }}
                                >
                                  <IconFollowUp className="h-4 w-4" />
                                </button>
                              ) : null}
                              {canThreadAct && threadActions.reply ? (
                                <button
                                  type="button"
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
                                  title="Reply"
                                  aria-label="Reply in thread"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onReply?.(rows);
                                  }}
                                >
                                  <IconReply className="h-4 w-4" />
                                </button>
                              ) : null}
                              {showEmailCardMenu ? (
                                <div
                                  className="relative"
                                  ref={
                                    cardMenuGroupKey === group.key
                                      ? cardMenuRef
                                      : undefined
                                  }
                                >
                                  <button
                                    type="button"
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
                                    title="More"
                                    aria-label="More actions"
                                    aria-expanded={
                                      cardMenuGroupKey === group.key
                                    }
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCardMenuGroupKey((k) =>
                                        k === group.key ? null : group.key,
                                      );
                                    }}
                                  >
                                    <IconMoreVertical className="h-4 w-4" />
                                  </button>
                                  {cardMenuGroupKey === group.key ? (
                                    <div
                                      className="absolute right-0 top-full z-[50] mt-1 min-w-[10rem] rounded-md border border-gray-200 bg-white py-1 shadow-lg"
                                      role="menu"
                                    >
                                      <button
                                        type="button"
                                        role="menuitem"
                                        className="flex w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setCardMenuGroupKey(null);
                                          openDetail(latest);
                                        }}
                                      >
                                        View details
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                              {showHoverSmsWaReply ? (
                                <button
                                  type="button"
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
                                  title="Reply"
                                  aria-label="Reply"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDetail(latest);
                                  }}
                                >
                                  <IconReply className="h-4 w-4" />
                                </button>
                              ) : null}
                            </div>
                          </div>

                          {isThread && expanded ? (
                            <div className="mb-6 ml-5 mt-1.5 space-y-2.5 border-l border-gray-200 pl-5">
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
                                    className="cursor-pointer rounded-lg bg-gray-50 px-3.5 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
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
                                    <div className="mb-0.5 flex items-baseline justify-between gap-2">
                                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                        <MailGlyph className="h-2.5 w-2.5 shrink-0 text-gray-400" />
                                        <span className="text-xs text-gray-600">
                                          {row.senderLabel}
                                        </span>
                                        {row.direction === "inbound" ? (
                                          <InboundBadge />
                                        ) : null}
                                      </div>
                                      <div className="flex shrink-0 items-center gap-1.5">
                                        <span className="text-[11px] text-gray-400">
                                          {formatTimelineTime(row.sentAt)}
                                        </span>
                                        <DeliveryStatusGlyph
                                          status={row.deliveryStatus}
                                          size="sm"
                                        />
                                      </div>
                                    </div>
                                    <p className="mb-0.5 truncate text-xs font-medium text-gray-900">
                                      {prev.subjectPart}
                                    </p>
                                    <p className="truncate text-xs text-gray-400">
                                      {childBody || "—"}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
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
                    className="text-sm font-medium text-blue-600 hover:underline"
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
