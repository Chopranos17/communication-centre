import {
  sdsPillMdSelected,
  sdsPillMdUnselected,
} from '../../lib/sdsButtonClasses'

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
            className={
              active ? sdsPillMdSelected : sdsPillMdUnselected
            }
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
