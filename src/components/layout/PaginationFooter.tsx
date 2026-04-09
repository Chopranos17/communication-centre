import type { ReactNode } from 'react'
import { sdsButtonSecondarySm } from '../../lib/sdsButtonClasses'
import { sdsSelect } from '../../lib/sdsFormClasses'

type PaginationFooterProps = {
  from: number
  to: number
  total: number
}

export function PaginationFooter({ from, to, total }: PaginationFooterProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] px-4 py-3 text-[length:var(--body-m)] text-[var(--text-label)] sm:flex-row sm:items-center sm:justify-between">
      <p className="tabular-nums">
        {from} - {to} of {total.toLocaleString()} Records
      </p>
      <div className="flex flex-wrap items-center justify-center gap-1">
        <PageBtn label="Previous page" disabled>
          ‹
        </PageBtn>
        <span className="inline-flex min-w-[2rem] items-center justify-center rounded border border-[var(--border-default)] bg-[var(--charcoal-5)] px-2 py-1 text-[var(--text-body)]">
          1
        </span>
        <PageBtn label="Next page" disabled>
          ›
        </PageBtn>
      </div>
      <div className="flex items-center justify-center gap-2 sm:justify-end">
        <span className="text-[var(--text-label-lighter)]">Rows per page</span>
        <select
          className={sdsSelect}
          aria-label="Rows per page"
          defaultValue={10}
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
      </div>
    </div>
  )
}

function PageBtn({
  children,
  label,
  disabled,
}: {
  children: ReactNode
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      className={`${sdsButtonSecondarySm} disabled:opacity-40`}
    >
      {children}
    </button>
  )
}
