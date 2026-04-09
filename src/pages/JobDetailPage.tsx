import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { BulkSelectionBar } from "../components/layout/BulkSelectionBar";
import { Link, useParams } from "react-router-dom";
import {
  fetchJobDetail,
  type JobDetailCandidateRow,
} from "../api/jobsClient";
import {
  BulkChannelMessageModal,
  type BulkChannelRecipient,
} from "../components/candidate/BulkChannelMessageModal";
import {
  BulkScheduleMeetingModal,
  type BulkMeetingRecipient,
} from "../components/candidate/BulkScheduleMeetingModal";
import {
  BulkSelectionSendButton,
  type BulkOverflowMenuItem,
} from "../components/candidate/BulkSelectionSendButton";
import type { BulkSendChannel } from "../components/candidate/BulkSelectionSendButton";

const JOB_DETAIL_BULK_SECONDARY_MENU: BulkOverflowMenuItem[] = [
  { label: "Reject", disabled: true },
  { label: "Quick Shortlist", disabled: true },
  { label: "Quick Screen", disabled: true },
  { label: "Request Review", disabled: true },
  { label: "Send Pre-Offer", disabled: true },
  { label: "Send Pre-Offer Reminder", disabled: true },
  { label: "Add Tags", disabled: true },
  { label: "Assign Recruiter", disabled: true },
  { label: "Unassign Recruiter", disabled: true },
];
import { ComposeEmailModal } from "../components/candidate/ComposeEmailModal";
import type { ComposeEmailRecipient } from "../components/candidate/ComposeEmailModal";
import { PageHeader } from "../components/layout/PageHeader";
import {
  sdsButtonBulkBarGhost,
  sdsButtonIconTertiarySm,
  sdsButtonSecondarySm,
} from "../lib/sdsButtonClasses";
import {
  sdsDataTable,
  sdsDataTableCheckbox,
  sdsDataTableHeadRow,
  sdsDataTableRow,
  sdsDataTableRowSelected,
  sdsDataTableShell,
  sdsDataTableTd,
  sdsDataTableTh,
} from "../lib/sdsTableClasses";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { usePersona } from "../context/PersonaContext";

