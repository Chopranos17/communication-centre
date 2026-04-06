import { PageHeader } from '../components/layout/PageHeader'
import { ListToolbar } from '../components/layout/ListToolbar'
import { PaginationFooter } from '../components/layout/PaginationFooter'

const SAMPLE = [
  {
    name: 'Ravi Adam',
    id: 'CAN_1001',
    email: 'ravi.adam@example.com',
    phone: '+91 98765 43210',
    job: 'SDET - I (DES_84)',
    dept: 'Mobile IT Dept (DEP_18)',
    status: 'Shortlisting',
    applied: '2025.01.15',
  },
  {
    name: 'Priya Singh',
    id: 'CAN_1002',
    email: 'priya.singh@example.com',
    phone: '+91 91234 56789',
    job: 'Software Engineer (DES_90)',
    dept: 'Engineering (DEP_02)',
    status: 'Screening',
    applied: '2025.02.01',
  },
]

export function CandidatesPage() {
  return (
    <div>
      <PageHeader title="All Candidates" />

      <ListToolbar searchPlaceholder="Search by Name, Email, Phone, Candidate ID" />

      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-[var(--elevation-1)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-[length:var(--body-m)]">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--blue-20)] text-[length:var(--body-s)] font-medium uppercase tracking-wide text-[var(--text-label)]">
                <th className="w-10 px-3 py-2">
                  <input type="checkbox" aria-label="Select all" className="rounded border-[var(--border-default)]" />
                </th>
                <th className="px-3 py-2">Candidate</th>
                <th className="px-3 py-2">Email &amp; Phone</th>
                <th className="px-3 py-2">Job Applied</th>
                <th className="px-3 py-2">Overall Status</th>
                <th className="px-3 py-2 border-l border-[var(--border-subtle)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)]"
                >
                  <td className="px-3 py-3 align-top">
                    <input type="checkbox" aria-label={`Select ${row.name}`} className="rounded border-[var(--border-default)]" />
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      className="text-[var(--text-link)] font-medium hover:text-[var(--text-link-hover)] hover:underline"
                    >
                      {row.name}
                    </button>
                    <div className="text-[length:var(--body-s)] text-[var(--text-label)]">{row.id}</div>
                  </td>
                  <td className="px-3 py-3 text-[var(--text-body)]">
                    <div>{row.email}</div>
                    <div className="text-[length:var(--body-s)] text-[var(--text-label)]">{row.phone}</div>
                  </td>
                  <td className="px-3 py-3 text-[var(--text-body)]">
                    <div className="text-[length:var(--body-s)] text-[var(--text-label)]">{row.dept}</div>
                    <div>{row.job}</div>
                    <div className="text-[length:var(--body-s)] text-[var(--text-label)]">Multiple locations</div>
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
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded text-[var(--icon-default)] hover:bg-[var(--bg-surface-hover)]"
                        aria-label="More actions"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                          <circle cx="12" cy="5" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="12" cy="19" r="2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationFooter from={1} to={10} total={1581} />
      </div>
    </div>
  )
}
