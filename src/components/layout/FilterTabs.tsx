type TabItem = {
  id: string
  label: string
  count?: number
}

type FilterTabsProps = {
  tabs: TabItem[]
  activeId: string
  onChange: (id: string) => void
}

export function FilterTabs({ tabs, activeId, onChange }: FilterTabsProps) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="tablist"
      aria-label="Filter"
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={[
              'inline-flex items-center rounded-full border px-3 py-1.5 text-[length:var(--body-m)] leading-5 transition-colors',
              active
                ? 'border-[var(--blue-500)] bg-[var(--blue-50)] text-[var(--blue-600)] font-medium'
                : 'border-[var(--border-subtle)] bg-[var(--white)] text-[var(--tab-inactive-text)] hover:bg-[var(--bg-surface-hover)]',
            ].join(' ')}
          >
            {tab.label}
            {tab.count !== undefined ? (
              <span className="ml-1 tabular-nums opacity-90">({tab.count})</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
