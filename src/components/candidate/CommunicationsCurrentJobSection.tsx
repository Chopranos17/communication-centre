import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchCandidateCurrentJobEmails,
  type CandidateCurrentJobEmails,
  type CurrentJobEmailRow,
} from "../../api/candidatesClient";
import {
  buildEmailPreviewLine,
  formatTimelineTime,
} from "../../utils/communicationTimeline";

type EmailTypeFilter = "all" | "system" | "user";

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

export function CommunicationsCurrentJobSection({ candidateId }: { candidateId: string }) {
  const [sectionOpen, setSectionOpen] = useState(true);
  const [emailFilter, setEmailFilter] = useState<EmailTypeFilter>("all");
  const [expandedList, setExpandedList] = useState(false);
  const [data, setData] = useState<CandidateCurrentJobEmails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const d = await fetchCandidateCurrentJobEmails(candidateId);
      setData(d);
    } catch {
      setLoadError("Could not load communications.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => (data?.emails ? filterEmails(data.emails, emailFilter) : []),
    [data?.emails, emailFilter],
  );

  useEffect(() => {
    setExpandedList(false);
  }, [emailFilter, candidateId]);

  const visibleRows = useMemo(() => {
    if (!expandedList) return filtered.slice(0, INITIAL_VISIBLE);
    return filtered;
  }, [filtered, expandedList]);

  const showMoreControl =
    filtered.length > INITIAL_VISIBLE && !expandedList;

  const tableScroll =
    expandedList && filtered.length > EXPANDED_CAP;

  const jobTitle = data?.currentJob?.title ?? "Current role";
  const jobCode = data?.currentJob?.jobCode;

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
          <span className="font-medium text-[var(--text-label)]"> (Current Job)</span>
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
            <button
              type="button"
              className="rounded border border-[var(--charcoal-100)] bg-[var(--yellow-500)] px-4 py-2 text-[length:var(--body-s)] font-bold uppercase tracking-wide text-[var(--charcoal-700)] opacity-60"
              disabled
              title="Available in a later task"
            >
              + New Email
            </button>
          </div>

          {loading ? (
            <p className="text-[length:var(--body-m)] text-[var(--text-label)]" role="status">
              Loading emails…
            </p>
          ) : loadError ? (
            <div className="space-y-2">
              <p className="text-[length:var(--body-m)] text-[var(--text-error)]">{loadError}</p>
              <button
                type="button"
                onClick={() => void load()}
                className="rounded border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1.5 text-[length:var(--body-m)] text-[var(--text-body)] hover:bg-[var(--bg-surface-hover)]"
              >
                Retry
              </button>
            </div>
          ) : !data?.currentJob ? (
            <p className="text-[length:var(--body-m)] text-[var(--text-label)]">
              No current job is linked to this candidate.
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-[length:var(--body-m)] text-[var(--text-label)]">
              No emails match this filter for the current job.
            </p>
          ) : (
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
                          className="group border-0 transition-colors hover:bg-[var(--charcoal-10)]"
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
          )}
        </div>
      ) : null}
    </div>
  );
}
