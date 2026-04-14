import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import type { JobListRow } from "../../api/jobsClient";
import {
  sdsButtonPrimary,
  sdsButtonSecondary,
} from "../../lib/sdsButtonClasses";
import {
  sdsModalBody,
  sdsModalCloseButton,
  sdsModalFooterToolbar,
  sdsModalHeader,
  sdsModalTitle,
  sdsSidePanelBackdropButton,
  sdsSidePanelContainerNarrow,
  sdsSidePanelRoot,
} from "../../lib/sdsModalClasses";
import { sdsLabel, sdsSelectWFull } from "../../lib/sdsFormClasses";

const PERIOD_OPTS = [
  { id: "quarter", label: "This quarter" },
  { id: "month", label: "This month" },
  { id: "week", label: "This week" },
  { id: "all", label: "All time" },
] as const;

const SORT_OPTS = [
  { id: "newest", label: "Newest first" },
  { id: "unresponsive_first", label: "Unresponsive first" },
  { id: "name_asc", label: "Name A–Z" },
] as const;

const selectShell =
  "inline-flex min-h-[40px] w-full items-center gap-1 rounded-sds-8 border border-[#e0e0e0] bg-white px-3 py-2 text-[13px] text-[#131313] outline-none transition hover:border-[#aaaaaa] focus-visible:ring-2 focus-visible:ring-[#0183FF] focus-visible:ring-offset-1";

const CHANNEL_OPTS = [
  { id: "", label: "All channels" },
  { id: "email", label: "Email" },
  { id: "sms", label: "SMS" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "meeting", label: "1:1 Meeting" },
] as const;

const SMS_CONSENT_OPTS = [
  { id: "", label: "All SMS consent" },
  { id: "granted", label: "Granted" },
  { id: "pending", label: "Pending" },
  { id: "revoked", label: "Opted out" },
] as const;

export type ActivityAdvancedFilters = {
  jobId: string;
  period: string;
  sort: string;
  /** Single channel id, or empty = all (matches activity API `channel` param). */
  channel: string;
  /** granted | pending | revoked — empty = all */
  smsConsent: string;
};

function JobOpeningField({
  jobs,
  jobId,
  onChange,
}: {
  jobs: JobListRow[];
  jobId: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return jobs;
    return jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(t) ||
        j.job_code.toLowerCase().includes(t),
    );
  }, [jobs, q]);

  const label =
    jobId === ""
      ? "All job openings"
      : jobs.find((j) => j.id === jobId)?.title ?? "Job";

  return (
    <div className="relative w-full" ref={rootRef}>
      <button
        type="button"
        className={selectShell}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-[#797979]"
          aria-hidden
        />
      </button>
      {open ? (
        <div className="absolute left-0 top-[calc(100%+4px)] z-[70] flex w-full min-w-[16rem] flex-col rounded-sds-8 border border-[#e0e0e0] bg-white shadow-[var(--elevation-2)]">
          <div className="border-b border-[#e0e0e0] p-2">
            <input
              type="search"
              placeholder="Search openings…"
              className="w-full rounded-sds-8 border border-[#e0e0e0] px-2 py-1.5 text-[12px] outline-none focus-visible:border-[#0183FF]"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <ul className="max-h-52 overflow-auto py-1 text-[12px]">
            <li>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-[var(--charcoal-20)]"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                All job openings
              </button>
            </li>
            {filtered.map((j) => (
              <li key={j.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-[var(--charcoal-20)]"
                  onClick={() => {
                    onChange(j.id);
                    setOpen(false);
                  }}
                >
                  <span className="block truncate font-medium text-[#131313]">
                    {j.title}
                  </span>
                  <span className="text-[11px] text-[#797979]">
                    {j.job_code}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function selectChevron() {
  return (
    <span
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#4d4d4d]"
      aria-hidden
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M6 9l6 6 6-6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function ActivityAdvancedFilterPanel({
  isOpen,
  onClose,
  jobs,
  values,
  onApply,
}: {
  isOpen: boolean;
  onClose: () => void;
  jobs: JobListRow[];
  values: ActivityAdvancedFilters;
  onApply: (next: ActivityAdvancedFilters) => void;
}) {
  const [draft, setDraft] = useState<ActivityAdvancedFilters>(values);

  useEffect(() => {
    if (isOpen) setDraft(values);
  }, [isOpen, values]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const applyDraft = useCallback(() => {
    onApply(draft);
    onClose();
  }, [draft, onApply, onClose]);

  if (!isOpen) return null;

  const panel = (
    <div
      className={sdsSidePanelRoot}
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-advanced-filter-title"
    >
      <button
        type="button"
        className={sdsSidePanelBackdropButton}
        aria-label="Close filters"
        onClick={onClose}
      />
      <div
        className={sdsSidePanelContainerNarrow}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={sdsModalHeader}>
          <h2 id="activity-advanced-filter-title" className={sdsModalTitle}>
            Filters
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={sdsModalCloseButton}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className={sdsModalBody}>
          <div className="mb-6">
            <p className={`mb-2 ${sdsLabel}`}>Job opening</p>
            <JobOpeningField
              jobs={jobs}
              jobId={draft.jobId}
              onChange={(jobId) => setDraft((d) => ({ ...d, jobId }))}
            />
          </div>
          <div className="mb-6">
            <p className={`mb-2 ${sdsLabel}`}>Channel</p>
            <div className="relative">
              <select
                className={`${sdsSelectWFull} appearance-none pr-10`}
                value={draft.channel}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, channel: e.target.value }))
                }
              >
                {CHANNEL_OPTS.map((o) => (
                  <option key={o.id || "all"} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              {selectChevron()}
            </div>
          </div>
          <div className="mb-6">
            <p className={`mb-2 ${sdsLabel}`}>SMS consent</p>
            <div className="relative">
              <select
                className={`${sdsSelectWFull} appearance-none pr-10`}
                value={draft.smsConsent}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, smsConsent: e.target.value }))
                }
              >
                {SMS_CONSENT_OPTS.map((o) => (
                  <option key={o.id || "all-consent"} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              {selectChevron()}
            </div>
          </div>
          <div className="mb-6">
            <p className={`mb-2 ${sdsLabel}`}>Time period</p>
            <div className="relative">
              <select
                className={`${sdsSelectWFull} appearance-none pr-10`}
                value={draft.period}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, period: e.target.value }))
                }
              >
                {PERIOD_OPTS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              {selectChevron()}
            </div>
          </div>
          <div className="mb-2">
            <p className={`mb-2 ${sdsLabel}`}>Sort order</p>
            <div className="relative">
              <select
                className={`${sdsSelectWFull} appearance-none pr-10`}
                value={draft.sort}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, sort: e.target.value }))
                }
              >
                {SORT_OPTS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              {selectChevron()}
            </div>
          </div>
        </div>

        <footer className={sdsModalFooterToolbar}>
          <span />
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`${sdsButtonSecondary} px-6`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={applyDraft}
              className={`${sdsButtonPrimary} px-6`}
            >
              Apply
            </button>
          </div>
        </footer>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
