import { Fragment, useMemo, useState, useEffect } from "react";
import type { CurrentJobEmailRow } from "../../api/candidatesClient";
import {
  buildTimelineMessagePreview,
  buildTimelineThreadGroups,
  formatTimelineTime,
  getContactThreadActions,
  threadSenderColumnLabel,
} from "../../utils/communicationTimeline";
import {
  IconFollowUp,
  IconNewEmail,
  IconReply,
  IconSms,
  IconWhatsApp,
} from "./CommunicationToolbarIcons";
import { ChannelTimelineIcon } from "./ChannelTimelineIcon";
import { DeliveryStatusGlyph } from "./DeliveryStatusGlyph";
export type EmailTypeFilter = "all" | "system" | "user";

const FILTER_OPTIONS: { id: EmailTypeFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "system", label: "System Initiated" },
  { id: "user", label: "User Initiated" },
];

const INITIAL_VISIBLE = 6;
const EXPANDED_CAP = 10;
/** ~10 table body rows at ~56px (design system table pattern). */
const SCROLL_MAX_HEIGHT_PX = 560;

function filterEmails(
  rows: CurrentJobEmailRow[],
  f: EmailTypeFilter,
): CurrentJobEmailRow[] {
  if (f === "all") return rows;
  if (f === "system") return rows.filter((r) => r.filterBucket === "system");
  return rows.filter((r) => r.filterBucket === "user");
}

type CommunicationsJobEmailSectionProps = {
  /** Collapsible panel open by default (Current Job = true, Other Jobs = false). */
  defaultSectionOpen: boolean;
  /** Job title in header */
  jobTitle: string;
  /** Required for Task 13 follow-up / reply compose. */
  jobId: string;
  jobCode?: string | null;
  /** e.g. " (Current Job)" — omit for other jobs */
  titleSuffix?: string | null;
  showNewEmailButton: boolean;
  emails: CurrentJobEmailRow[];
  loading?: boolean;
  loadError?: string | null;
  onRetry?: () => void;
  /** When current job is missing (current section only) */
  missingJobMessage?: string | null;
  /** When the filter excludes all rows (optional copy for Current vs Other job) */
  emptyFilterMessage?: string;
  /** Opens email detail panel (single modal owned by parent). */
  onSelectEmail?: (row: CurrentJobEmailRow) => void;
  /** Clear open detail when filter or list identity changes. */
  onInvalidateDetail?: () => void;
  /** Opens compose email panel (Current Job section). */
  onNewEmail?: () => void;
  /** Disables "+ New Email" (e.g. no current job or no candidate email). */
  newEmailDisabled?: boolean;
  newEmailDisabledTitle?: string;
  /** Optional — same actions as Candidate header ⋮ menu (Current Job section only). */
  onSendSms?: () => void;
  onSendWhatsApp?: () => void;
  smsDisabled?: boolean;
  whatsappDisabled?: boolean;
  smsDisabledTitle?: string;
  whatsappDisabledTitle?: string;
  /** Used for "{Candidate Name} (N)" on threads with a candidate reply (PRD §4.5). */
  candidateName?: string;
  /** Task 13: contact@ threads without candidate reply. */
  onFollowUp?: (threadRows: CurrentJobEmailRow[]) => void;
  /** Task 13: contact@ threads with candidate reply. */
  onReply?: (threadRows: CurrentJobEmailRow[]) => void;
};

