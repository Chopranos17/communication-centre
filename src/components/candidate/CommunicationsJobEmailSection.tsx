import { useMemo, useState, useEffect } from "react";
import type { CurrentJobEmailRow } from "../../api/candidatesClient";
import {
  buildEmailPreviewLine,
  formatTimelineTime,
} from "../../utils/communicationTimeline";
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
};

export function CommunicationsJobEmailSection({
  defaultSectionOpen,
  jobTitle,
  jobCode,
  titleSuffix,
  showNewEmailButton,
  emails,
  loading = false,
  loadError = null,
  onRetry,
  missingJobMessage = null,
  emptyFilterMessage = "No emails match this filter for this job.",
  onSelectEmail,
  onInvalidateDetail,
  onNewEmail,
  newEmailDisabled = false,
  newEmailDisabledTitle,
}: CommunicationsJobEmailSectionProps) {
  const [sectionOpen, setSectionOpen] = useState(defaultSectionOpen);
  const [emailFilter, setEmailFilter] = useState<EmailTypeFilter>("all");
  const [expandedList, setExpandedList] = useState(false);

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
  }, [emailFilter, emailListKey]);

  useEffect(() => {
    onInvalidateDetail?.();
  }, [emailFilter, emailListKey, onInvalidateDetail]);

  const visibleRows = useMemo(() => {
    if (!expandedList) return filtered.slice(0, INITIAL_VISIBLE);
    return filtered;
  }, [filtered, expandedList]);

  const showMoreControl = filtered.length > INITIAL_VISIBLE && !expandedList;

  const tableScroll = expandedList && filtered.length > EXPANDED_CAP;

  const showBody = missingJobMessage == null;

  const openDetail = onSelectEmail ?? (() => {});

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
              <button
                type="button"
                onClick={() => onNewEmail?.()}
                disabled={newEmailDisabled || !onNewEmail}
                title={newEmailDisabled ? newEmailDisabledTitle : undefined}
                className={[
                  "rounded border border-[var(--charcoal-100)] px-4 py-2 text-[length:var(--body-s)] font-bold uppercase tracking-wide text-[var(--charcoal-700)]",
                  newEmailDisabled || !onNewEmail
                    ? "cursor-not-allowed bg-[var(--yellow-500)] opacity-60"
                    : "bg-[var(--yellow-500)] hover:opacity-95",
                ].join(" ")}
              >
                + New Email
              </button>
            ) : (
              <span className="hidden sm:block sm:min-w-[7rem]" aria-hidden />
            )}
          </div>

          {loading ? (
            <p className="text-[length:var(--body-m)] text-[var(--text-label)]" role="status">
              Loading emails…
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
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row) => {
                      const { subjectPart, bodyPart } = buildEmailPreviewLine(
                        row.subject,
                        row.body,
                      );
                      return (
                        <tr
                          key={row.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => openDetail(row)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openDetail(row);
                            }
                          }}
                          className="group cursor-pointer border-0 transition-colors hover:bg-[var(--charcoal-10)] focus-visible:bg-[var(--bg-surface-selected)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--blue-500)]"
                        >
                          <td className="align-top py-3 pr-4 font-medium text-[var(--text-body)]">
                            <span className="line-clamp-2">{row.senderLabel}</span>
                          </td>
                          <td className="align-top py-3 pr-4 font-light text-[var(--text-body)]">
                            <span className="line-clamp-2 break-words">
                              <strong className="font-bold">{subjectPart}</strong>
                              {bodyPart}
                            </span>
                          </td>
                          <td className="align-top py-3 text-[length:var(--body-s)] font-light text-[var(--text-label)] sm:text-right">
                            {formatTimelineTime(row.sentAt)}
                          </td>
                        </tr>
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
