import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchJobDetail,
  type JobDetailCandidateRow,
} from "../api/jobsClient";
import { ComposeEmailModal } from "../components/candidate/ComposeEmailModal";
import type { ComposeEmailRecipient } from "../components/candidate/ComposeEmailModal";
import { PageHeader } from "../components/layout/PageHeader";

export function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [data, setData] = useState<Awaited<
    ReturnType<typeof fetchJobDetail>
  > | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [composeOpen, setComposeOpen] = useState(false);

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

  if (!jobId) {
    return (
      <p className="text-[length:var(--body-m)] text-[var(--text-label)]">
        Invalid job.
      </p>
    );
  }

  if (loading) {
    return (
      <p className="text-[length:var(--body-m)] text-[var(--text-body)]" role="status">
        Loading job…
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
    <div>
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
          onClose={() => setComposeOpen(false)}
          jobId={job.id}
          jobTitle={job.title}
          recipients={composeRecipients}
          onSent={() => void load()}
        />
      ) : null}

      <div className="mb-4 flex min-h-[44px] flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--blue-10)] px-4 py-2">
        <span className="text-[length:var(--body-m)] text-[var(--text-body)]">
          {selected.size === 0
            ? "Select candidates to send email."
            : `${selected.size} selected`}
        </span>
        <button
          type="button"
          disabled={selected.size === 0}
          onClick={() => setComposeOpen(true)}
          className="rounded border border-[var(--blue-500)] bg-[var(--blue-500)] px-4 py-1.5 text-[length:var(--body-m)] font-medium text-white hover:bg-[var(--blue-600)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send Email
        </button>
        {selected.size > 0 ? (
          <button
            type="button"
            onClick={clearSelection}
            className="text-[length:var(--body-m)] font-medium text-[var(--text-link)] hover:underline"
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-[var(--elevation-1)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-[length:var(--body-m)]">
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
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)]"
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
    </div>
  );
}
