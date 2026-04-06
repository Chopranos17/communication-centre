const STEPS = [
  { label: 'Shortlisting', showPending: true, action: 'Shortlist' },
  { label: 'Screening', showPending: false, action: null },
  { label: 'Technical', showPending: false, action: null },
  { label: 'Face to Face', showPending: false, action: null },
  { label: 'HR Interview', showPending: false, action: null },
  { label: 'Verification', showPending: false, action: null },
  { label: 'Pre-Offer', showPending: true, action: null },
] as const

function activeStepIndex(currentStage: string): number {
  const m: Record<string, number> = {
    applied: 0,
    shortlisting: 0,
    screening: 1,
    assessment: 2,
    interview: 3,
    pre_offer: 5,
    offer: 6,
    hired: 6,
    rejected: 0,
  }
  return m[currentStage] ?? 0
}

type Props = {
  currentStage: string
}

export function HiringFlowPlaceholder({ currentStage }: Props) {
  const active = activeStepIndex(currentStage)

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-[var(--elevation-1)]">
      <h2
        className="mb-6 text-[length:var(--title-xs)] font-bold text-[var(--text-title)]"
        style={{ fontWeight: 'var(--font-weight-bold)' }}
      >
        Hiring Flow
      </h2>
      <div className="flex gap-4">
        <div className="flex flex-col items-center">
          {STEPS.map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div
                className={[
                  'flex h-9 w-9 items-center justify-center rounded-full text-[length:var(--body-m)] font-medium',
                  i === active
                    ? 'bg-[var(--blue-500)] text-[var(--text-negative)]'
                    : 'border-2 border-[var(--border-default)] bg-[var(--white)] text-[var(--text-label)]',
                ].join(' ')}
              >
                {i + 1}
              </div>
              {i < STEPS.length - 1 ? (
                <div
                  className="w-px flex-1 min-h-[24px] bg-[var(--border-default)]"
                  aria-hidden
                />
              ) : null}
            </div>
          ))}
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          {STEPS.map((step, i) => (
            <div
              key={step.label}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--white)] px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={
                    i <= active
                      ? 'text-[length:var(--body-m)] text-[var(--text-body)]'
                      : 'text-[length:var(--body-m)] text-[var(--text-label-lighter)]'
                  }
                >
                  {step.label}
                </span>
                {step.showPending ? (
                  <span className="rounded bg-[var(--yellow-50)] px-2 py-0.5 text-[length:var(--body-s)] font-medium text-[var(--yellow-500)]">
                    Pending
                  </span>
                ) : null}
              </div>
              {step.action ? (
                <button
                  type="button"
                  className="rounded-[var(--radius-sm)] bg-[var(--charcoal-700)] px-4 py-1.5 text-[length:var(--body-s)] font-medium text-[var(--white)] hover:bg-[var(--charcoal-600)]"
                >
                  {step.action}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
