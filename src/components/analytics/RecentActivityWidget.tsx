/*
 * SQL reference (conceptual column names; align with Prisma `Communication`, `Candidate`, `Job`):
 *
 * -- Recent activity feed (5 most recent communications)
 * ...
 */

import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { Inbox } from 'lucide-react'
import { formatRelativeTime } from '../../lib/relativeTime'
import {
  ACTIVITY_STATUS_DOT,
  CHANNEL_META,
  STATUS_STYLES,
  initials,
  truncatePreview,
  type ActivityChannelKey,
  type ActivityStatusKey,
} from '../../lib/activityPresentation'
import type { ActivityPrimaryActionType } from '../../utils/communicationTimeline'

export interface ActivityItem {
  communicationId: string
  candidateId: string
  candidateName: string
  candidateEmail: string
  candidatePhone: string
  candidateWhatsapp: string
  jobId: string
  jobTitle: string
  jobCode: string
  currentStage: string
  channel: ActivityChannelKey
  direction: 'inbound' | 'outbound'
  preview: string
  status: ActivityStatusKey
  sentAt: string
  primaryAction: ActivityPrimaryActionType
}

export interface PrimaryAction {
  label: 'Reply' | 'Follow up' | 'View messages'
  type: 'reply' | 'followup' | 'view'
}

function primaryActionDisplay(
  action: ActivityPrimaryActionType,
): PrimaryAction {
  switch (action) {
    case 'reply':
      return { type: 'reply', label: 'Reply' }
    case 'followup':
      return { type: 'followup', label: 'Follow up' }
    default:
      return { type: 'view', label: 'View messages' }
  }
}

export interface RecentActivityWidgetProps {
  activities: ActivityItem[]
  isLoading?: boolean
  /** Opens the Communications side panel (same as Communications tab context). */
  onOpenCommunicationsPanel?: (item: ActivityItem) => void
  /** Reply / Follow up / View messages — parent opens compose or panel. */
  onPrimaryAction?: (item: ActivityItem) => void
  /** When set, primary button shows busy state for this communication id. */
  primaryActionLoadingId?: string | null
  /** Opens panel and focuses this message in the timeline (message detail). */
  onViewThisMessage?: (item: ActivityItem) => void
}

const linkFocusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-[#0183FF] focus-visible:ring-offset-1'

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

const pipeCls = 'text-[11px] text-[#aaaaaa] select-none'
const primaryBtnClass = [
  'inline-flex shrink-0 items-center justify-center rounded-none',
  'border-[0.5px] border-[var(--border-secondary)] bg-white',
  'px-3 py-1.5 text-[12px] font-medium leading-tight text-[#131313]',
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

export function RecentActivityWidget({
  activities,
  isLoading = false,
  onOpenCommunicationsPanel,
  onPrimaryAction,
  primaryActionLoadingId = null,
  onViewThisMessage,
}: RecentActivityWidgetProps) {
  const rows = activities.slice(0, 5)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const menuId = useId()

  useEffect(() => {
    if (!openMenuId) return
    const onDoc = (e: MouseEvent) => {
      const root = document.querySelector(
        `[data-recent-activity-menu="${openMenuId}"]`,
      )
      if (root && !root.contains(e.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [openMenuId])

  return (
    <>
      <style>
        {`
          @keyframes recent-activity-skeleton-pulse {
            0%, 100% { background-color: var(--charcoal-50, #E9E9E9); }
            50% { background-color: var(--charcoal-20, #F2F2F2); }
          }
          .recent-activity-skeleton-pulse {
            animation: recent-activity-skeleton-pulse 1.2s ease-in-out infinite;
          }
        `}
      </style>
      <section
        className="w-full rounded-sds-12 border-[0.5px] border-[#e0e0e0] bg-white p-5 shadow-[var(--elevation-1)]"
        aria-labelledby="recent-activity-heading"
      >
        <div className="mb-1 flex items-center justify-between gap-3">
          <h2
            id="recent-activity-heading"
            className="min-w-0 text-[15px] font-medium leading-tight text-[#131313]"
          >
            Recent activity
          </h2>
          <Link
            to="/recruitment/communication-hub/activity"
            className={`shrink-0 text-[12px] font-normal leading-tight text-[#666666] transition-colors hover:text-[#131313] ${linkFocusRing} rounded-sds-2`}
          >
            View all
          </Link>
        </div>

        {isLoading ? (
          <ul className="mt-0 list-none p-0">
            {Array.from({ length: 5 }, (_, i) => (
              <li
                key={i}
                className="flex gap-3 border-b-[0.5px] border-[#e0e0e0] py-3 last:border-b-0"
              >
                <div className="recent-activity-skeleton-pulse mt-0.5 h-9 w-9 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                  <div className="recent-activity-skeleton-pulse h-3.5 w-[45%] max-w-xs rounded-sds-2" />
                  <div className="recent-activity-skeleton-pulse h-3 w-full max-w-lg rounded-sds-2" />
                  <div className="recent-activity-skeleton-pulse h-3 w-[70%] max-w-md rounded-sds-2" />
                </div>
                <div className="flex shrink-0 items-center gap-1 pt-0.5">
                  <div className="recent-activity-skeleton-pulse h-8 w-[88px] rounded-none" />
                  <div className="recent-activity-skeleton-pulse h-8 w-8 rounded-none" />
                </div>
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Inbox className="h-10 w-10 text-[#aaaaaa]" strokeWidth={1.5} aria-hidden />
            <p className="text-[length:var(--body-m)] text-[#4d4d4d]">No recent communications</p>
          </div>
        ) : (
          <ul className="mt-0 list-none p-0">
            {rows.map((item) => {
              const ch = CHANNEL_META[item.channel]
              const st = STATUS_STYLES[item.status]
              const dot = ACTIVITY_STATUS_DOT[item.status]
              const candidatePath = `/recruitment/candidates/${encodeURIComponent(item.candidateId)}`
              const jobPath = `/recruitment/jobs/${encodeURIComponent(item.jobId)}`
              const preview = truncatePreview(item.preview)
              const menuOpen = openMenuId === item.communicationId
              const menuIdThis = `${menuId}-${item.communicationId}`
              const primary = primaryActionDisplay(item.primaryAction)
              const loadingPrimary = primaryActionLoadingId === item.communicationId

              return (
                <li
                  key={item.communicationId}
                  className="flex gap-3 border-b-[0.5px] border-[#e0e0e0] py-3 last:border-b-0"
                >
                  <div
                    className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E6F3FF] text-[11px] font-medium text-[#014F99]"
                    aria-hidden
                  >
                    {initials(item.candidateName)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium leading-snug text-[#131313]">
                      {item.candidateName}
                    </p>

                    <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-snug">
                      <span className="inline-flex items-center gap-1">
                        <span
                          className="h-[5px] w-[5px] shrink-0 rounded-full"
                          style={{ backgroundColor: dot }}
                          aria-hidden
                        />
                        <span
                          className="font-medium"
                          style={{ color: dot }}
                        >
                          {st.label}
                        </span>
                      </span>
                      <span className={pipeCls} aria-hidden>
                        |
                      </span>
                      <Link
                        to={jobPath}
                        className={`min-w-0 truncate font-normal text-[#378ADD] hover:underline ${linkFocusRing} rounded-sds-2`}
                        title={item.jobTitle}
                      >
                        {item.jobTitle}
                      </Link>
                      <span className={pipeCls} aria-hidden>
                        |
                      </span>
                      <span
                        className={`inline-flex max-w-[min(100%,9rem)] items-center truncate rounded-[20px] border bg-white px-2 py-0.5 font-medium ${ch.className}`}
                      >
                        {ch.label}
                      </span>
                      <span className={pipeCls} aria-hidden>
                        |
                      </span>
                      <time
                        className="shrink-0 font-normal text-[#797979]"
                        dateTime={item.sentAt}
                      >
                        {formatRelativeTime(item.sentAt)}
                      </time>
                    </div>

                    <div className="mt-1 flex min-w-0 items-start gap-1.5">
                      <span className="shrink-0 pt-0.5">
                        <DirectionArrow inbound={item.direction === 'inbound'} />
                      </span>
                      <span className="min-w-0 truncate text-[12px] leading-snug text-[#4d4d4d]">
                        {preview}
                      </span>
                    </div>
                  </div>

                  <div
                    className="relative flex shrink-0 items-start gap-1 pt-0.5"
                    data-recent-activity-menu={item.communicationId}
                  >
                    <button
                      type="button"
                      className={primaryBtnClass}
                      disabled={loadingPrimary}
                      aria-busy={loadingPrimary}
                      onClick={() => onPrimaryAction?.(item)}
                    >
                      {loadingPrimary ? (
                        <span
                          className="inline-block h-3 w-12 animate-pulse bg-[#cccccc]"
                          aria-hidden
                        />
                      ) : (
                        primary.label
                      )}
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        className={overflowBtnClass}
                        aria-expanded={menuOpen}
                        aria-haspopup="menu"
                        aria-controls={menuOpen ? menuIdThis : undefined}
                        aria-label={`More actions for ${item.candidateName}`}
                        onClick={() =>
                          setOpenMenuId((id) =>
                            id === item.communicationId ? null : item.communicationId,
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
                          {item.primaryAction !== 'view' ? (
                            onOpenCommunicationsPanel ? (
                              <button
                                type="button"
                                className={`${menuItemClass} ${linkFocusRing} rounded-none`}
                                role="menuitem"
                                onClick={() => {
                                  setOpenMenuId(null)
                                  onOpenCommunicationsPanel(item)
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
                                onViewThisMessage(item)
                              }}
                            >
                              View this message
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </>
  )
}
