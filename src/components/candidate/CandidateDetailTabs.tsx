const TAB_IDS = [
  'overview',
  'application',
  'activity',
  'communications',
  'other-apps',
] as const

export type CandidateMainTabId = (typeof TAB_IDS)[number]

const LABELS: Record<CandidateMainTabId, string> = {
  overview: 'Overview',
  application: 'Application Details',
  activity: 'Activity Log',
  communications: 'Communications',
  'other-apps': 'Other Apps',
}

type Props = {
  active: CandidateMainTabId
  onChange: (id: CandidateMainTabId) => void
}

export function CandidateDetailTabs({ active, onChange }: Props) {
  return (
    <div
      className="flex flex-wrap gap-1 border-b border-[var(--border-subtle)]"
      role="tablist"
      aria-label="Candidate sections"
    >
      {TAB_IDS.map((id) => {
        const isActive = id === active
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(id)}
            className={[
              '-mb-px border-b-2 px-4 py-2.5 text-[length:var(--body-m)] transition-colors',
              isActive
                ? 'border-[var(--blue-500)] font-medium text-[var(--blue-600)]'
                : 'border-transparent font-normal text-[var(--tab-inactive-text)] hover:text-[var(--text-body)]',
            ].join(' ')}
          >
            {LABELS[id]}
          </button>
        )
      })}
    </div>
  )
}
