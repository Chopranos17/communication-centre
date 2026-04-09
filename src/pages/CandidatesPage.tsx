import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchCandidates,
  type CandidateListRow,
} from "../api/candidatesClient";
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
import { ComposeEmailModal } from "../components/candidate/ComposeEmailModal";
import type { ComposeEmailRecipient } from "../components/candidate/ComposeEmailModal";

const CANDIDATES_BULK_SECONDARY_MENU: BulkOverflowMenuItem[] = [
  { label: "Move to another opening", disabled: true },
  { label: "Delete", disabled: true },
  { label: "Blacklist", disabled: true },
  { label: "Copy to another opening", disabled: true },
  { label: "Star Selected Candidates", disabled: true },
  { label: "Unstar Selected Candidates", disabled: true },
  { label: "Add Tags", disabled: true },
];
import { BulkSelectionBar } from "../components/layout/BulkSelectionBar";
import { PageHeader } from "../components/layout/PageHeader";
import { ListToolbar } from "../components/layout/ListToolbar";
import { PaginationFooter } from "../components/layout/PaginationFooter";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { usePersona } from "../context/PersonaContext";
import {
  sdsButtonBulkBarGhost,
  sdsButtonIconTertiarySm,
  sdsButtonLink,
  sdsButtonSecondarySm,
} from "../lib/sdsButtonClasses";
import {
  candidateStatusPillClass,
  sdsDataTable,
  sdsDataTableCheckbox,
  sdsDataTableHeadRow,
  sdsDataTableRow,
  sdsDataTableRowSelected,
  sdsDataTableShell,
  sdsDataTableTd,
  sdsDataTableTh,
} from "../lib/sdsTableClasses";

