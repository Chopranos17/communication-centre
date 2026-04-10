import type { ReactNode } from 'react'
import type { ScheduledMessageDto } from '../../api/commsHubDashboardClient'
import {
  scheduledChannelBadgeClasses,
  scheduledChannelBadgeLabel,
  scheduledDayLabel,
  scheduledTimeLabel,
} from './scheduledMessageUi'

export function ScheduledMessageRowView({
  item,
  trailing,
}: {
  item: ScheduledMessageDto
  trailing?: ReactNode
}) {
  const badgeLabel = scheduledChannelBadgeLabel(item.channel)
  const badgeCls = scheduledChannelBadgeClasses(item.channel)

  return (
    <div className="flex items-center gap-2.5 py-3">
      <div className="flex min-w-[54px] shrink-0 flex-col">
        <span className="text-[11px] text-[var(--text-label-lighter,#797979)]">
          {scheduledDayLabel(item.scheduledAt)}
        </span>
        <time
          className="text-[12px] font-medium text-[var(--text-label,#4d4d4d)]"
          dateTime={item.scheduledAt}
        >
          {scheduledTimeLabel(item.scheduledAt)}
        </time>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium text-[#131313]">
          {item.candidateName}
        </p>
        <p
          className="truncate text-[11px] text-[var(--text-label-lighter,#797979)]"
          title={item.subject}
        >
          {item.subject}
        </p>
      </div>
      <span
        className={`inline-flex shrink-0 items-center rounded-[20px] border bg-white px-2.5 py-0.5 text-[11px] font-medium ${badgeCls}`}
      >
        {badgeLabel}
      </span>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  )
}