export function CommunicationsJobEmailSection({
  defaultSectionOpen,
  jobTitle,
  jobId,
  jobCode,
  titleSuffix,
  showNewEmailButton,
  emails,
  loading = false,
  loadError = null,
  onRetry,
  missingJobMessage = null,
  emptyFilterMessage = "No messages match this filter for this job.",
  onSelectEmail,
  onInvalidateDetail,
  onNewEmail,
  newEmailDisabled = false,
  newEmailDisabledTitle,
  onSendSms,
  onSendWhatsApp,
  smsDisabled = false,
  whatsappDisabled = false,
  smsDisabledTitle,
  whatsappDisabledTitle,
  candidateName = "",
  onFollowUp,
  onReply,
}: CommunicationsJobEmailSectionProps) {
  const [sectionOpen, setSectionOpen] = useState(defaultSectionOpen);
  const [emailFilter, setEmailFilter] = useState<EmailTypeFilter>("all");
  const [expandedList, setExpandedList] = useState(false);
  const [expandedThreadKeys, setExpandedThreadKeys] = useState<
    Record<string, boolean>
  >({});

  const filtered = useMemo(
    () => (emails.length ? filterEmails(emails, emailFilter) : []),
    [emails, emailFilter],
  );

  /** Stable identity for list contents — avoid clearing the detail modal when `emails` is a new [] each render. */
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

  const threadGroups = useMemo(
    () => buildTimelineThreadGroups(filtered),
    [filtered],
  );

  const visibleGroups = useMemo(() => {
    if (!expandedList) return threadGroups.slice(0, INITIAL_VISIBLE);
    return threadGroups;
  }, [threadGroups, expandedList]);

  const showMoreControl = threadGroups.length > INITIAL_VISIBLE && !expandedList;

  const tableScroll = expandedList && threadGroups.length > EXPANDED_CAP;

  const showBody = missingJobMessage == null;

  const showThreadActions = Boolean(
    jobId.trim() && (onFollowUp || onReply),
  );

  const openDetail = onSelectEmail ?? (() => {});

  const toggleThread = (key: string) => {
    setExpandedThreadKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-[var(--elevation-1)]">
      <button
        type="button"
        onClick={() => setSectionOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-3 text-left sm:px-5"
        aria-expanded={sectionOpen}
      >
        <span
          className="text-[length:var(--title-xxs)] font-bold text-[var(--text-title)]"
          style={{ fontWeight: "var(--font-weight-bold)" }}
        >
          {jobTitle}
          {titleSuffix ? (
            <span className="font-medium text-[var(--text-label)]">{titleSuffix}</span>
          ) : null}
          {jobCode ? (
            <span className="ml-2 text-[length:var(--body-s)] font-normal text-[var(--text-label)]">
              {jobCode}
            </span>
          ) : null}
        </span>
        <span className="text-[var(--text-label)]" aria-hidden>
          {sectionOpen ? "▼" : "▶"}
        </span>
      </button>

      {sectionOpen ? (
        <div className="bg-[var(--charcoal-10)] px-4 py-4 sm:px-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[length:var(--body-m)] font-medium text-[var(--text-label)]">
                Email Type:
              </span>
              <div className="flex flex-wrap gap-2">
                {FILTER_OPTIONS.map((opt) => {
                  const active = emailFilter === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setEmailFilter(opt.id)}
                      className={[
                        "rounded-full border px-3 py-1 text-[length:var(--body-s)] font-medium transition-colors",
                        active
                          ? "border-[var(--blue-500)] bg-[var(--blue-50)] text-[var(--blue-600)]"
                          : "border-[var(--charcoal-100)] bg-[var(--bg-surface)] text-[var(--text-body)] hover:bg-[var(--charcoal-10)]",
                      ].join(" ")}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {showNewEmailButton ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => onNewEmail?.()}
                  disabled={newEmailDisabled || !onNewEmail}
                  title={
                    newEmailDisabled
                      ? (newEmailDisabledTitle ?? "")
                      : "Compose new email"
                  }
                  aria-label={
                    newEmailDisabled
                      ? (newEmailDisabledTitle ?? "Compose new email unavailable")
                      : "Compose new email"
                  }
                  className={[
                    "inline-flex h-8 w-8 items-center justify-center rounded border border-[var(--charcoal-100)] text-[var(--charcoal-700)]",
                    newEmailDisabled || !onNewEmail
                      ? "cursor-not-allowed bg-[var(--yellow-500)] opacity-60"
                      : "bg-[var(--yellow-500)] hover:opacity-95",
                  ].join(" ")}
                >
                  <IconNewEmail />
                </button>
                {onSendSms ? (
                  <button
                    type="button"
                    onClick={() => onSendSms()}
                    disabled={smsDisabled}
                    title={smsDisabled ? smsDisabledTitle : "Send SMS to candidate"}
                    aria-label={
                      smsDisabled
                        ? (smsDisabledTitle ?? "Send SMS unavailable")
                        : "Send SMS to candidate"
                    }
                    className={[
                      "inline-flex h-8 w-8 items-center justify-center rounded border",
                      smsDisabled
                        ? "cursor-not-allowed border-[var(--charcoal-100)] bg-[var(--bg-surface)] text-[var(--text-label)] opacity-50"
                        : "border-[var(--charcoal-200)] bg-[var(--bg-surface)] text-[var(--text-body)] hover:bg-[var(--charcoal-10)]",
                    ].join(" ")}
                  >
                    <IconSms />
                  </button>
                ) : null}
                {onSendWhatsApp ? (
                  <button
                    type="button"
                    onClick={() => onSendWhatsApp()}
                    disabled={whatsappDisabled}
                    title={
                      whatsappDisabled
                        ? whatsappDisabledTitle
                        : "Send WhatsApp to candidate"
                    }
                    aria-label={
                      whatsappDisabled
                        ? (whatsappDisabledTitle ?? "Send WhatsApp unavailable")
                        : "Send WhatsApp to candidate"
                    }
                    className={[
                      "inline-flex h-8 w-8 items-center justify-center rounded border",
                      whatsappDisabled
                        ? "cursor-not-allowed border-[var(--charcoal-100)] bg-[var(--bg-surface)] text-[var(--text-label)] opacity-50"
                        : "border-[var(--green-500)] bg-[var(--bg-surface)] text-[var(--green-500)] hover:bg-[var(--green-50)]",
                    ].join(" ")}
                  >
                    <IconWhatsApp />
                  </button>
                ) : null}
              </div>
            ) : (
              <span className="hidden sm:block sm:min-w-[7rem]" aria-hidden />
            )}
          </div>

          {loading ? (
            <p className="text-[length:var(--body-m)] text-[var(--text-label)]" role="status">
              Loading communications…
            </p>
          ) : loadError ? (
            <div className="space-y-2">
              <p className="text-[length:var(--body-m)] text-[var(--text-error)]">{loadError}</p>
              {onRetry ? (
                <button
                  type="button"
                  onClick={() => onRetry()}
                  className="rounded border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1.5 text-[length:var(--body-m)] text-[var(--text-body)] hover:bg-[var(--bg-surface-hover)]"
                >
                  Retry
                </button>
              ) : null}
            </div>
          ) : missingJobMessage ? (
            <p className="text-[length:var(--body-m)] text-[var(--text-label)]">
              {missingJobMessage}
            </p>
          ) : showBody && filtered.length === 0 ? (
            <p className="text-[length:var(--body-m)] text-[var(--text-label)]">
              {emptyFilterMessage}
            </p>
          ) : showBody ? (
            <>
              <div
                className={tableScroll ? "overflow-y-auto rounded-[var(--radius-md)]" : ""}
                style={tableScroll ? { maxHeight: SCROLL_MAX_HEIGHT_PX } : undefined}
              >
                <table className="w-full border-collapse text-left text-[length:var(--body-m)]">
                  <thead>
                    <tr className="text-[length:var(--body-m)] font-medium text-[var(--charcoal-400)]">
                      <th className="pb-3 pr-4 font-medium sm:w-[22%]">Sender</th>
                      <th className="pb-3 pr-4 font-medium">Message</th>
                      <th className="pb-3 font-medium sm:w-[18%] sm:text-right">Time</th>
                      {showThreadActions ? (
                        <th className="pb-3 w-11 text-right font-medium sm:w-12">
                          <span className="sr-only">Actions</span>
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleGroups.map((group) => {
                      const rows = group.rows;
                      const latest = rows[rows.length - 1];
                      const isThread = rows.length > 1;
                      const expanded = Boolean(expandedThreadKeys[group.key]);
                      const ch = latest.channel ?? "email";
                      const { subjectPart, bodyPart } =
                        buildTimelineMessagePreview(latest);
                      const nameForThread =
                        candidateName.trim() ||
                        rows.find((r) => r.senderType === "candidate")
                          ?.senderLabel ||
                        "Candidate";
                      const senderCol = isThread
                        ? threadSenderColumnLabel(rows, nameForThread)
                        : latest.senderLabel;

                      const threadActions = getContactThreadActions(rows);
                      const canThreadAct =
                        showThreadActions &&
                        threadActions.eligible &&
                        (latest.channel ?? "email") === "email";

                      return (
                        <Fragment key={group.key}>
                          <tr
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
                            className="group cursor-pointer border-0 transition-colors hover:bg-[var(--charcoal-10)] focus-visible:bg-[var(--bg-surface-selected)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--blue-500)]"
                          >
                            <td className="align-top py-3 pr-4 font-medium text-[var(--text-body)]">
                              <span className="flex items-start gap-2">
                                {isThread ? (
                                  <span
                                    className="mt-0.5 inline-flex w-4 shrink-0 justify-center text-[var(--text-label)]"
                                    aria-hidden
                                  >
                                    {expanded ? "▼" : "▶"}
                                  </span>
                                ) : (
                                  <span className="w-4 shrink-0" aria-hidden />
                                )}
                                <ChannelTimelineIcon
                                  channel={ch}
                                  className="mt-0.5"
                                />
                                <span className="line-clamp-2">{senderCol}</span>
                              </span>
                            </td>
                            <td className="align-top py-3 pr-4 font-light text-[var(--text-body)]">
                              <span className="line-clamp-2 break-words">
                                {subjectPart ? (
                                  <strong className="font-bold">{subjectPart}</strong>
                                ) : null}
                                {bodyPart}
                              </span>
                            </td>
                            <td className="align-top py-3 text-[length:var(--body-s)] font-light text-[var(--text-label)] sm:text-right">
                              <span className="inline-flex flex-col items-end gap-0.5 sm:inline-flex sm:flex-row sm:items-center sm:justify-end sm:gap-1.5">
                                <span>{formatTimelineTime(latest.sentAt)}</span>
                                <DeliveryStatusGlyph
                                  status={latest.deliveryStatus}
                                />
                              </span>
                            </td>
                            {showThreadActions ? (
                              <td
                                className="align-top py-3 text-right"
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                              >
                                <span className="inline-flex justify-end">
                                  {canThreadAct && threadActions.followUp ? (
                                    <button
                                      type="button"
                                      onClick={() => onFollowUp?.(rows)}
                                      title="Follow up"
                                      aria-label="Follow up on this thread"
                                      className="inline-flex h-7 w-7 items-center justify-center rounded border border-[var(--blue-500)] bg-[var(--bg-surface)] text-[var(--blue-600)] hover:bg-[var(--blue-50)]"
                                    >
                                      <IconFollowUp />
                                    </button>
                                  ) : null}
                                  {canThreadAct && threadActions.reply ? (
                                    <button
                                      type="button"
                                      onClick={() => onReply?.(rows)}
                                      title="Reply"
                                      aria-label="Reply in thread"
                                      className="inline-flex h-7 w-7 items-center justify-center rounded border border-[var(--blue-500)] bg-[var(--blue-500)] text-white hover:bg-[var(--blue-600)]"
                                    >
                                      <IconReply />
                                    </button>
                                  ) : null}
                                </span>
                              </td>
                            ) : null}
                          </tr>
                          {isThread && expanded
                            ? rows.map((row) => {
                                const rch = row.channel ?? "email";
                                const prev = buildTimelineMessagePreview(row);
                                return (
                                  <tr
                                    key={`${group.key}-${row.id}`}
                                    role="button"
                                    tabIndex={0}
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
                                    className="cursor-pointer border-0 bg-[var(--charcoal-10)]/80 transition-colors hover:bg-[var(--charcoal-10)] focus-visible:bg-[var(--bg-surface-selected)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--blue-500)]"
                                  >
                                    <td
                                      colSpan={showThreadActions ? 4 : 3}
                                      className="py-2 pl-10 pr-4 text-[length:var(--body-s)] text-[var(--text-body)]"
                                    >
                                      <div className="border-l-2 border-[var(--charcoal-100)] pl-3">
                                        <div className="flex flex-wrap items-baseline gap-2">
                                          <ChannelTimelineIcon
                                            channel={rch}
                                            className="mt-0.5 shrink-0"
                                          />
                                          <span className="font-medium">
                                            {row.senderLabel}
                                          </span>
                                          <span className="text-[var(--text-label)]">
                                            {formatTimelineTime(row.sentAt)}
                                          </span>
                                          <DeliveryStatusGlyph
                                            status={row.deliveryStatus}
                                          />
                                        </div>
                                        <div className="mt-0.5 line-clamp-3 break-words font-light">
                                          {prev.subjectPart ? (
                                            <strong className="font-bold">
                                              {prev.subjectPart}
                                            </strong>
                                          ) : null}
                                          {prev.bodyPart}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {showMoreControl ? (
                <div className="mt-2 border-t border-transparent pt-1">
                  <button
                    type="button"
                    onClick={() => setExpandedList(true)}
                    className="text-[length:var(--body-m)] font-medium text-[var(--blue-500)] hover:underline"
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
