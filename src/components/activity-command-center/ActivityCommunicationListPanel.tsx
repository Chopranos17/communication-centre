import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ACTIVITY_STATUS_DOT,
  CHANNEL_META,
  SMS_VIA_LINE_MUTED_CLASS,
  STATUS_STYLES,
  channelKeyFromApi,
  formatSmsViaLineLabel,
  initials,
  truncatePreview,
  type ActivityStatusKey,
} from '../../lib/activityPresentation'
import { formatRelativeTime } from '../../lib/relativeTime'
import type { ActivityListItemDto } from '../../api/activityCommandCenterClient'
import { sdsButtonSecondarySm } from '../../lib/sdsButtonClasses'
import type { ActivityPrimaryActionType } from '../../utils/communicationTimeline'

function rowKey(row: ActivityListItemDto): string {
  return `${row.candidateId}:${row.jobId}`
}

function DirectionArrow({ inbound }: { inbound: boolean }) {
  if (inbound) {
    return (
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <path
          d="M12 4v16M5 11l7 7 7-7"
          stroke="#1D9E75"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      className="text-[var(--text-label-lighter)]"
      aria-hidden
    >
      <path
        d="M12 20V4M5 13l7-7 7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const thClass =
  'border-b-[0.5px] border-[var(--border-tertiary)] px-[14px] py-3 text-left text-[11px] font-medium uppercase tracking-[0.5px] text-[var(--text-label)]'

const tdClass = 'px-[14px] py-3 align-middle'

const linkFocusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-[#0183FF] focus-visible:ring-offset-1'

const primaryBtnClass = [
  'inline-flex shrink-0 items-center justify-center rounded-[2px]',
  'border-[0.5px] border-[var(--border-secondary)] bg-white',
  'px-[14px] py-1 text-[12px] font-medium leading-tight text-[#131313]',
  'transition-colors hover:bg-[var(--color-background-secondary)]',
  'disabled:pointer-events-none disabled:opacity-50',
  linkFocusRing,
].join(' ')

const overflowBtnClass = [
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-none',
  'border-0 bg-transparent text-[#797979] transition-colors',
  'text-[18px] font-bold leading-none tracking-tight',
  'hover:bg-[var(--color-background-secondary)] hover:text-[#131313]',
  linkFocusRing,
].join(' ')

const menuClass =
  'absolute right-0 top-full z-10 mt-0.5 min-w-[200px] rounded-none border-[0.5px] border-[var(--border-tertiary)] bg-white py-1 shadow-[var(--elevation-2)]'

const menuItemClass =
  'flex w-full items-center px-[14px] py-2 text-left text-[12px] text-[#131313] transition-colors hover:bg-[var(--color-background-secondary)]'

function primaryButtonLabel(action: ActivityPrimaryActionType): string {
  switch (action) {
    case 'reply':
      return 'Reply'
    case 'followup':
      return 'Follow up'
    default:
      return 'View messages'
  }
}

export function ActivityCommunicationListPanel({
  items,
  total,
  page,
  limit,
  onPageChange,
  isLoading,
  error,
  listSummaryText,
  onOpenCommunicationsPanel,
  onPrimaryAction,
  primaryActionLoadingId = null,
  onViewThisMessage,
}: {
  items: ActivityListItemDto[]
  total: number
  page: number
  limit: number
  onPageChange: (page: number) => void
  isLoading: boolean
  error: string | null
  /** e.g. "Showing 10 of 45 messages" */
  listSummaryText: string
  /** Opens the Communications side panel (same as dashboard widget). */
  onOpenCommunicationsPanel?: (row: ActivityListItemDto) => void
  /** Reply / Follow up / View messages — parent opens compose or panel. */
  onPrimaryAction?: (row: ActivityListItemDto) => void
  /** When set, primary button shows busy state for this communication id. */
  primaryActionLoadingId?: string | null
  /** Opens panel and focuses this message (message detail). */
  onViewThisMessage?: (row: ActivityListItemDto) => void
}) {
  const start = total === 0 ? 0 : (page - 1) * limit + 1
  const end = Math.min(page * limit, total)
  const canPrev = page > 1
  const canNext = page * limit < total
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const menuId = useId()

  useEffect(() => {
    if (!openMenuId) return
    const onDoc = (e: MouseEvent) => {
      const root = document.querySelector(
        `[data-activity-table-menu="${openMenuId}"]`,
      )
      if (root && !root.contains(e.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [openMenuId])

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <p className="mb-2 text-[12px] text-[var(--text-label)]">{listSummaryText}</p>

      <div className="min-h-0 flex-1 overflow-hidden rounded-sds-12 border-[0.5px] border-[var(--border-tertiary)] bg-white shadow-[var(--elevation-1)]">
        <div className="scrollbar-sleek max-h-[min(70vh,720px)] overflow-auto">
          {error ? (
            <div className="p-4 text-[length:var(--body-m)] text-[#d32f2f]">
              {error}
            </div>
          ) : isLoading ? (
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col style={{ width: '20%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '27%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '15%' }} />
              </colgroup>
              <tbody>
                {Array.from({ length: 6 }, (_, i) => (
                  <tr
                    key={i}
                    className="border-b-[0.5px] border-[var(--border-tertiary)] last:border-b-0"
                  >
                    <td className={tdClass}>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-[var(--charcoal-50)]" />
                        <div className="h-3.5 min-w-0 flex-1 animate-pulse rounded-sds-2 bg-[var(--charcoal-50)]" />
                      </div>
                    </td>
                    <td className={tdClass}>
                      <div className="h-3 w-3/4 animate-pulse rounded-sds-2 bg-[var(--charcoal-50)]" />
                    </td>
                    <td className={tdClass}>
                      <div className="h-3 w-full animate-pulse rounded-sds-2 bg-[var(--charcoal-50)]" />
                    </td>
                    <td className={tdClass}>
                      <div className="h-3 w-16 animate-pulse rounded-sds-2 bg-[var(--charcoal-50)]" />
                    </td>
                    <td className={tdClass}>
                      <div className="h-5 w-14 animate-pulse rounded-[20px] bg-[var(--charcoal-50)]" />
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <div className="ml-auto h-3 w-12 animate-pulse rounded-sds-2 bg-[var(--charcoal-50)]" />
                    </td>
                    <td className={tdClass}>
                      <div className="flex justify-end gap-1">
                        <div className="h-7 w-[88px] animate-pulse rounded-[2px] bg-[var(--charcoal-50)]" />
                        <div className="h-8 w-8 animate-pulse rounded-none bg-[var(--charcoal-50)]" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center">
              <p className="max-w-sm text-[length:var(--body-m)] text-[#4d4d4d]">
                No communications match your filters. Try adjusting the filters
                above.
              </p>
            </div>
          ) : (
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col style={{ width: '20%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '27%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '15%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col" className={thClass}>
                    Candidate
                  </th>
                  <th scope="col" className={thClass}>
                    Job opening
                  </th>
                  <th scope="col" className={thClass}>
                    Last message
                  </th>
                  <th scope="col" className={thClass}>
                    Status
                  </th>
                  <th scope="col" className={thClass}>
                    Channel
                  </th>
                  <th scope="col" className={`${thClass} text-right`}>
                    Time
                  </th>
                  <th scope="col" className={`${thClass} text-right`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const key = rowKey(row)
                  const ch = CHANNEL_META[channelKeyFromApi(row.channel)]
                  const st = STATUS_STYLES[row.status as ActivityStatusKey]
                  const dot = ACTIVITY_STATUS_DOT[row.status as ActivityStatusKey]
                  const inbound = row.direction === 'inbound'
                  const candidatePath = `/recruitment/candidates/${encodeURIComponent(row.candidateId)}`
                  const jobPath = `/recruitment/jobs/${encodeURIComponent(row.jobId)}`
                  const menuOpen = openMenuId === row.communicationId
                  const menuIdThis = `${menuId}-${row.communicationId}`
                  const primaryLabel = primaryButtonLabel(row.primaryAction)
                  const loadingPrimary =
                    primaryActionLoadingId === row.communicationId
                  const smsVia =
                    channelKeyFromApi(row.channel) === 'sms'
                      ? formatSmsViaLineLabel(row.smsNumber ?? null)
                      : null

                  return (
                    <tr
                      key={key}
                      className="border-b-[0.5px] border-[var(--border-tertiary)] bg-white transition-colors last:border-b-0 hover:bg-[var(--color-background-secondary)]"
                    >
                      <td className={tdClass}>
                        <div className="flex min-w-0 items-center gap-2">
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E6F3FF] text-[11px] font-medium text-[#014F99]"
                            aria-hidden
                          >
                            {initials(row.candidateName)}
                          </div>
                          <span className="min-w-0 truncate text-[13px] font-medium text-[#131313]">
                            {row.candidateName}
                          </span>
                        </div>
                      </td>
                      <td className={tdClass}>
                        <Link
                          to={`/recruitment/jobs/${encodeURIComponent(row.jobId)}`}
                          className="block min-w-0 truncate text-[12px] text-[#378ADD] hover:underline"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          {row.jobTitle}
                        </Link>
                      </td>
                      <td className={`${tdClass} max-w-0`}>
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span className="shrink-0 pt-0.5">
                              <DirectionArrow inbound={inbound} />
                            </span>
                            <span className="min-w-0 truncate text-[12px] text-[#4d4d4d]">
                              {truncatePreview(row.preview)}
                            </span>
                          </div>
                          {smsVia ? (
                            <p
                              className={`truncate pl-[17px] ${SMS_VIA_LINE_MUTED_CLASS}`}
                            >
                              {smsVia}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td className={tdClass}>
                        <span className="inline-flex items-center gap-1">
                          <span
                            className="h-[6px] w-[6px] shrink-0 rounded-full"
                            style={{ backgroundColor: dot }}
                            aria-hidden
                          />
                          <span
                            className="text-[12px] font-medium"
                            style={{ color: dot }}
                          >
                            {st.label}
                          </span>
                        </span>
                      </td>
                      <td className={tdClass}>
                        <span
                          className={`inline-flex max-w-full items-center truncate rounded-[20px] border bg-white px-2 py-0.5 text-[11px] font-medium ${ch.className}`}
                        >
                          {ch.label}
                        </span>
                      </td>
                      <td className={`${tdClass} text-right`}>
                        <time
                          className="text-[12px] text-[var(--text-label-lighter)]"
                          dateTime={row.sentAt}
                        >
                          {formatRelativeTime(row.sentAt)}
                        </time>
                      </td>
                      <td className={tdClass}>
                        <div
                          className="relative flex items-center justify-end gap-1"
                          data-activity-table-menu={row.communicationId}
                        >
                          <button
                            type="button"
                            className={primaryBtnClass}
                            disabled={loadingPrimary}
                            aria-busy={loadingPrimary}
                            onClick={() => onPrimaryAction?.(row)}
                          >
                            {loadingPrimary ? (
                              <span
                                className="inline-block h-3 w-12 animate-pulse bg-[#cccccc]"
                                aria-hidden
                              />
                            ) : (
                              primaryLabel
                            )}
                          </button>
                          <div className="relative">
                            <button
                              type="button"
                              className={overflowBtnClass}
                              aria-expanded={menuOpen}
                              aria-haspopup="menu"
                              aria-controls={menuOpen ? menuIdThis : undefined}
                              aria-label={`More actions for ${row.candidateName}`}
                              onClick={() =>
                                setOpenMenuId((id) =>
                                  id === row.communicationId
                                    ? null
                                    : row.communicationId,
                                )
                              }
                            >
                              <span aria-hidden className="block translate-y-[-1px]">
                                ⋮
                              </span>
                            </button>
                            {menuOpen ? (
                              <div
                                id={menuIdThis}
                                className={menuClass}
                                role="menu"
                              >
                                {row.primaryAction !== 'view' ? (
                                  onOpenCommunicationsPanel ? (
                                    <button
                                      type="button"
                                      className={`${menuItemClass} ${linkFocusRing} rounded-none`}
                                      role="menuitem"
                                      onClick={() => {
                                        setOpenMenuId(null)
                                        onOpenCommunicationsPanel(row)
                                      }}
                                    >
                                      View messages
                                    </button>
                                  ) : (
                                    <Link
                                      to={`${candidatePath}?tab=communications`}
                                      className={`${menuItemClass} ${linkFocusRing} rounded-none`}
                                      role="menuitem"
                                      onClick={() => setOpenMenuId(null)}
                                    >
                                      View messages
                                    </Link>
                                  )
                                ) : null}
                                <Link
                                  to={candidatePath}
                                  className={`${menuItemClass} ${linkFocusRing} rounded-none`}
                                  role="menuitem"
                                  onClick={() => setOpenMenuId(null)}
                                >
                                  View candidate profile
                                </Link>
                                <Link
                                  to={jobPath}
                                  className={`${menuItemClass} ${linkFocusRing} rounded-none`}
                                  role="menuitem"
                                  onClick={() => setOpenMenuId(null)}
                                >
                                  View job opening
                                </Link>
                                {onViewThisMessage ? (
                                  <button
                                    type="button"
                                    className={`${menuItemClass} ${linkFocusRing} rounded-none`}
                                    role="menuitem"
                                    onClick={() => {
                                      setOpenMenuId(null)
                                      onViewThisMessage(row)
                                    }}
                                  >
                                    View this message
                                  </button>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
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
