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

import { useMemo } from 'react'
import type { ScheduledMessageDto } from '../../api/commsHubDashboardClient'
import { ScheduledMessageOverflowMenu } from './ScheduledMessageOverflowMenu'
import { ScheduledMessageRowView } from './ScheduledMessageRowView'

export type { ScheduledMessageDto }

const skeletonPulse = `
  @keyframes scheduled-msgs-skeleton-pulse {
    0%, 100% { background-color: var(--charcoal-50, #E9E9E9); }
    50% { background-color: var(--charcoal-20, #F2F2F2); }
  }
  .scheduled-msgs-skeleton-pulse {
    animation: scheduled-msgs-skeleton-pulse 1.2s ease-in-out infinite;
  }
`

export interface ScheduledMessagesProps {
  items: ScheduledMessageDto[]
  totalQueued: number
  isLoading?: boolean
  onViewAll: () => void
  onEditEmail: (item: ScheduledMessageDto) => void | Promise<void>
  onScheduledMutated: () => void | Promise<void>
  /** When false, overflow actions are hidden (matches Communications tab). */
  canManageRecruitment?: boolean
}

function sortByScheduledAtAsc(items: ScheduledMessageDto[]): ScheduledMessageDto[] {
  return [...items].sort(
    (a, b) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  )
}

export function ScheduledMessagesWidget({
  items,
  totalQueued,
  isLoading = false,
  onViewAll,
  onEditEmail,
  onScheduledMutated,
  canManageRecruitment = false,
}: ScheduledMessagesProps) {
  const rows = useMemo(
    () => sortByScheduledAtAsc(items).slice(0, 5),
    [items],
  )

  return (
    <>
      <style>{skeletonPulse}</style>
      <section
        className="w-full rounded-sds-12 border-[0.5px] border-[#e0e0e0] bg-white p-5 shadow-[var(--elevation-1)]"
        aria-labelledby="scheduled-msgs-heading"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2
              id="scheduled-msgs-heading"
              className="text-[15px] font-medium leading-tight text-[#131313]"
            >
              Scheduled
            </h2>
            {isLoading ? (
              <span
                className="scheduled-msgs-skeleton-pulse inline-block h-[5px] w-[5px] shrink-0 rounded-full bg-[var(--charcoal-50)]"
                aria-hidden
              />
            ) : (
              <span
                className="h-[5px] w-[5px] shrink-0 rounded-full bg-[#378ADD]"
                aria-hidden
              />
            )}
            {isLoading ? (
              <div
                className="scheduled-msgs-skeleton-pulse h-4 w-16 shrink-0 rounded-sds-2"
                aria-hidden
              />
            ) : (
              <span className="text-[12px] font-medium leading-tight text-[#185FA5]">
                {totalQueued} queued
              </span>
            )}
          </div>
          {isLoading ? (
            <div
              className="scheduled-msgs-skeleton-pulse h-5 w-14 shrink-0 rounded-sds-2"
              aria-hidden
            />
          ) : (
            <button
              type="button"
              className="shrink-0 text-[13px] font-normal text-[var(--text-link,#0183FF)] underline-offset-2 outline-none transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-[#0183FF] focus-visible:ring-offset-1"
              onClick={onViewAll}
            >
              View all
            </button>
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
                <div className="scheduled-msgs-skeleton-pulse h-8 w-8 shrink-0 rounded-sds-2" />
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-[length:var(--body-m)] text-[#4d4d4d]">
            No scheduled messages.
          </p>
        ) : (
          <ul className="mt-0 list-none p-0">
            {rows.map((item) => (
              <li
                key={`${item.communicationId}-${item.scheduledAt}`}
                className="border-b-[0.5px] border-[#e0e0e0] last:border-b-0"
              >
                <ScheduledMessageRowView
                  item={item}
                  trailing={
                    canManageRecruitment ? (
                      <ScheduledMessageOverflowMenu
                        item={item}
                        onEditEmail={onEditEmail}
                        onMutated={onScheduledMutated}
                      />
                    ) : null
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
