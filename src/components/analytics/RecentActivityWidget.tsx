/*
 * SQL reference (conceptual column names; align with Prisma `Communication`, `Candidate`, `Job`):
 *
 * -- Recent activity feed (5 most recent communications)
 * SELECT
 *   c.id AS communication_id, c.candidate_id, c.job_opening_id,
 *   c.channel, c.direction, LEFT(c.body, 120) AS preview,
 *   c.sent_at, cand.first_name, cand.last_name,
 *   cand.current_stage, jo.title AS job_title
 * FROM communication c
 *   JOIN candidate cand ON c.candidate_id = cand.id
 *   JOIN job_opening jo ON c.job_opening_id = jo.id
 * WHERE c.job_opening_id IN (user_span_job_ids)
 *   AND c.sent_at BETWEEN :period_start AND :period_end
 * ORDER BY c.sent_at DESC
 * LIMIT 5;
 *
 * -- Responsiveness status (derived per candidate-job pair)
 * -- 'engaged': last message is inbound (candidate replied)
 * -- 'pending': last message is outbound, within SLA threshold
 * -- 'unresponsive': last message is outbound, beyond SLA threshold
 */

import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, Inbox } from 'lucide-react'
import { formatRelativeTime } from '../../lib/relativeTime'
import {
  CHANNEL_META,
  STATUS_STYLES,
  initials,
  truncatePreview,
  type ActivityChannelKey,
  type ActivityStatusKey,
} from '../../lib/activityPresentation'

export interface ActivityItem {
  communicationId: string
  candidateId: string
  candidateName: string
  jobId: string
  jobTitle: string
  currentStage: string
  channel: ActivityChannelKey
  direction: 'inbound' | 'outbound'
  preview: string
  status: ActivityStatusKey
  sentAt: string
}

export interface RecentActivityWidgetProps {
  activities: ActivityItem[]
  unresponsiveCount: number
  isLoading?: boolean
}

/** Focus ring only — do not add border-radius here; `rounded-sds-2` would override `rounded-full` on avatars. */
const linkFocusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-[#0183FF] focus-visible:ring-offset-1'

const linkFocusInline = `${linkFocusRing} rounded-sds-2`

export function RecentActivityWidget({
  activities,
  unresponsiveCount,
  isLoading = false,
}: RecentActivityWidgetProps) {
  const rows = activities.slice(0, 5)

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
        <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              id="recent-activity-heading"
              className="text-[15px] font-medium leading-tight text-[#131313]"
            >
              Recent activity
            </h2>
            <p className="mt-0.5 text-[12px] leading-snug text-[#4d4d4d]">
              Latest communications across all openings
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <Link
              to="/recruitment/communication-analytics/activity?status=unresponsive"
              className={`inline-flex h-8 items-center rounded-full border border-[#FF2323] px-3 text-[12px] font-medium text-[#FF2323] transition-colors hover:bg-[#FFE9E9] ${linkFocusRing}`}
            >
              {unresponsiveCount} unresponsive
            </Link>
            <Link
              to="/recruitment/communication-analytics/activity"
              className={`inline-flex h-8 items-center rounded-full border border-[#e0e0e0] bg-white px-3 text-[12px] font-medium text-[#131313] transition-colors hover:bg-[#f5f5f5] ${linkFocusRing}`}
            >
              View all
            </Link>
          </div>
        </div>

        {isLoading ? (
          <ul className="mt-0 list-none p-0">
            {Array.from({ length: 5 }, (_, i) => (
              <li
                key={i}
                className="flex gap-3 border-b-[0.5px] border-[#e0e0e0] py-3 last:border-b-0"
              >
                <div className="recent-activity-skeleton-pulse h-9 w-9 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                  <div className="recent-activity-skeleton-pulse h-3.5 w-[70%] max-w-md rounded-sds-2" />
                  <div className="recent-activity-skeleton-pulse h-3 w-[85%] max-w-lg rounded-sds-2" />
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2 pt-0.5">
                  <div className="recent-activity-skeleton-pulse h-5 w-16 rounded-full" />
                  <div className="recent-activity-skeleton-pulse h-5 w-14 rounded-full" />
                  <div className="recent-activity-skeleton-pulse mt-1 h-3 w-12 rounded-sds-2" />
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
              const candidatePath = `/recruitment/candidates/${item.candidateId}`
              const jobPath = `/recruitment/jobs/${item.jobId}`
              const threadPath = `${candidatePath}?tab=communications&thread=${encodeURIComponent(item.communicationId)}`
              const preview = truncatePreview(item.preview)

              return (
                <li
                  key={item.communicationId}
                  className="flex gap-3 border-b-[0.5px] border-[#e0e0e0] py-3 last:border-b-0"
                >
                  <Link
                    to={candidatePath}
                    className={`relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E6F3FF] text-[11px] font-medium text-[#014F99] ${linkFocusRing}`}
                    aria-label={`${item.candidateName} profile`}
                  >
                    {initials(item.candidateName)}
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-1 leading-snug">
                      <Link
                        to={candidatePath}
                        className={`shrink-0 text-[13px] font-medium text-[#131313] ${linkFocusInline}`}
                      >
                        {item.candidateName}
                      </Link>
                      <span className="text-[11px] text-[#4d4d4d]" aria-hidden>
                        ·
                      </span>
                      <Link
                        to={jobPath}
                        className={`min-w-0 truncate text-[11px] text-[#378ADD] ${linkFocusInline}`}
                        title={item.jobTitle}
                      >
                        {item.jobTitle}
                      </Link>
                      <span className="text-[11px] text-[#4d4d4d]" aria-hidden>
                        ·
                      </span>
                      <span className="text-[11px] text-[#797979]">{item.currentStage}</span>
                    </div>
                    <Link
                      to={threadPath}
                      className={`mt-1 flex min-w-0 max-w-[420px] items-start gap-1 rounded-sds-2 text-left ${linkFocusRing}`}
                    >
                      {item.direction === 'inbound' ? (
                        <ArrowDown
                          className="mt-0.5 h-3 w-3 shrink-0 text-[#1D9E75]"
                          strokeWidth={2}
                          aria-hidden
                        />
                      ) : (
                        <ArrowUp
                          className="mt-0.5 h-3 w-3 shrink-0 text-[#aaaaaa]"
                          strokeWidth={2}
                          aria-hidden
                        />
                      )}
                      <span className="truncate text-[12px] leading-snug text-[#4d4d4d]">
                        {preview}
                      </span>
                    </Link>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${st.className}`}
                      >
                        {st.label}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full border bg-white px-2 py-0.5 text-[11px] font-medium ${ch.className}`}
                      >
                        {ch.label}
                      </span>
                    </div>
                    <time
                      className="min-w-[45px] text-right text-[11px] text-[#797979]"
                      dateTime={item.sentAt}
                    >
                      {formatRelativeTime(item.sentAt)}
                    </time>
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