export function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [data, setData] = useState<Awaited<
    ReturnType<typeof fetchJobDetail>
  > | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [composeOpen, setComposeOpen] = useState(false);
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);
  const [rowMenuAnchorRect, setRowMenuAnchorRect] = useState<DOMRect | null>(
    null,
  );
  const [bulkChannel, setBulkChannel] = useState<{
    variant: "sms" | "whatsapp";
    recipients: BulkChannelRecipient[];
    skippedNoContact: number;
    skippedReason: "phone" | "whatsapp";
  } | null>(null);
  const [bulkMeetingOpen, setBulkMeetingOpen] = useState(false);
  const [bulkMeetingRecipients, setBulkMeetingRecipients] = useState<
    BulkMeetingRecipient[]
  >([]);
  const [bulkToast, setBulkToast] = useState<string | null>(null);
  const { canManageRecruitment } = usePersona();

  const load = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      const d = await fetchJobDetail(jobId);
      setData(d);
      setSelected(new Set());
    } catch (e) {
      if (e instanceof Error && e.message === "NOT_FOUND") {
        setError("notfound");
        setData(null);
      } else {
        setError("load");
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    void load();
  }, [load]);

  useLayoutEffect(() => {
    if (!rowMenuOpenId) {
      setRowMenuAnchorRect(null);
      return;
    }
    const el = document.getElementById(
      `job-detail-menu-trigger-${rowMenuOpenId}`,
    );
    if (!el) {
      setRowMenuAnchorRect(null);
      return;
    }
    setRowMenuAnchorRect(el.getBoundingClientRect());
  }, [rowMenuOpenId]);

  useEffect(() => {
    if (!rowMenuOpenId) return;
    const update = () => {
      const el = document.getElementById(
        `job-detail-menu-trigger-${rowMenuOpenId}`,
      );
      if (el) setRowMenuAnchorRect(el.getBoundingClientRect());
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [rowMenuOpenId]);

  useEffect(() => {
    if (rowMenuOpenId === null) return;
    const onMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      const wrap = document.getElementById(
        `job-detail-row-menu-${rowMenuOpenId}`,
      );
      const pop = document.getElementById("job-detail-row-menu-popover");
      if (wrap?.contains(t) || pop?.contains(t)) return;
      setRowMenuOpenId(null);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [rowMenuOpenId]);

  useEffect(() => {
    if (rowMenuOpenId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setRowMenuOpenId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rowMenuOpenId]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (!data?.candidates.length) return;
    setSelected(new Set(data.candidates.map((c) => c.id)));
  }, [data?.candidates]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  useEffect(() => {
    if (!canManageRecruitment) {
      clearSelection();
      setComposeOpen(false);
      setRowMenuOpenId(null);
      setBulkChannel(null);
      setBulkMeetingOpen(false);
      setBulkMeetingRecipients([]);
      setBulkToast(null);
    }
  }, [canManageRecruitment, clearSelection]);

  useEffect(() => {
    if (!bulkToast) return;
    const t = window.setTimeout(() => setBulkToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [bulkToast]);

  const composeRecipients: ComposeEmailRecipient[] = useMemo(() => {
    if (!data) return [];
    const map = new Map(data.candidates.map((c) => [c.id, c]));
    return [...selected]
      .map((id) => map.get(id))
      .filter((c): c is JobDetailCandidateRow => Boolean(c))
      .map((c) => ({
        candidateId: c.id,
        candidateName: c.name,
        candidateEmail: c.email,
        jobCount: c.jobCount,
      }));
  }, [data, selected]);

  const closeCompose = useCallback(() => {
    setComposeOpen(false);
  }, []);

  const openComposeFromSelection = useCallback(() => {
    setComposeOpen(true);
  }, []);

  const selectedCandidateRows = useMemo(() => {
    if (!data) return [];
    const map = new Map(data.candidates.map((c) => [c.id, c]));
    return [...selected]
      .map((id) => map.get(id))
      .filter((c): c is JobDetailCandidateRow => Boolean(c));
  }, [data, selected]);

  const bulkEmailEligibleCount = useMemo(
    () => selectedCandidateRows.filter((c) => c.email.trim()).length,
    [selectedCandidateRows],
  );

  const activateBulkChannel = useCallback(
    (channel: BulkSendChannel) => {
      if (!data) return;
      const jid = data.job.id;
      if (channel === "email") {
        if (bulkEmailEligibleCount === 0) return;
        openComposeFromSelection();
        return;
      }
      if (channel === "sms") {
        const recipients: BulkChannelRecipient[] = selectedCandidateRows
          .filter((c) => c.phone?.trim())
          .map((c) => ({
            candidateId: c.id,
            name: c.name,
            jobId: jid,
            address: c.phone.trim(),
          }));
        const skippedNoContact = selectedCandidateRows.filter(
          (c) => !c.phone?.trim(),
        ).length;
        if (recipients.length === 0) return;
        setBulkChannel({
          variant: "sms",
          recipients,
          skippedNoContact,
          skippedReason: "phone",
        });
        return;
      }
      if (channel === "whatsapp") {
        const recipients: BulkChannelRecipient[] = selectedCandidateRows
          .filter((c) => c.whatsappNumber?.trim())
          .map((c) => ({
            candidateId: c.id,
            name: c.name,
            jobId: jid,
            address: c.whatsappNumber.trim(),
          }));
        const skippedNoContact = selectedCandidateRows.filter(
          (c) => !c.whatsappNumber?.trim(),
        ).length;
        if (recipients.length === 0) return;
        setBulkChannel({
          variant: "whatsapp",
          recipients,
          skippedNoContact,
          skippedReason: "whatsapp",
        });
        return;
      }
      if (channel === "meeting") {
        const recipients: BulkMeetingRecipient[] = selectedCandidateRows
          .filter((c) => c.email.trim())
          .map((c) => ({
            candidateId: c.id,
            name: c.name,
            email: c.email.trim(),
            jobId: jid,
          }));
        if (recipients.length === 0) return;
        setBulkMeetingRecipients(recipients);
        setBulkMeetingOpen(true);
      }
    },
    [
      bulkEmailEligibleCount,
      data,
      openComposeFromSelection,
      selectedCandidateRows,
    ],
  );

  const rowMenuCandidate = useMemo((): JobDetailCandidateRow | undefined => {
    if (!data || !rowMenuOpenId) return undefined;
    return data.candidates.find((c) => c.id === rowMenuOpenId);
  }, [data, rowMenuOpenId]);

  const rowMenuPopoverStyle = useMemo((): {
    top: number;
    left: number;
  } | null => {
    if (!rowMenuAnchorRect) return null;
    const minW = 216;
    const left = Math.min(
      Math.max(8, rowMenuAnchorRect.right - minW),
      typeof window !== "undefined" ? window.innerWidth - minW - 8 : 8,
    );
    return { top: rowMenuAnchorRect.bottom + 4, left };
  }, [rowMenuAnchorRect]);

  if (!jobId) {
    return (
      <p className="text-[length:var(--body-m)] text-[var(--text-label)]">
        Invalid job.
      </p>
    );
  }

  if (loading) {
    return (
      <p
        className="flex items-center gap-2 text-[length:var(--body-m)] text-[var(--text-body)]"
        role="status"
      >
        <LoadingSpinner size="sm" aria-hidden />
        <span>Loading job…</span>
      </p>
    );
  }

  if (error === "load") {
    return (
      <div className="space-y-3">
        <p className="text-[length:var(--body-m)] text-[var(--text-error)]">
          Could not load job. Is the API running?
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className={sdsButtonSecondarySm}
        >
          Retry
        </button>
      </div>
    );
  }

  if (error === "notfound" || !data) {
    return (
      <div className="space-y-3">
        <p className="text-[length:var(--body-m)] text-[var(--text-body)]">
          Job not found.
        </p>
        <Link
          to="/recruitment/job-openings"
          className="text-[length:var(--body-m)] font-medium text-[var(--text-link)] hover:underline"
        >
          Back to Job Openings
        </Link>
      </div>
    );
  }

  const { job, candidates } = data;
  const allSelected =
    candidates.length > 0 && selected.size === candidates.length;

  return (
    <div
      className={
        canManageRecruitment && selected.size > 0
          ? "pb-[4.5rem] sm:pb-[4.25rem]"
          : undefined
      }
    >
      {bulkToast ? (
        <div
          className="fixed bottom-[5.25rem] left-1/2 z-[115] max-w-[min(100%-2rem,28rem)] -translate-x-1/2 rounded-sds-8 border border-[var(--border-card)] bg-[var(--bg-surface)] px-4 py-2.5 text-center text-[length:var(--body-m)] text-[var(--text-body)] shadow-[var(--elevation-2)]"
          role="status"
        >
          {bulkToast}
        </div>
      ) : null}
      <div className="mb-4">
        <Link
          to="/recruitment/job-openings"
          className="text-[length:var(--body-m)] font-medium text-[var(--text-link)] hover:text-[var(--text-link-hover)] hover:underline"
        >
          ← Job Openings
        </Link>
      </div>

      <PageHeader
        title={job.title}
        badge={
          <span className="text-[length:var(--body-s)] text-[var(--text-label)]">
            {job.jobCode} · {job.department} · {job.location}
          </span>
        }
      />

      {canManageRecruitment && composeOpen && composeRecipients.length > 0 ? (
        <ComposeEmailModal
          open={composeOpen}
          onClose={closeCompose}
          jobId={job.id}
          jobTitle={job.title}
          recipients={composeRecipients}
          onSent={() => void load()}
          onBulkComplete={(msg) => setBulkToast(msg)}
        />
      ) : null}

      {canManageRecruitment && bulkChannel ? (
        <BulkChannelMessageModal
          open
          onClose={() => setBulkChannel(null)}
          variant={bulkChannel.variant}
          jobIdFallback={job.id}
          initialRecipients={bulkChannel.recipients}
          skippedNoContactCount={bulkChannel.skippedNoContact}
          skippedReason={bulkChannel.skippedReason}
          onComplete={(msg) => setBulkToast(msg)}
          onSent={() => void load()}
        />
      ) : null}

      {canManageRecruitment && bulkMeetingOpen && bulkMeetingRecipients.length > 0 ? (
        <BulkScheduleMeetingModal
          open
          onClose={() => {
            setBulkMeetingOpen(false);
            setBulkMeetingRecipients([]);
          }}
          jobTitle={job.title}
          initialRecipients={bulkMeetingRecipients}
          onComplete={(msg) => setBulkToast(msg)}
          onSent={() => void load()}
        />
      ) : null}

      {canManageRecruitment ? (
        <p className="mb-3 text-[length:var(--body-m)] text-[var(--text-label)]">
          Select candidates with the checkboxes for bulk actions (bar at bottom), or
          open a candidate&apos;s <span className="font-medium text-[var(--text-body)]">Communications</span>{" "}
          tab from the row menu (⋮).
        </p>
      ) : (
        <p className="mb-3 text-[length:var(--body-m)] text-[var(--text-label)]">
          Candidate view: you can browse this list; email and bulk actions are
          hidden.
        </p>
      )}

      <div className={sdsDataTableShell}>
        <div className="overflow-x-auto overscroll-x-contain">
          <table className={`${sdsDataTable} min-w-[720px]`}>
            <thead>
              <tr className={sdsDataTableHeadRow}>
                {canManageRecruitment ? (
                  <th className={`w-12 ${sdsDataTableTh}`}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => {
                        if (allSelected) clearSelection();
                        else selectAll();
                      }}
                      aria-label="Select all candidates"
                      className={sdsDataTableCheckbox}
                    />
                  </th>
                ) : null}
                <th className={sdsDataTableTh}>Candidate</th>
                <th className={sdsDataTableTh}>Email</th>
                <th className={sdsDataTableTh}>Jobs applied</th>
                {canManageRecruitment ? (
                  <th
                    className={`sticky right-0 z-20 w-[7.5rem] min-w-[7.5rem] border-l border-[#e0e0e0] bg-[#f5f5f5] text-right shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.08)] ${sdsDataTableTh}`}
                  >
                    Actions
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => {
                const isSelected = selected.has(c.id);
                return (
                <tr
                  key={c.id}
                  className={[
                    "group",
                    sdsDataTableRow,
                    isSelected ? sdsDataTableRowSelected : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {canManageRecruitment ? (
                    <td className={`align-top ${sdsDataTableTd}`}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(c.id)}
                        aria-label={`Select ${c.name}`}
                        className={sdsDataTableCheckbox}
                      />
                    </td>
                  ) : null}
                  <td className={`font-medium ${sdsDataTableTd}`}>
                    {c.name}
                  </td>
                  <td className={`max-w-[240px] break-all ${sdsDataTableTd}`}>
                    {c.email}
                  </td>
                  <td className={`text-[#4d4d4d] ${sdsDataTableTd}`}>
                    {c.jobCount}
                  </td>
                  {canManageRecruitment ? (
                    <td
                      className={[
                        "sticky right-0 z-10 border-l border-[#e0e0e0] text-right align-middle shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.06)]",
                        sdsDataTableTd,
                        isSelected
                          ? "bg-[#E6F3FF] group-hover:bg-[#E6F3FF]"
                          : "bg-white group-hover:bg-[#F5FAFF]",
                      ].join(" ")}
                    >
                      <div
                        id={`job-detail-row-menu-${c.id}`}
                        className="relative inline-flex justify-end"
                      >
                        <button
                          id={`job-detail-menu-trigger-${c.id}`}
                          type="button"
                          className={sdsButtonIconTertiarySm}
                          aria-label="More actions"
                          aria-expanded={rowMenuOpenId === c.id}
                          aria-haspopup="menu"
                          onClick={() =>
                            setRowMenuOpenId((id) =>
                              id === c.id ? null : c.id,
                            )
                          }
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden
                          >
                            <circle cx="12" cy="5" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="12" cy="19" r="2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
        {candidates.length === 0 ? (
          <p className="p-6 text-center text-[length:var(--body-m)] text-[var(--text-label)]">
            No candidates on this job yet.
          </p>
        ) : null}
      </div>

      {canManageRecruitment &&
      rowMenuOpenId &&
      rowMenuAnchorRect &&
      rowMenuPopoverStyle &&
      rowMenuCandidate
        ? createPortal(
            <div
              id="job-detail-row-menu-popover"
              role="menu"
              className="fixed z-[200] min-w-[13.5rem] rounded-sds-8 border border-[var(--border-card)] bg-[var(--bg-surface)] py-1 text-left shadow-[var(--elevation-2)]"
              style={rowMenuPopoverStyle}
            >
              <Link
                role="menuitem"
                to={`/recruitment/candidates/${rowMenuCandidate.id}?tab=application`}
                className="block px-3 py-2 text-[length:var(--body-m)] text-[var(--text-body)] hover:bg-[var(--bg-surface-hover)]"
                onClick={() => setRowMenuOpenId(null)}
              >
                View Application
              </Link>
              <Link
                role="menuitem"
                to={`/recruitment/candidates/${rowMenuCandidate.id}?tab=activity`}
                className="block px-3 py-2 text-[length:var(--body-m)] text-[var(--text-body)] hover:bg-[var(--bg-surface-hover)]"
                onClick={() => setRowMenuOpenId(null)}
              >
                View Activity Log
              </Link>
              <Link
                role="menuitem"
                to={`/recruitment/candidates/${rowMenuCandidate.id}?tab=communications`}
                className="block px-3 py-2 text-[length:var(--body-m)] text-[var(--text-body)] hover:bg-[var(--bg-surface-hover)]"
                onClick={() => setRowMenuOpenId(null)}
              >
                View Communications
              </Link>
            </div>,
            document.body,
          )
        : null}

      {canManageRecruitment && selected.size > 0 ? (
        <BulkSelectionBar aria-label="Bulk actions for selected candidates">
          <span className="text-sm font-bold tabular-nums text-white">
            {`${selected.size}/${candidates.length} ${selected.size === 1 ? "Record" : "Records"} Selected`}
          </span>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={clearSelection}
              className={sdsButtonBulkBarGhost}
            >
              Cancel
            </button>
            <BulkSelectionSendButton
              emailDisabled={bulkEmailEligibleCount === 0}
              emailTooltip={
                bulkEmailEligibleCount === 0
                  ? "No selected candidates have an email address."
                  : undefined
              }
              onActivate={activateBulkChannel}
              secondaryMenuItems={JOB_DETAIL_BULK_SECONDARY_MENU}
            />
          </div>
        </BulkSelectionBar>
      ) : null}
    </div>
  );
}
