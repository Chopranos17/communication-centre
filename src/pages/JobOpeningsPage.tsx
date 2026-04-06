import { useState } from 'react'
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

const SAMPLE_ROWS = [
  {
    title: 'Regional Sales Manager',
    code: 'JOB_1024',
    status: 'Open',
    statusVariant: 'open' as const,
  },
  {
    title: 'Product Manager',
    code: 'JOB_1025',
    status: 'Draft',
    statusVariant: 'draft' as const,
  },
]

export function JobOpeningsPage() {
  const [tab, setTab] = useState('all')

  return (
    <div>
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
              className="inline-flex items-center rounded-md px-4 py-2 text-[length:var(--body-m)] font-medium text-[var(--btn-cta-text)] shadow-sm transition-opacity hover:opacity-95"
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

      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-[var(--elevation-1)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-[length:var(--body-m)]">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--blue-20)] text-[length:var(--body-s)] font-medium uppercase tracking-wide text-[var(--text-label)]">
                <th className="w-10 px-3 py-2">
                  <input type="checkbox" aria-label="Select all" className="rounded border-[var(--border-default)]" />
                </th>
                <th className="px-3 py-2">Job Title &amp; Code</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Location</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_ROWS.map((row) => (
                <tr
                  key={row.code}
                  className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)]"
                >
                  <td className="px-3 py-3 align-top">
                    <input type="checkbox" aria-label={`Select ${row.title}`} className="rounded border-[var(--border-default)]" />
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      className="text-left font-medium text-[var(--text-link)] hover:text-[var(--text-link-hover)] hover:underline"
                    >
                      {row.title}
                    </button>
                    <div className="text-[length:var(--body-s)] text-[var(--text-label)]">{row.code}</div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <StatusBadge label={row.status} variant={row.statusVariant} />
                  </td>
                  <td className="px-3 py-3 text-[var(--text-body)]">Multiple locations</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationFooter from={1} to={10} total={2549} />
      </div>
    </div>
  )
}

function StatusBadge({
  label,
  variant,
}: {
  label: string
  variant: 'open' | 'draft'
}) {
  const border =
    variant === 'open' ? 'border-l-[var(--status-open)]' : 'border-l-[var(--status-draft)]'
  return (
    <span
      className={`inline-flex items-center rounded border border-[var(--border-subtle)] border-l-4 ${border} bg-[var(--charcoal-5)] px-2 py-0.5 text-[length:var(--body-s)] font-medium text-[var(--text-body)]`}
    >
      {label}
    </span>
  )
}
