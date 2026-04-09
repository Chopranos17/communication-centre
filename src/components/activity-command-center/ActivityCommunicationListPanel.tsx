import {
  CHANNEL_META,
  STATUS_ROW_LABEL,
  channelKeyFromApi,
  initials,
  type ActivityStatusKey,
} from '../../lib/activityPresentation'
import { formatRelativeTime } from '../../lib/relativeTime'
import type { ActivityListItemDto } from '../../api/activityCommandCenterClient'
import { sdsButtonSecondarySm } from '../../lib/sdsButtonClasses'

function rowKey(row: ActivityListItemDto): string {
  return `${row.candidateId}:${row.jobId}`
}

export function ActivityCommunicationListPanel({
  items,
  total,
  page,
  limit,
  selectedKey,
  onSelect,
  onPageChange,
  isLoading,
  error,
  listSummaryText,
}: {
  items: ActivityListItemDto[]
  total: number
  page: number
  limit: number
  selectedKey: string | null
  onSelect: (row: ActivityListItemDto) => void
  onPageChange: (page: number) => void
  isLoading: boolean
  error: string | null
  /** e.g. "Showing 10 of 45 messages" */
  listSummaryText: string
}) {
  const start = total === 0 ? 0 : (page - 1) * limit + 1
  const end = Math.min(page * limit, total)
  const canPrev = page > 1
  const canNext = page * limit < total

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <p className="mb-2 text-[12px] text-[var(--text-label)]">{listSummaryText}</p>

      <div className="min-h-0 flex-1 overflow-hidden rounded-sds-12 border-[0.5px] border-[#e0e0e0] bg-white shadow-[var(--elevation-1)]">
        <div className="scrollbar-sleek max-h-[min(70vh,720px)] overflow-auto">
          {error ? (
            <div className="p-4 text-[length:var(--body-m)] text-[#d32f2f]">
              {error}
            </div>
          ) : isLoading ? (
            <ul className="m-0 list-none divide-y divide-[#e0e0e0] p-0">
              {Array.from({ length: 6 }, (_, i) => (
                <li key={i} className="flex gap-3 px-4 py-3">
                  <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-[var(--charcoal-50)]" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-3.5 w-1/2 animate-pulse rounded-sds-2 bg-[var(--charcoal-50)]" />
                    <div className="h-3 w-2/3 animate-pulse rounded-sds-2 bg-[var(--charcoal-50)]" />
                    <div className="h-3 w-full animate-pulse rounded-sds-2 bg-[var(--charcoal-50)]" />
                  </div>
                </li>
              ))}
            </ul>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center">
              <p className="max-w-sm text-[length:var(--body-m)] text-[#4d4d4d]">
                No communications match your filters. Try adjusting the filters
                above.
              </p>
            </div>
          ) : (
            <ul className="m-0 list-none divide-y divide-[#e0e0e0] p-0">
              {items.map((row) => {
                const key = rowKey(row)
                const selected = key === selectedKey
                const ch = CHANNEL_META[channelKeyFromApi(row.channel)]
                const st = STATUS_ROW_LABEL[row.status as ActivityStatusKey]
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => onSelect(row)}
                      className={[
                        'flex w-full gap-3 px-4 py-3 text-left transition-colors',
                        selected
                          ? 'bg-[var(--charcoal-20)]'
                          : 'bg-white hover:bg-[var(--charcoal-5)]',
                      ].join(' ')}
                    >
                      <div
                        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E6F3FF] text-[11px] font-medium text-[#014F99]"
                        aria-hidden
                      >
                        {initials(row.candidateName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-baseline justify-between gap-2">
                          <span className="truncate text-[13px] font-medium text-[#131313]">
                            {row.candidateName}
                          </span>
                          <time
                            className="shrink-0 text-[11px] text-[#797979]"
                            dateTime={row.sentAt}
                          >
                            {formatRelativeTime(row.sentAt)}
                          </time>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-[#378ADD]">
                          {row.jobTitle}
                        </p>
                        <p className="mt-1 truncate text-[12px] leading-snug text-[#4d4d4d]">
                          {row.preview}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={st.className}>{st.label}</span>
                          <span
                            className={`inline-flex items-center rounded-[20px] border bg-white px-2 py-0.5 text-[11px] font-medium ${ch.className}`}
                          >
                            {ch.label}
                          </span>
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {!isLoading && !error && total > 0 ? (
        <div className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
          <p className="text-[12px] text-[#4d4d4d]">
            Showing {start}–{end} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={sdsButtonSecondarySm}
              disabled={!canPrev}
              onClick={() => onPageChange(page - 1)}
            >
              Prev
            </button>
            <button
              type="button"
              className={sdsButtonSecondarySm}
              disabled={!canNext}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
