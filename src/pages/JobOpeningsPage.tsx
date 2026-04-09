import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchJobs, type JobListRow } from '../api/jobsClient'
import { FilterTabs } from '../components/layout/FilterTabs'
import { ListToolbar } from '../components/layout/ListToolbar'
import { PageHeader } from '../components/layout/PageHeader'
import { PaginationFooter } from '../components/layout/PaginationFooter'
import { sdsButtonIconTertiary, sdsButtonPrimary } from '../lib/sdsButtonClasses'
import {
  jobOpeningStatusPillClass,
  sdsDataTable,
  sdsDataTableCheckbox,
  sdsDataTableHeadRow,
  sdsDataTableRow,
  sdsDataTableShell,
  sdsDataTableTd,
  sdsDataTableTh,
} from '../lib/sdsTableClasses'

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
  return (
    <span className={jobOpeningStatusPillClass(variant)}>
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
              className={sdsButtonPrimary}
            >
              + CREATE JOB
            </button>
            <button
              type="button"
              className={sdsButtonIconTertiary}
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

      <div className={sdsDataTableShell}>
        <table className={`${sdsDataTable} table-fixed`}>
            <thead>
              <tr className={sdsDataTableHeadRow}>
                <th
                  scope="col"
                  className="w-[40px] min-w-[40px] max-w-[40px] p-0 align-middle"
                >
                  <div className="flex h-10 items-center justify-center">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      className={sdsDataTableCheckbox}
                    />
                  </div>
                </th>
                <th className={`w-[50%] ${sdsDataTableTh}`}>Job Title &amp; Code</th>
                <th className={`w-[25%] ${sdsDataTableTh}`}>Status</th>
                <th className={`w-[25%] ${sdsDataTableTh}`}>Location</th>
              </tr>
            </thead>
            <tbody>
              {visibleJobs.map((row) => (
                <tr
                  key={row.id}
                  className={sdsDataTableRow}
                >
                  <td className="w-[40px] min-w-[40px] max-w-[40px] p-0 align-middle">
                    <div className="flex min-h-[3.25rem] items-center justify-center">
                      <input
                        type="checkbox"
                        aria-label={`Select ${row.title}`}
                        className={sdsDataTableCheckbox}
                      />
                    </div>
                  </td>
                  <td className={`min-w-0 ${sdsDataTableTd}`}>
                    <Link
                      to={`/recruitment/jobs/${row.id}`}
                      className="block truncate font-medium text-[var(--text-link)] hover:text-[var(--text-link-hover)] hover:underline"
                    >
                      {row.title}
                    </Link>
                    <div className="truncate text-[length:var(--body-s)] text-[var(--text-label)]">{row.job_code}</div>
                  </td>
                  <td className={`min-w-0 align-top ${sdsDataTableTd}`}>
                    <StatusBadge
                      label={row.status.replace(/_/g, ' ')}
                      variant={statusVariant(row.status)}
                    />
                  </td>
                  <td className={`min-w-0 truncate ${sdsDataTableTd}`}>{row.location}</td>
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
