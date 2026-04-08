import type { ReactNode } from 'react'

type ListToolbarProps = {
  searchPlaceholder: string
  end?: ReactNode
}

export function ListToolbar({ searchPlaceholder, end }: ListToolbarProps) {
  return (
    <div className="mb-4 flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative min-w-0 w-full flex-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--icon-default)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        <input
          type="search"
          placeholder={searchPlaceholder}
          className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] py-2 pl-10 pr-3 text-[length:var(--body-m)] text-[var(--text-body)] placeholder:text-[var(--text-ghost)] shadow-none focus:border-[var(--border-active)] focus:outline-none focus:ring-1 focus:ring-[var(--blue-500)]"
          aria-label="Search"
        />
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <ToolbarIconButton label="Filter" badge>
          <path
            d="M4 6h16M7 12h10M10 18h4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </ToolbarIconButton>
        <ToolbarIconButton label="Columns" badge>
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
          <path
            d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </ToolbarIconButton>
        <ToolbarIconButton label="View">
          <path
            d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
        </ToolbarIconButton>
        <ToolbarIconButton label="Export">
          <path
            d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </ToolbarIconButton>
        {end}
      </div>
    </div>
  )
}

function ToolbarIconButton({
  label,
  badge,
  children,
}: {
  label: string
  badge?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className="relative flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-[var(--icon-default)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--icon-hover)]"
      aria-label={label}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        {children}
      </svg>
      {badge ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--blue-500)] px-0.5 text-[10px] font-medium leading-none text-[var(--white)]">
          1
        </span>
      ) : null}
    </button>
  )
}
