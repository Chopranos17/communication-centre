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
  IconFollowUp,
  IconMoreVertical,
  IconReply,
} from "./CommunicationToolbarIcons";
import { ChannelTimelineIcon } from "./ChannelTimelineIcon";
import { ChannelTypeBadge } from "./ChannelTypeBadge";
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
    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
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
    <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <button
          type="button"
          onClick={toggleSection}
          className="min-w-0 flex-1 text-left"
          aria-expanded={sectionOpen}
        >
          <span className="font-medium text-gray-900">
            {jobTitle}
            {titleSuffix ? (
              <span className="text-sm font-normal text-gray-500">
                {titleSuffix}
              </span>
            ) : null}
            {jobCode ? (
              <span className="ml-2 text-xs font-normal text-gray-400">
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
            className="flex h-6 w-6 items-center justify-center"
            aria-label={sectionOpen ? "Collapse job section" : "Expand job section"}
          >
            <ChevronDownIcon
              className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                sectionOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {sectionOpen ? (
        <div className="px-5 pb-5">
          <div className="mb-5 flex flex-wrap gap-1">
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

                    if (ch === "system") {
                      const systemText =
                        stripHtml(latest.body).replace(/\s+/g, " ").trim() ||
                        "—";
                      return (
                        <div key={group.key} className="relative mb-5">
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
                              {systemText}
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
                    const showEmailHoverActions =
                      latest.channel === "email" &&
                      !isThread &&
                      canThreadAct &&
                      (threadActions.reply || threadActions.followUp);

                    const timelineCircle = (
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
                    );

                    const headerLine1 = (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
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
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                              {rows.length} messages
                            </span>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {showEmailHoverActions ? (
                            <div className="mr-2 hidden items-center gap-1 group-hover:flex">
                              {threadActions.reply ? (
                                <button
                                  type="button"
                                  className="flex h-6 w-6 items-center justify-center rounded hover:bg-gray-100"
                                  title="Reply"
                                  aria-label="Reply"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onReply?.([latest]);
                                  }}
                                >
                                  <IconReply className="h-3.5 w-3.5 text-gray-400" />
                                </button>
                              ) : null}
                              {threadActions.followUp ? (
                                <button
                                  type="button"
                                  className="flex h-6 w-6 items-center justify-center rounded hover:bg-gray-100"
                                  title="Follow up"
                                  aria-label="Follow up"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onFollowUp?.([latest]);
                                  }}
                                >
                                  <IconFollowUp className="h-3.5 w-3.5 text-gray-400" />
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                          {showHoverSmsWaReply ? (
                            <div className="mr-2 hidden items-center gap-1 group-hover:flex">
                              <button
                                type="button"
                                className="flex h-6 w-6 items-center justify-center rounded hover:bg-gray-100"
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
                                <IconReply className="h-3.5 w-3.5 text-gray-400" />
                              </button>
                            </div>
                          ) : null}
                          <span className="text-xs text-gray-400">
                            {formatTimelineTime(latest.sentAt)}
                          </span>
                          {isThread ? (
                            <ChevronDownIcon
                              className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform duration-200 ${
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
                          <p className="mt-1.5 truncate text-sm font-medium text-gray-900">
                            {subjectPart}
                          </p>
                          <p className="truncate text-sm text-gray-500">
                            {bodyOneLine || "—"}
                          </p>
                        </>
                      ) : latest.channel === "meeting" ? (
                        <>
                          <p className="mt-1.5 truncate text-sm font-medium text-gray-900">
                            {meetingSubject}
                          </p>
                          <p className="truncate text-xs text-gray-400">
                            {meetingFooter}
                          </p>
                        </>
                      ) : (
                        <p className="mt-1.5 truncate text-sm text-gray-500">
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
                                    className="pointer-events-none absolute bottom-0 left-1 right-1 top-[6px] rounded-lg border border-gray-200 bg-white opacity-50"
                                    aria-hidden
                                  />
                                  <div
                                    className="pointer-events-none absolute bottom-0 left-0.5 right-0.5 top-[3px] rounded-lg border border-gray-200 bg-white opacity-75"
                                    aria-hidden
                                  />
                                  <button
                                    type="button"
                                    className="group relative z-[1] w-full cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-3 text-left transition-colors hover:border-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
                                    aria-expanded={expanded}
                                    onClick={() => toggleThread(group.key)}
                                  >
                                    {headerLine1}
                                    <p className="mt-1.5 truncate text-sm font-medium text-gray-900">
                                      {subjectPart}
                                    </p>
                                    <p className="truncate text-sm text-gray-500">
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
                                  className="w-full cursor-pointer rounded-t-lg border border-b-0 border-gray-200 bg-white px-4 py-3 text-left transition-colors hover:bg-gray-50/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
                                  aria-expanded={expanded}
                                  onClick={() => toggleThread(group.key)}
                                >
                                  {headerLine1}
                                  <p className="mt-1.5 truncate text-sm font-medium text-gray-900">
                                    {subjectPart}
                                  </p>
                                  <p className="truncate text-sm text-gray-500">
                                    {bodyOneLine || "—"}
                                  </p>
                                </button>
                                <div
                                  className={`border-x border-gray-200 bg-white ${
                                    !canThreadAct ||
                                    (!threadActions.reply && !threadActions.followUp)
                                      ? "rounded-b-lg border-b border-gray-200"
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
                                        className="cursor-pointer border-t border-gray-200 bg-gray-50 px-4 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
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
                                            <span className="text-xs text-gray-600">
                                              {formatSenderTypeLabel(
                                                row.senderType,
                                              )}
                                            </span>
                                            <span className="text-[11px] text-gray-400">
                                              ·
                                            </span>
                                            <span className="text-[11px] text-gray-400">
                                              {row.direction === "inbound"
                                                ? "Inbound"
                                                : "Outbound"}
                                            </span>
                                          </div>
                                          <span className="text-[11px] text-gray-400">
                                            {formatTimelineTime(row.sentAt)}
                                          </span>
                                        </div>
                                        <p className="truncate pl-[11px] text-xs font-medium text-gray-900">
                                          {prev.subjectPart}
                                        </p>
                                        <p className="truncate pl-[11px] text-xs text-gray-400">
                                          {childBody || "—"}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                                {canThreadAct &&
                                (threadActions.reply || threadActions.followUp) ? (
                                  <div className="flex gap-3 rounded-b-lg border border-t border-gray-200 bg-white px-4 py-2">
                                    {threadActions.reply ? (
                                      <button
                                        type="button"
                                        className="flex items-center gap-1.5 rounded border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
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
                                        className="flex items-center gap-1.5 rounded border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
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
                            className={`group cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-3 text-left transition-colors hover:border-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${
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
