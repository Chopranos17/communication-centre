import { useCallback, useEffect, useMemo, useState } from 'react'
import { Clock, MessageSquareText, UserPlus, Users } from 'lucide-react'
import { ChannelMixWidget } from '../components/analytics/ChannelMixWidget'
import { MetricsBar, type MetricItem } from '../components/analytics/MetricsBar'
import {
  RecentActivityWidget,
  type ActivityItem,
} from '../components/analytics/RecentActivityWidget'
import {
  ScheduledMessagesWidget,
  type ScheduledItem,
} from '../components/analytics/ScheduledMessagesWidget'
import { PageHeader } from '../components/layout/PageHeader'
import { fetchJobs, type JobListRow } from '../api/jobsClient'
import type { CommsHubDashboardDto } from '../api/commsHubDashboardClient'
import { useDashboardAnalytics } from '../hooks/useDashboardAnalytics'
import {
  CHANNEL_META,
  channelKeyFromApi,
  type ActivityChannelKey,
} from '../lib/activityPresentation'
import {
  formatActiveCandidatesCount,
  formatMessagesSentCount,
  formatResponseTime,
} from '../lib/metricsBarFormat'

const ICON_STROKE = {
  fill: 'none' as const,
  strokeWidth: 1.8 as const,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const channelColors: Record<string, string> = {
  email: '#378ADD',
  sms: '#1D9E75',
  whatsapp: '#BA7517',
  meeting: '#7F77DD',
}

export function CommunicationHubPage() {
  const [period, setPeriod] = useState<
    'week' | 'month' | 'quarter' | 'all'
  >('quarter')
  const [jobOpeningId, setJobOpeningId] = useState<string | undefined>(
    undefined,
  )
  const [jobs, setJobs] = useState<JobListRow[]>([])

  const { data, isLoading, error } = useDashboardAnalytics({
    period,
    jobOpeningId,
  })

  const loadJobs = useCallback(async () => {
    try {
      setJobs(await fetchJobs())
    } catch {
      setJobs([])
    }
  }, [])

  useEffect(() => {
    void loadJobs()
  }, [loadJobs])

  const metrics: MetricItem[] = useMemo(() => {
    const d = data
    return [
      {
        label: 'Messages sent',
        value: d
          ? formatMessagesSentCount(d.summary.messagesSent)
          : '\u2014',
        icon: <MessageSquareText {...ICON_STROKE} aria-hidden />,
        iconColor: '#E07070',
        haloColor: 'rgba(240,128,128,0.25)',
      },
      {
        label: 'Response rate',
        value:
          d?.summary.responseRate != null
            ? `${d.summary.responseRate.toFixed(2)}%`
            : '\u2014',
        icon: <Users {...ICON_STROKE} aria-hidden />,
        iconColor: '#D4A030',
        haloColor: 'rgba(245,195,100,0.3)',
      },
      {
        label: 'Avg first response time',
        value:
          d?.summary.avgResponseTimeHrs != null
            ? formatResponseTime(d.summary.avgResponseTimeHrs)
            : '\u2014',
        icon: <Clock {...ICON_STROKE} aria-hidden />,
        iconColor: '#5DADE2',
        haloColor: 'rgba(133,193,233,0.3)',
      },
      {
        label: 'Active candidates',
        value: d
          ? formatActiveCandidatesCount(d.summary.activeCandidates)
          : '\u2014',
        icon: <UserPlus {...ICON_STROKE} aria-hidden />,
        iconColor: '#52BE80',
        haloColor: 'rgba(130,224,170,0.25)',
      },
    ]
  }, [data])

  const channelMix = useMemo(() => {
    return (data?.channelDistribution ?? [])
      .filter((c: CommsHubDashboardDto['channelDistribution'][number]) => c.count > 0)
      .map((c: CommsHubDashboardDto['channelDistribution'][number]) => {
        const key = channelKeyFromApi(c.channel)
        return {
          channel: CHANNEL_META[key].label,
          count: c.count,
          color: channelColors[c.channel] ?? '#888888',
        }
      })
  }, [data])

  const activities: ActivityItem[] = useMemo(() => {
    return (data?.recentActivity ?? []).map(
      (a: CommsHubDashboardDto['recentActivity'][number]) => ({
      communicationId: a.communicationId,
      candidateId: a.candidateId,
      candidateName: a.candidateName,
      jobId: a.jobId,
      jobTitle: a.jobTitle,
      currentStage: a.currentStage,
      channel: channelKeyFromApi(a.channel) as ActivityChannelKey,
      direction: a.direction === 'inbound' ? 'inbound' : 'outbound',
      preview: a.preview,
      status: a.status,
      sentAt: a.sentAt,
    }),
    )
  }, [data])

  const scheduled: ScheduledItem[] = data?.scheduled ?? []

  const selectClass =
    'h-9 min-w-[128px] max-w-[min(100vw-8rem,200px)] rounded-sds-8 border-[0.5px] border-[#e0e0e0] bg-white px-3 py-1.5 text-[13px] text-[#131313] outline-none focus-visible:ring-2 focus-visible:ring-[#0183FF] focus-visible:ring-offset-1 sm:min-w-[140px]'

  const headerFilters = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <select
        className={selectClass}
        value={period}
        onChange={(e) => setPeriod(e.target.value as typeof period)}
        aria-label="Reporting period"
      >
        <option value="week">Week</option>
        <option value="month">Month</option>
        <option value="quarter">Quarter</option>
        <option value="all">All time</option>
      </select>
      <select
        className={`${selectClass} max-w-[min(100vw-6rem,280px)] sm:max-w-[280px]`}
        value={jobOpeningId ?? ''}
        onChange={(e) =>
          setJobOpeningId(e.target.value.trim() || undefined)
        }
        aria-label="Filter by job opening"
      >
        <option value="">All openings</option>
        {jobs.map((j) => (
          <option key={j.id} value={j.id}>
            {j.title} ({j.job_code})
          </option>
        ))}
      </select>
    </div>
  )

  return (
    <>
      <header className="w-full shrink-0 border-b-[0.5px] border-[#e0e0e0] bg-white">
        <PageHeader
          variant="strip"
          className="mx-auto w-full max-w-screen-xl px-6 py-3"
          title="Communication Hub"
          titleSizeClassName="text-[length:calc(var(--title-s)-2px)] leading-[29px]"
          trailing={headerFilters}
          marginBottom={false}
        />
      </header>

      <div className="mx-auto flex w-full min-w-0 max-w-screen-xl flex-col px-6 pb-6 pt-6">
        {error ? (
          <p className="mb-4 text-[length:var(--body-m)] text-[#d32f2f]" role="alert">
            {error}
          </p>
        ) : null}

        <MetricsBar metrics={metrics} isLoading={isLoading} />

        <div
          className="w-full"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 1fr)',
            gap: 16,
            marginTop: 16,
            alignItems: 'start',
          }}
        >
          <div className="min-w-0 w-full self-start">
            <RecentActivityWidget
              activities={activities}
              isLoading={isLoading}
            />
          </div>
          <div
            className="min-w-0 w-full"
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <ChannelMixWidget channels={channelMix} isLoading={isLoading} />
            <ScheduledMessagesWidget
              items={scheduled}
              totalQueued={data?.scheduledQueuedTotal ?? 0}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </>
  )
}
