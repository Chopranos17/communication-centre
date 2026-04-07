import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchJobDetail,
  type JobDetailCandidateRow,
} from "../api/jobsClient";
import { ComposeEmailModal } from "../components/candidate/ComposeEmailModal";
import type { ComposeEmailRecipient } from "../components/candidate/ComposeEmailModal";
import { PageHeader } from "../components/layout/PageHeader";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";

export function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [data, setData] = useState<Awaited<
    ReturnType<typeof fetchJobDetail>
  > | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [composeOpen, setComposeOpen] = useState(false);
  /** When set, compose uses this candidate only (row action); otherwise uses checkbox selection. */
  const [composeFromRowId, setComposeFromRowId] = useState<string | null>(null);

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

  const composeRecipients: ComposeEmailRecipient[] = useMemo(() => {
    if (!data) return [];
    const map = new Map(data.candidates.map((c) => [c.id, c]));
    if (composeFromRowId) {
      const c = map.get(composeFromRowId);
      if (!c) return [];
      return [
        {
          candidateId: c.id,
          candidateName: c.name,
          candidateEmail: c.email,
          jobCount: c.jobCount,
        },
      ];
    }
    return [...selected]
      .map((id) => map.get(id))
      .filter((c): c is JobDetailCandidateRow => Boolean(c))
      .map((c) => ({
        candidateId: c.id,
        candidateName: c.name,
        candidateEmail: c.email,
        jobCount: c.jobCount,
      }));
  }, [data, selected, composeFromRowId]);

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
          className="rounded border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1.5 text-[length:var(--body-m)] text-[var(--text-body)] hover:bg-[var(--bg-surface-hover)]"
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
        selected.size > 0 ? "pb-[4.5rem] sm:pb-[4.25rem]" : undefined
      }
    >
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

      {composeOpen && composeRecipients.length > 0 ? (
        <ComposeEmailModal
          open={composeOpen}
          onClose={closeCompose}
          jobId={job.id}
          jobTitle={job.title}
          recipients={composeRecipients}
          onSent={() => void load()}
        />
      ) : null}

      <p className="mb-3 text-[length:var(--body-m)] text-[var(--text-label)]">
        Select candidates with the checkboxes for bulk email (bar at bottom), or
        use <span className="font-medium text-[var(--text-body)]">Email</span>{" "}
        on a row to message one candidate.
      </p>

      <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-[var(--elevation-1)]">
        <div className="overflow-x-auto overscroll-x-contain rounded-[var(--radius-md)]">
          <table className="w-full min-w-[720px] border-collapse text-left text-[length:var(--body-m)]">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--blue-20)] text-[length:var(--body-s)] font-medium uppercase tracking-wide text-[var(--text-label)]">
                <th className="w-12 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => {
                      if (allSelected) clearSelection();
                      else selectAll();
                    }}
                    aria-label="Select all candidates"
                    className="rounded border-[var(--border-default)]"
                  />
                </th>
                <th className="px-3 py-2">Candidate</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Jobs applied</th>
                <th className="sticky right-0 z-20 w-[7.5rem] min-w-[7.5rem] border-l border-[var(--border-subtle)] bg-[var(--blue-20)] px-3 py-2 text-right shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.08)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr
                  key={c.id}
                  className="group border-b border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)]"
                >
                  <td className="px-3 py-3 align-top">
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggle(c.id)}
                      aria-label={`Select ${c.name}`}
                      className="rounded border-[var(--border-default)]"
                    />
                  </td>
                  <td className="px-3 py-3 font-medium text-[var(--text-body)]">
                    {c.name}
                  </td>
                  <td className="max-w-[240px] break-all px-3 py-3 text-[var(--text-body)]">
                    {c.email}
                  </td>
                  <td className="px-3 py-3 text-[var(--text-label)]">
                    {c.jobCount}
                  </td>
                  <td
                    className="sticky right-0 z-10 border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-3 text-right align-middle shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.06)] group-hover:bg-[var(--bg-surface-hover)]"
                  >
                    <button
                      type="button"
                      disabled={!c.email.trim()}
                      title={
                        !c.email.trim()
                          ? "Candidate has no email address."
                          : `Send email to ${c.name}`
                      }
                      onClick={() => {
                        if (c.email.trim()) openComposeFromRow(c.id);
                      }}
                      className="inline-flex min-h-8 items-center justify-center whitespace-nowrap rounded border border-[var(--charcoal-100)] bg-[var(--white)] px-3 py-1.5 text-center text-[length:var(--body-m)] font-medium text-[var(--charcoal-700)] shadow-sm hover:bg-[var(--charcoal-5)] hover:border-[var(--charcoal-200)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[var(--white)] disabled:hover:border-[var(--charcoal-100)]"
                    >
                      Email
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {candidates.length === 0 ? (
          <p className="p-6 text-center text-[length:var(--body-m)] text-[var(--text-label)]">
            No candidates on this job yet.
          </p>
        ) : null}
      </div>

      {selected.size > 0 ? (
        <div
          className="fixed inset-x-0 bottom-0 z-[100] flex flex-wrap items-center justify-between gap-3 border-t border-[var(--charcoal-600)] bg-[var(--charcoal-700)] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[var(--elevation-3)] sm:px-6"
          role="region"
          aria-label="Bulk actions for selected candidates"
        >
          <span className="text-[length:var(--body-m)] font-medium text-[var(--white)]">
            {selected.size}/{candidates.length} Record
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
              onClick={openComposeFromSelection}
              className="rounded border border-[var(--blue-400)] bg-[var(--blue-500)] px-4 py-1.5 text-[length:var(--body-m)] font-medium text-[var(--white)] hover:bg-[var(--blue-600)]"
            >
              Send Email
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
