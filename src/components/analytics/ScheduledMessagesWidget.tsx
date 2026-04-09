/*
 * SQL reference:
 *
 * -- Scheduled communications + scheduled meetings (needs JOIN)
 * SELECT c.id, c.candidate_id, c.channel, c.subject, c.scheduled_at,
 *   cand.first_name, cand.last_name
 * FROM communication c
 *   JOIN candidate cand ON c.candidate_id = cand.id
 * WHERE c.job_opening_id IN (user_span_job_ids)
 *   AND c.delivery_status = 'scheduled'
 *   AND c.scheduled_at > NOW()
 * UNION ALL
 * SELECT c.id, c.candidate_id, 'meeting', m.title, m.scheduled_at,
 *   cand.first_name, cand.last_name
 * FROM meeting m
 *   JOIN communication c ON c.id = m.communication_id
 *   JOIN candidate cand ON c.candidate_id = cand.id
 * WHERE c.job_opening_id IN (user_span_job_ids)
 *   AND m.status = 'scheduled' AND m.scheduled_at > NOW()
 * ORDER BY scheduled_at ASC LIMIT 5;
 */

import { Link } from 'react-router-dom'
import { CHANNEL_META, channelKeyFromApi } from '../../lib/activityPresentation'

export interface ScheduledItem {
  communicationId: string
  candidateId: string
  candidateName: string
  channel: string
  subject: string
  scheduledAt: string
}

export interface ScheduledMessagesProps {
  items: ScheduledItem[]
  totalQueued: number
  isLoading?: boolean
}

const linkFocusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-[#0183FF] focus-visible:ring-offset-1'

const skeletonPulse = `
  @keyframes scheduled-msgs-skeleton-pulse {
    0%, 100% { background-color: var(--charcoal-50, #E9E9E9); }
    50% { background-color: var(--charcoal-20, #F2F2F2); }
  }
  .scheduled-msgs-skeleton-pulse {
    animation: scheduled-msgs-skeleton-pulse 1.2s ease-in-out infinite;
  }
`

function threadPath(candidateId: string, communicationId: string): string {
  const base = `/recruitment/candidates/${candidateId}`
  return `${base}?tab=communications&thread=${encodeURIComponent(communicationId)}`
}

function dayLabelFor(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(d)
  target.setHours(0, 0, 0, 0)
  const diffMs = target.getTime() - today.getTime()
  const diffDays = Math.round(diffMs / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function timeLabelFor(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function channelBadgeLabel(raw: string): string {
  const lower = raw.trim().toLowerCase()
  if (lower === 'meeting' || lower === '1:1' || lower === '1:1 meeting') {
    return '1:1'
  }
  const key = channelKeyFromApi(lower)
  if (key === 'meeting') return '1:1'
  return CHANNEL_META[key].label
}

function channelBadgeClasses(raw: string): string {
  const lower = raw.trim().toLowerCase()
  const key =
    lower === 'meeting' || lower === '1:1' || lower === '1:1 meeting'
      ? 'meeting'
      : channelKeyFromApi(lower)
  return CHANNEL_META[key].className
}

export function ScheduledMessagesWidget({
  items,
  totalQueued,
  isLoading = false,
}: ScheduledMessagesProps) {
  const rows = items.slice(0, 5)

  return (
    <>
      <style>{skeletonPulse}</style>
      <section
        className="w-full rounded-sds-12 border-[0.5px] border-[#e0e0e0] bg-white p-5 shadow-[var(--elevation-1)]"
        aria-labelledby="scheduled-msgs-heading"
      >
        <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2
              id="scheduled-msgs-heading"
              className="text-[15px] font-medium leading-tight text-[#131313]"
            >
              Scheduled
            </h2>
            <p className="mt-0.5 text-[12px] leading-snug text-[#4d4d4d]">
              Upcoming messages
            </p>
          </div>
          {isLoading ? (
            <div
              className="scheduled-msgs-skeleton-pulse h-7 w-[5.5rem] shrink-0 rounded-sds-8"
              aria-hidden
            />
          ) : (
            <span
              className="inline-flex shrink-0 items-center rounded-sds-8 border border-[#CCE6FF] bg-[#E6F3FF] px-2.5 py-1 text-[12px] font-medium text-[#0183FF]"
              aria-live="polite"
            >
              {totalQueued} queued
            </span>
          )}
        </div>

        {isLoading ? (
          <ul className="mt-0 list-none p-0">
            {Array.from({ length: 5 }, (_, i) => (
              <li
                key={i}
                className="flex items-center gap-2.5 border-b-[0.5px] border-[#e0e0e0] py-3 last:border-b-0"
              >
                <div className="scheduled-msgs-skeleton-pulse h-8 w-[54px] shrink-0 rounded-sds-2" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="scheduled-msgs-skeleton-pulse h-3 w-[40%] rounded-sds-2" />
                  <div className="scheduled-msgs-skeleton-pulse h-3 w-[70%] rounded-sds-2" />
                </div>
                <div className="scheduled-msgs-skeleton-pulse h-6 w-14 shrink-0 rounded-full" />
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-[length:var(--body-m)] text-[#4d4d4d]">
            No scheduled messages.
          </p>
        ) : (
          <ul className="mt-0 list-none p-0">
            {rows.map((item) => {
              const to = threadPath(item.candidateId, item.communicationId)
              const badgeLabel = channelBadgeLabel(item.channel)
              const badgeCls = channelBadgeClasses(item.channel)
              return (
                <li
                  key={`${item.communicationId}-${item.scheduledAt}`}
                  className="border-b-[0.5px] border-[#e0e0e0] last:border-b-0"
                >
                  <Link
                    to={to}
                    className={`flex items-center gap-2.5 py-3 transition-colors hover:bg-[#fafafa] ${linkFocusRing} rounded-sds-2`}
                  >
                    <div className="flex min-w-[54px] shrink-0 flex-col">
                      <span className="text-[11px] text-[#797979]">
                        {dayLabelFor(item.scheduledAt)}
                      </span>
                      <time
                        className="text-[11px] font-medium text-[#4d4d4d]"
                        dateTime={item.scheduledAt}
                      >
                        {timeLabelFor(item.scheduledAt)}
                      </time>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium text-[#131313]">
                        {item.candidateName}
                      </p>
                      <p
                        className="truncate text-[11px] text-[#4d4d4d]"
                        title={item.subject}
                      >
                        {item.subject}
                      </p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full border bg-white px-2.5 py-0.5 text-[11px] font-medium ${badgeCls}`}
                    >
                      {badgeLabel}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </>
  )
}
