import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchCandidates,
  type CandidateListRow,
} from "../api/candidatesClient";
import { ComposeEmailModal } from "../components/candidate/ComposeEmailModal";
import type { ComposeEmailRecipient } from "../components/candidate/ComposeEmailModal";
import { SendChannelMessageModal } from "../components/candidate/SendChannelMessageModal";
import { PageHeader } from "../components/layout/PageHeader";
import { ListToolbar } from "../components/layout/ListToolbar";
import { PaginationFooter } from "../components/layout/PaginationFooter";

export function CandidatesPage() {
  const [rows, setRows] = useState<CandidateListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeFromRowId, setComposeFromRowId] = useState<string | null>(null);
  const [channelModal, setChannelModal] = useState<{
    row: CandidateListRow;
    variant: "sms" | "whatsapp";
  } | null>(null);

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

  const openComposeFromRow = useCallback((candidateId: string) => {
    setComposeFromRowId(candidateId);
    setComposeOpen(true);
  }, []);

  const primaryJobId = composeRecipients[0]?.jobId ?? "";
  const primaryJobTitle = composeRecipients[0]?.jobTitle ?? "";

  return (
    <div
      className={
        selected.size > 0 ? "pb-[4.5rem] sm:pb-[4.25rem]" : undefined
      }
    >
      <PageHeader title="All Candidates" />

      <ListToolbar searchPlaceholder="Search by Name, Email, Phone, Candidate ID" />

      {error ? (
        <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-error-low)] px-4 py-3 text-[length:var(--body-m)] text-[var(--text-body)]">
          {error}{" "}
          <button
            type="button"
            onClick={() => void load()}
            className="font-medium text-[var(--text-link)] underline hover:text-[var(--text-link-hover)]"
          >
            Retry
          </button>
        </div>
      ) : null}

      {composeOpen && composeRecipients.length > 0 && primaryJobId ? (
        <ComposeEmailModal
          open={composeOpen}
          onClose={closeCompose}
          jobId={primaryJobId}
          jobTitle={primaryJobTitle}
          recipients={composeRecipients}
          onSent={() => void load()}
        />
      ) : null}

      {channelModal?.row.currentJobId ? (
        <SendChannelMessageModal
          open={Boolean(channelModal)}
          onClose={() => setChannelModal(null)}
          variant={channelModal.variant}
          candidateId={channelModal.row.id}
          candidateName={channelModal.row.name}
          jobId={channelModal.row.currentJobId}
          toDisplay={
            channelModal.variant === "whatsapp"
              ? `${channelModal.row.name} · ${
                  channelModal.row.whatsappNumber?.trim() ||
                  channelModal.row.phone?.trim() ||
                  "—"
                }`
              : `${channelModal.row.name} · ${
                  channelModal.row.phone?.trim() || "—"
                }`
          }
          onSent={() => void load()}
        />
      ) : null}

      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-[var(--elevation-1)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-[length:var(--body-m)]">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--blue-20)] text-[length:var(--body-s)] font-medium uppercase tracking-wide text-[var(--text-label)]">
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => {
                      if (allSelected) clearSelection();
                      else selectAll();
                    }}
                    aria-label="Select all"
                    className="rounded border-[var(--border-default)]"
                  />
                </th>
                <th className="px-3 py-2">Candidate</th>
                <th className="px-3 py-2">Email &amp; Phone</th>
                <th className="px-3 py-2">Job Applied</th>
                <th className="px-3 py-2">Overall Status</th>
                <th className="border-l border-[var(--border-subtle)] px-3 py-2">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-[var(--text-label)]"
                  >
                    Loading candidates…
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const canEmail =
                    Boolean(row.currentJobId) && Boolean(row.email.trim());
                  const canSms =
                    Boolean(row.currentJobId) &&
                    Boolean(row.phone?.trim());
                  const canWhatsApp =
                    Boolean(row.currentJobId) &&
                    Boolean(
                      row.whatsappNumber?.trim() || row.phone?.trim(),
                    );

                  return (
                    <tr
                      key={row.id}
                      className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)]"
                    >
                      <td className="px-3 py-3 align-top">
                        <input
                          type="checkbox"
                          checked={selected.has(row.id)}
                          onChange={() => toggle(row.id)}
                          aria-label={`Select ${row.name}`}
                          className="rounded border-[var(--border-default)]"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          to={`/recruitment/candidates/${row.id}`}
                          className="font-medium text-[var(--text-link)] hover:text-[var(--text-link-hover)] hover:underline"
                        >
                          {row.name}
                        </Link>
                        <div className="text-[length:var(--body-s)] text-[var(--text-label)]">
                          {row.id}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[var(--text-body)]">
                        <div>{row.email}</div>
                        <div className="text-[length:var(--body-s)] text-[var(--text-label)]">
                          {row.phone}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[var(--text-body)]">
                        <div className="text-[length:var(--body-s)] text-[var(--text-label)]">
                          {row.department}
                        </div>
                        <div>{row.job}</div>
                        <div className="text-[length:var(--body-s)] text-[var(--text-label)]">
                          Multiple locations
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <span className="inline-flex rounded-md bg-[var(--yellow-50)] px-2 py-0.5 text-[length:var(--body-s)] font-medium text-[var(--charcoal-600)]">
                          {row.status}
                        </span>
                      </td>
                      <td className="border-l border-[var(--border-subtle)] px-3 py-3 align-top">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded border border-[var(--border-default)] bg-[var(--bg-surface)] px-2 py-1 text-[length:var(--body-s)] text-[var(--text-body)] hover:bg-[var(--bg-surface-hover)]"
                          >
                            Shortlist
                          </button>
                          <div
                            id={`candidate-row-menu-${row.id}`}
                            className="relative"
                          >
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded text-[var(--icon-default)] hover:bg-[var(--bg-surface-hover)]"
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
                                className="absolute right-0 top-full z-50 mt-1 min-w-[13.5rem] rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)] py-1 shadow-[var(--elevation-2)]"
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
                                  View Application Log
                                </Link>
                                <button
                                  type="button"
                                  role="menuitem"
                                  disabled={!canEmail}
                                  title={
                                    !canEmail
                                      ? !row.currentJobId
                                        ? "No current job application."
                                        : "Candidate has no email address."
                                      : undefined
                                  }
                                  className="block w-full px-3 py-2 text-left text-[length:var(--body-m)] text-[var(--text-body)] hover:bg-[var(--bg-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                                  onClick={() => {
                                    if (!canEmail) return;
                                    setMenuOpenId(null);
                                    openComposeFromRow(row.id);
                                  }}
                                >
                                  Send Email
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  disabled={!canWhatsApp}
                                  title={
                                    !canWhatsApp
                                      ? !row.currentJobId
                                        ? "No current job application."
                                        : "Candidate has no phone or WhatsApp number."
                                      : undefined
                                  }
                                  className="block w-full px-3 py-2 text-left text-[length:var(--body-m)] text-[var(--text-body)] hover:bg-[var(--bg-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                                  onClick={() => {
                                    if (!canWhatsApp) return;
                                    setMenuOpenId(null);
                                    setChannelModal({
                                      row,
                                      variant: "whatsapp",
                                    });
                                  }}
                                >
                                  Send WhatsApp
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  disabled={!canSms}
                                  title={
                                    !canSms
                                      ? !row.currentJobId
                                        ? "No current job application."
                                        : "Candidate has no valid phone number for SMS."
                                      : undefined
                                  }
                                  className="block w-full px-3 py-2 text-left text-[length:var(--body-m)] text-[var(--text-body)] hover:bg-[var(--bg-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                                  onClick={() => {
                                    if (!canSms) return;
                                    setMenuOpenId(null);
                                    setChannelModal({ row, variant: "sms" });
                                  }}
                                >
                                  Send SMS
                                </button>
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
        </div>
        <PaginationFooter from={1} to={rows.length} total={rows.length} />
      </div>

      {selected.size > 0 ? (
        <div
          className="fixed inset-x-0 bottom-0 z-[100] flex flex-wrap items-center justify-between gap-3 border-t border-[var(--charcoal-600)] bg-[var(--charcoal-700)] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[var(--elevation-3)] sm:px-6"
          role="region"
          aria-label="Bulk actions for selected candidates"
        >
          <span className="text-[length:var(--body-m)] font-medium text-[var(--white)]">
            {selected.size}/{rows.length} Record
            {selected.size === 1 ? "" : "s"} Selected
          </span>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={clearSelection}
              className="rounded border border-[var(--charcoal-300)] bg-transparent px-4 py-1.5 text-[length:var(--body-m)] font-medium text-[var(--white)] hover:bg-[var(--charcoal-600)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const eligible = [...selected]
                  .map((id) => rowMap.get(id))
                  .filter(
                    (r): r is CandidateListRow =>
                      Boolean(r?.currentJobId && r.email.trim()),
                  );
                if (eligible.length === 0) return;
                openComposeFromSelection();
              }}
              title={
                [...selected].every((id) => {
                  const r = rowMap.get(id);
                  return r?.currentJobId && r.email.trim();
                })
                  ? undefined
                  : "Some selected candidates have no current job or email; only eligible recipients will be included."
              }
              className="rounded border border-[var(--blue-400)] bg-[var(--blue-500)] px-4 py-1.5 text-[length:var(--body-m)] font-medium text-[var(--white)] hover:bg-[var(--blue-600)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={
                [...selected].every((id) => {
                  const r = rowMap.get(id);
                  return !(r?.currentJobId && r.email.trim());
                })
              }
            >
              Send Email
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
