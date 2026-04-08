import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchJobs, type JobListRow } from '../api/jobsClient'
import { FilterTabs } from '../components/layout/FilterTabs'
import { ListToolbar } from '../components/layout/ListToolbar'
import { PageHeader } from '../components/layout/PageHeader'
import { PaginationFooter } from '../components/layout/PaginationFooter'

const JOB_TABS = [
  { id: 'all', label: 'All Openings', count: 2549 },
  { id: 'open', label: 'Open', count: 2295 },
  { id: 'drafts', label: 'Drafts', count: 177 },
  { id: 'hold', label: 'On Hold', count: 20 },
  { id: 'archived', label: 'Archived', count: 57 },
]

function statusVariant(
  status: string,
): 'open' | 'draft' | 'hold' {
  const s = status.toLowerCase()
  if (s === 'open') return 'open'
  if (s === 'on_hold' || s === 'hold') return 'hold'
  return 'draft'
}

function StatusBadge({
  label,
  variant,
}: {
  label: string
  variant: 'open' | 'draft' | 'hold'
}) {
  const border =
    variant === 'open'
      ? 'border-l-[var(--status-open)]'
      : variant === 'hold'
        ? 'border-l-amber-500'
        : 'border-l-[var(--status-draft)]'
  return (
    <span
      className={`inline-flex max-w-full min-w-0 items-center rounded border border-[var(--border-subtle)] border-l-4 ${border} bg-[var(--charcoal-5)] px-2 py-0.5 text-[length:var(--body-s)] font-medium text-[var(--text-body)]`}
    >
      <span className="truncate">{label}</span>
    </span>
  )
}

export function JobOpeningsPage() {
  const [tab, setTab] = useState('all')
  const [jobs, setJobs] = useState<JobListRow[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const list = await fetchJobs()
      setJobs(list)
    } catch {
      setLoadError('Could not load jobs.')
      setJobs([])
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const visibleJobs =
    tab === 'open'
      ? jobs.filter((j) => j.status.toLowerCase() === 'open')
      : tab === 'hold'
        ? jobs.filter((j) => j.status.toLowerCase() === 'on_hold')
        : jobs

  return (
    <div className="w-full min-w-0">
      <PageHeader
        title="Job Openings"
        badge={
          <span className="inline-flex items-center rounded-full bg-[var(--yellow-50)] px-2 py-0.5 text-[length:var(--body-s)] font-medium text-[var(--charcoal-600)]">
            Important Update:
          </span>
        }
        action={
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="inline-flex items-center rounded-md px-4 py-2 text-[length:var(--body-m)] font-medium text-[var(--btn-cta-text)] shadow-none transition-opacity hover:opacity-95"
              style={{
                background: 'var(--btn-cta-bg)',
                fontWeight: 'var(--font-weight-bold)',
              }}
            >
              + CREATE JOB
            </button>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--icon-default)] hover:bg-[var(--bg-surface-hover)]"
              aria-label="More actions"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>
          </div>
        }
      />

      <ListToolbar searchPlaceholder="Search" />

      <div className="mb-4">
        <FilterTabs tabs={JOB_TABS} activeId={tab} onChange={setTab} />
      </div>

      {loadError ? (
        <p className="mb-4 text-[length:var(--body-m)] text-[var(--text-error)]">{loadError}</p>
      ) : null}

      <div className="w-full min-w-0 overflow-hidden rounded-lg border border-[var(--border-card)] bg-[var(--bg-surface)] shadow-[var(--elevation-1)]">
        <table className="w-full table-fixed border-collapse text-left text-[length:var(--body-m)]">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--blue-20)] text-[length:var(--body-s)] font-medium uppercase tracking-wide text-[var(--text-label)]">
                <th
                  scope="col"
                  className="w-[40px] min-w-[40px] max-w-[40px] p-0 align-middle"
                >
                  <div className="flex h-10 items-center justify-center">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      className="shrink-0 rounded border-[var(--border-default)]"
                    />
                  </div>
                </th>
                <th className="w-[50%] px-3 py-2">Job Title &amp; Code</th>
                <th className="w-[25%] px-3 py-2">Status</th>
                <th className="w-[25%] px-3 py-2">Location</th>
              </tr>
            </thead>
            <tbody>
              {visibleJobs.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)]"
                >
                  <td className="w-[40px] min-w-[40px] max-w-[40px] p-0 align-middle">
                    <div className="flex min-h-[3.25rem] items-center justify-center">
                      <input
                        type="checkbox"
                        aria-label={`Select ${row.title}`}
                        className="shrink-0 rounded border-[var(--border-default)]"
                      />
                    </div>
                  </td>
                  <td className="min-w-0 px-3 py-3">
                    <Link
                      to={`/recruitment/jobs/${row.id}`}
                      className="block truncate font-medium text-[var(--text-link)] hover:text-[var(--text-link-hover)] hover:underline"
                    >
                      {row.title}
                    </Link>
                    <div className="truncate text-[length:var(--body-s)] text-[var(--text-label)]">{row.job_code}</div>
                  </td>
                  <td className="min-w-0 px-3 py-3 align-top">
                    <StatusBadge
                      label={row.status.replace(/_/g, ' ')}
                      variant={statusVariant(row.status)}
                    />
                  </td>
                  <td className="min-w-0 truncate px-3 py-3 text-[var(--text-body)]">{row.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        {visibleJobs.length === 0 && !loadError ? (
          <p className="p-6 text-center text-[length:var(--body-m)] text-[var(--text-label)]">
            No jobs in this filter.
          </p>
        ) : null}
        <PaginationFooter from={1} to={visibleJobs.length} total={visibleJobs.length} />
      </div>
    </div>
  )
}