export function CandidatesPage() {
  const [rows, setRows] = useState<CandidateListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeFromRowId, setComposeFromRowId] = useState<string | null>(null);
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

  const rowMap = useMemo(
    () => new Map(rows.map((r) => [r.id, r])),
    [rows],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchCandidates();
      setRows(list);
      setSelected(new Set());
    } catch {
      setError("Could not load candidates. Is the API running?");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (menuOpenId === null) return;
    const onMouseDown = (e: MouseEvent) => {
      const el = document.getElementById(`candidate-row-menu-${menuOpenId}`);
      if (el && !el.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [menuOpenId]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (!rows.length) return;
    setSelected(new Set(rows.map((r) => r.id)));
  }, [rows]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  useEffect(() => {
    if (!canManageRecruitment) {
      clearSelection();
      setComposeOpen(false);
      setComposeFromRowId(null);
      setBulkChannel(null);
      setBulkMeetingOpen(false);
      setBulkMeetingRecipients([]);
      setBulkToast(null);
      setMenuOpenId(null);
    }
  }, [canManageRecruitment, clearSelection]);

  useEffect(() => {
    if (!bulkToast) return;
    const t = window.setTimeout(() => setBulkToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [bulkToast]);

  const allSelected = rows.length > 0 && selected.size === rows.length;

  const composeRecipients: ComposeEmailRecipient[] = useMemo(() => {
    if (composeFromRowId) {
      const r = rowMap.get(composeFromRowId);
      if (
        !r ||
        !r.currentJobId ||
        !r.email.trim()
      ) {
        return [];
      }
      return [
        {
          candidateId: r.id,
          candidateName: r.name,
          candidateEmail: r.email,
          jobCount: r.jobCount,
          jobId: r.currentJobId,
          jobTitle: r.jobTitle,
        },
      ];
    }
    return [...selected]
      .map((id) => rowMap.get(id))
      .filter(
        (r): r is CandidateListRow =>
          Boolean(r?.currentJobId && r.email.trim()),
      )
      .map((r) => ({
        candidateId: r.id,
        candidateName: r.name,
        candidateEmail: r.email,
        jobCount: r.jobCount,
        jobId: r.currentJobId!,
        jobTitle: r.jobTitle,
      }));
  }, [composeFromRowId, selected, rowMap]);

  const closeCompose = useCallback(() => {
    setComposeOpen(false);
    setComposeFromRowId(null);
  }, []);

  const openComposeFromSelection = useCallback(() => {
    setComposeFromRowId(null);
    setComposeOpen(true);
  }, []);

  const primaryJobId = composeRecipients[0]?.jobId ?? "";
  const primaryJobTitle = composeRecipients[0]?.jobTitle ?? "";

  const selectedRows = useMemo(
    () =>
      [...selected]
        .map((id) => rowMap.get(id))
        .filter((r): r is CandidateListRow => Boolean(r)),
    [selected, rowMap],
  );

  const bulkEmailEligibleCount = useMemo(
    () =>
      selectedRows.filter((r) => Boolean(r.currentJobId && r.email.trim()))
        .length,
    [selectedRows],
  );

  const bulkMeetingJobTitleLabel = useMemo(() => {
    if (bulkMeetingRecipients.length === 0) return "";
    const titles = new Set(
      bulkMeetingRecipients
        .map((r) => rowMap.get(r.candidateId)?.jobTitle)
        .filter(Boolean),
    );
    if (titles.size <= 1) return [...titles][0] ?? "Job";
    return "Multiple job applications";
  }, [bulkMeetingRecipients, rowMap]);

  const activateBulkChannel = useCallback(
    (channel: BulkSendChannel) => {
      if (channel === "email") {
        const eligible = selectedRows.filter(
          (r) => r.currentJobId && r.email.trim(),
        );
        if (eligible.length === 0) return;
        openComposeFromSelection();
        return;
      }
      if (channel === "sms") {
        const withJob = selectedRows.filter((r) => r.currentJobId);
        const recipients: BulkChannelRecipient[] = withJob
          .filter((r) => r.phone?.trim())
          .map((r) => ({
            candidateId: r.id,
            name: r.name,
            jobId: r.currentJobId!,
            address: r.phone!.trim(),
          }));
        const skippedNoContact = withJob.filter(
          (r) => !r.phone?.trim(),
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
        const withJob = selectedRows.filter((r) => r.currentJobId);
        const recipients: BulkChannelRecipient[] = withJob
          .filter((r) => r.whatsappNumber?.trim())
          .map((r) => ({
            candidateId: r.id,
            name: r.name,
            jobId: r.currentJobId!,
            address: r.whatsappNumber!.trim(),
          }));
        const skippedNoContact = withJob.filter(
          (r) => !r.whatsappNumber?.trim(),
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
        const recipients: BulkMeetingRecipient[] = selectedRows
          .filter((r) => r.currentJobId && r.email.trim())
          .map((r) => ({
            candidateId: r.id,
            name: r.name,
            email: r.email.trim(),
            jobId: r.currentJobId!,
          }));
        if (recipients.length === 0) return;
        setBulkMeetingRecipients(recipients);
        setBulkMeetingOpen(true);
      }
    },
    [selectedRows, openComposeFromSelection],
  );

  return (
    <div
      className={[
        "mx-auto w-full min-w-0 max-w-screen-xl px-6 pt-6",
        canManageRecruitment && selected.size > 0
          ? "pb-[4.5rem] sm:pb-[4.25rem]"
          : "pb-6",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {bulkToast ? (
        <div
          className="fixed bottom-[5.25rem] left-1/2 z-[115] max-w-[min(100%-2rem,28rem)] -translate-x-1/2 rounded-sds-8 border border-[var(--border-card)] bg-[var(--bg-surface)] px-4 py-2.5 text-center text-[length:var(--body-m)] text-[var(--text-body)] shadow-[var(--elevation-2)]"
          role="status"
        >
          {bulkToast}
        </div>
      ) : null}
      <PageHeader title="All Candidates" />

      <ListToolbar searchPlaceholder="Search by Name, Email, Phone, Candidate ID" />

      {error ? (
        <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-error-low)] px-4 py-3 text-[length:var(--body-m)] text-[var(--text-body)]">
          {error}{" "}
          <button
            type="button"
            onClick={() => void load()}
            className={sdsButtonLink}
          >
            Retry
          </button>
        </div>
      ) : null}

      {canManageRecruitment &&
      composeOpen &&
      composeRecipients.length > 0 &&
      primaryJobId ? (
        <ComposeEmailModal
          open={composeOpen}
          onClose={closeCompose}
          jobId={primaryJobId}
          jobTitle={primaryJobTitle}
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
          jobIdFallback={bulkChannel.recipients[0]?.jobId ?? ""}
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
          jobTitle={bulkMeetingJobTitleLabel || "Job"}
          initialRecipients={bulkMeetingRecipients}
          onComplete={(msg) => setBulkToast(msg)}
          onSent={() => void load()}
        />
      ) : null}

      <div className={sdsDataTableShell}>
        <table className={`${sdsDataTable} table-fixed`}>
            <thead>
              <tr className={sdsDataTableHeadRow}>
                {canManageRecruitment ? (
                  <th
                    scope="col"
                    className="w-[40px] min-w-[40px] max-w-[40px] p-0 align-middle"
                  >
                    <div className="flex h-10 items-center justify-center">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => {
                          if (allSelected) clearSelection();
                          else selectAll();
                        }}
                        aria-label="Select all"
                        className={sdsDataTableCheckbox}
                      />
                    </div>
                  </th>
                ) : null}
                <th className={`w-[20%] ${sdsDataTableTh}`}>Candidate</th>
                <th className={`w-[22%] ${sdsDataTableTh}`}>Email &amp; Phone</th>
                <th className={`w-[28%] ${sdsDataTableTh}`}>Job Applied</th>
                <th className={`w-[15%] ${sdsDataTableTh}`}>Overall Status</th>
                <th
                  className={`w-[15%] border-l border-[#e0e0e0] ${sdsDataTableTh}`}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={canManageRecruitment ? 6 : 5}
                    className={`${sdsDataTableTd} text-center text-[#4d4d4d] py-8`}
                  >
                    <span
                      className="inline-flex items-center justify-center gap-2"
                      role="status"
                    >
                      <LoadingSpinner size="sm" aria-hidden />
                      Loading candidates…
                    </span>
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const isSelected = selected.has(row.id);
                  return (
                    <tr
                      key={row.id}
                      className={[
                        sdsDataTableRow,
                        isSelected ? sdsDataTableRowSelected : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {canManageRecruitment ? (
                        <td className="w-[40px] min-w-[40px] max-w-[40px] p-0 align-middle">
                          <div className="flex min-h-[3.25rem] items-center justify-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggle(row.id)}
                              aria-label={`Select ${row.name}`}
                              className={sdsDataTableCheckbox}
                            />
                          </div>
                        </td>
                      ) : null}
                      <td className={`min-w-0 ${sdsDataTableTd}`}>
                        <Link
                          to={`/recruitment/candidates/${row.id}`}
                          className="block truncate font-medium text-[var(--text-link)] hover:text-[var(--text-link-hover)] hover:underline"
                        >
                          {row.name}
                        </Link>
                        <div className="truncate text-[length:var(--body-s)] text-[var(--text-label)]">
                          {row.id}
                        </div>
                      </td>
                      <td className={`min-w-0 ${sdsDataTableTd}`}>
                        <div className="truncate">{row.email}</div>
                        <div className="truncate text-[length:var(--body-s)] text-[var(--text-label)]">
                          {row.phone}
                        </div>
                      </td>
                      <td className={`min-w-0 ${sdsDataTableTd}`}>
                        <div className="truncate text-[length:var(--body-s)] text-[var(--text-label)]">
                          {row.department}
                        </div>
                        <div className="truncate">{row.job}</div>
                        <div className="truncate text-[length:var(--body-s)] text-[var(--text-label)]">
                          Multiple locations
                        </div>
                      </td>
                      <td className={`min-w-0 align-top ${sdsDataTableTd}`}>
                        <span className={candidateStatusPillClass(row.status)}>
                          <span className="truncate">{row.status}</span>
                        </span>
                      </td>
                      <td
                        className={`min-w-0 border-l border-[#e0e0e0] align-top ${sdsDataTableTd}`}
                      >
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className={sdsButtonSecondarySm}
                          >
                            Shortlist
                          </button>
                          <div
                            id={`candidate-row-menu-${row.id}`}
                            className="relative"
                          >
                            <button
                              type="button"
                              className={sdsButtonIconTertiarySm}
                              aria-label="More actions"
                              aria-expanded={menuOpenId === row.id}
                              aria-haspopup="menu"
                              onClick={() =>
                                setMenuOpenId((id) =>
                                  id === row.id ? null : row.id,
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
                            {menuOpenId === row.id ? (
                              <div
                                className="absolute right-0 top-full z-50 mt-1 min-w-[13.5rem] rounded-sds-8 border border-[var(--border-card)] bg-[var(--bg-surface)] py-1 shadow-[var(--elevation-2)]"
                                role="menu"
                              >
                                <Link
                                  role="menuitem"
                                  to={`/recruitment/candidates/${row.id}?tab=application`}
                                  className="block px-3 py-2 text-left text-[length:var(--body-m)] text-[var(--text-body)] hover:bg-[var(--bg-surface-hover)]"
                                  onClick={() => setMenuOpenId(null)}
                                >
                                  View Application
                                </Link>
                                <Link
                                  role="menuitem"
                                  to={`/recruitment/candidates/${row.id}?tab=activity`}
                                  className="block px-3 py-2 text-left text-[length:var(--body-m)] text-[var(--text-body)] hover:bg-[var(--bg-surface-hover)]"
                                  onClick={() => setMenuOpenId(null)}
                                >
                                  View Activity Log
                                </Link>
                                <Link
                                  role="menuitem"
                                  to={`/recruitment/candidates/${row.id}?tab=communications`}
                                  className="block px-3 py-2 text-left text-[length:var(--body-m)] text-[var(--text-body)] hover:bg-[var(--bg-surface-hover)]"
                                  onClick={() => setMenuOpenId(null)}
                                >
                                  View Communications
                                </Link>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        <PaginationFooter from={1} to={rows.length} total={rows.length} />
      </div>

      {canManageRecruitment && selected.size > 0 ? (
        <BulkSelectionBar aria-label="Bulk actions for selected candidates">
          <span className="text-sm font-bold tabular-nums text-white">
            {`${selected.size}/${rows.length} ${selected.size === 1 ? "Record" : "Records"} Selected`}
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
                  ? "No selected candidates have a current job and email."
                  : undefined
              }
              onActivate={activateBulkChannel}
              secondaryMenuItems={CANDIDATES_BULK_SECONDARY_MENU}
            />
          </div>
        </BulkSelectionBar>
      ) : null}
    </div>
  );
}
