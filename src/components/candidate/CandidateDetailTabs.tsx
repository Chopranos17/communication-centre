import {
  sdsTabBtnActive,
  sdsTabBtnBase,
  sdsTabBtnInactive,
  sdsTabStripContainer,
} from '../../lib/sdsButtonClasses'

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
      className={sdsTabStripContainer}
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
              sdsTabBtnBase,
              isActive ? sdsTabBtnActive : sdsTabBtnInactive,
            ].join(' ')}
          >
            {LABELS[id]}
          </button>
        )
      })}
    </div>
  )
}
