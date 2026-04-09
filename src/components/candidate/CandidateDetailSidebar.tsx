import type { CandidateDetail } from '../../api/candidatesClient'

type Props = {
  detail: CandidateDetail
  /** When true (Communications tab), hide Tags/Skills/Feedback; Other Applied Jobs only. */
  communicationsLayout?: boolean
}

export function CandidateDetailSidebar({ detail, communicationsLayout = false }: Props) {
  const otherCount = detail.otherJobs.length

  return (
    <aside className="w-full shrink-0 space-y-4 lg:w-[300px]">
      {!communicationsLayout ? (
        <>
          <section className="border border-[#e0e0e0] bg-white">
            <h2 className="px-4 py-3 text-title-xs font-medium text-[#131313]">Tags</h2>
            <div className="px-4 py-3 text-body-m text-[#4d4d4d]">
              <p>No tags added yet.</p>
            </div>
          </section>

          <section className="border border-[#e0e0e0] bg-white">
            <h2 className="px-4 py-3 text-title-xs font-medium text-[#131313]">Skills</h2>
            <div className="px-4 py-3 text-body-m text-[#4d4d4d]">
              <p>Not specified</p>
            </div>
          </section>

          <section className="border border-[#e0e0e0] bg-white">
            <h2 className="px-4 py-3 text-title-xs font-medium text-[#131313]">Feedback</h2>
            <div className="px-4 py-3 text-body-m text-[#4d4d4d]">
              <p>No feedback recorded.</p>
            </div>
          </section>
        </>
      ) : null}

      <section className="border border-[#e0e0e0] bg-white">
        <h2 className="px-4 py-3 text-title-xs font-medium text-[#131313]">
          Other Applied Jobs ({otherCount})
        </h2>
        {otherCount === 0 ? (
          <p className="px-4 py-3 text-body-m text-[#4d4d4d]">No other applications.</p>
        ) : (
          <ul className="divide-y divide-[#e0e0e0]">
            {detail.otherJobs.map((j) => (
              <li key={j.id} className="px-4 py-3 text-body-m text-[#4d4d4d]">
                <div>{j.title} ( {j.jobCode} )</div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-sds-4 bg-[var(--yellow-50)] px-2 py-0.5 text-body-s font-medium text-[var(--charcoal-600)]">
                    {j.statusLabel}
                  </span>
                  <span className="text-body-s text-[#4d4d4d]">Applied On {j.appliedOn}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  )
}
