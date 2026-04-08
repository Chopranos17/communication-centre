import type { CandidateDetail } from '../../api/candidatesClient'

type Props = {
  detail: CandidateDetail
}

export function CandidateDetailSidebar({ detail }: Props) {
  const otherCount = detail.otherJobs.length

  return (
    <aside className="w-full shrink-0 space-y-4 lg:w-[300px]">
      <section className="rounded-lg border border-[var(--border-card)] bg-[var(--bg-surface)] p-4 shadow-[var(--elevation-1)]">
        <h2
          className="mb-3 text-[length:var(--body-m)] font-bold text-[var(--text-title)]"
          style={{ fontWeight: 'var(--font-weight-bold)' }}
        >
          Tags
        </h2>
        <p className="text-[length:var(--body-m)] text-[var(--text-label)]">No tags added yet.</p>
      </section>

      <section className="rounded-lg border border-[var(--border-card)] bg-[var(--bg-surface)] p-4 shadow-[var(--elevation-1)]">
        <h2
          className="mb-3 text-[length:var(--body-m)] font-bold text-[var(--text-title)]"
          style={{ fontWeight: 'var(--font-weight-bold)' }}
        >
          Skills
        </h2>
        <p className="text-[length:var(--body-m)] text-[var(--text-label)]">Not specified</p>
      </section>

      <section className="rounded-lg border border-[var(--border-card)] bg-[var(--bg-surface)] p-4 shadow-[var(--elevation-1)]">
        <h2
          className="mb-3 text-[length:var(--body-m)] font-bold text-[var(--text-title)]"
          style={{ fontWeight: 'var(--font-weight-bold)' }}
        >
          Feedback
        </h2>
        <p className="text-[length:var(--body-m)] text-[var(--text-label)]">No feedback recorded.</p>
      </section>

      <section className="rounded-lg border border-[var(--border-card)] bg-[var(--bg-surface)] shadow-[var(--elevation-1)]">
        <h2
          className="border-b border-[var(--border-subtle)] px-4 py-3 text-[length:var(--body-m)] font-bold text-[var(--text-title)]"
          style={{ fontWeight: 'var(--font-weight-bold)' }}
        >
          Other Applied Jobs ({otherCount})
        </h2>
        {otherCount === 0 ? (
          <p className="px-4 py-4 text-[length:var(--body-m)] text-[var(--text-label)]">
            No other applications.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {detail.otherJobs.map((j) => (
              <li key={j.id} className="px-4 py-3">
                <div className="text-[length:var(--body-m)] text-[var(--text-body)]">
                  {j.title} ( {j.jobCode} )
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-md bg-[var(--yellow-50)] px-2 py-0.5 text-[length:var(--body-s)] font-medium text-[var(--charcoal-600)]">
                    {j.statusLabel}
                  </span>
                  <span className="text-[length:var(--body-s)] text-[var(--text-label)]">
                    Applied On {j.appliedOn}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  )
}
