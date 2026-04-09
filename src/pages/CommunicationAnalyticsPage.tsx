import { useMemo } from 'react'
import { BarChart3, Clock, MessageSquareText, UserPlus, Users } from 'lucide-react'
import { MetricsBar, type MetricItem } from '../components/analytics/MetricsBar'
import {
  RecentActivityWidget,
  type ActivityItem,
} from '../components/analytics/RecentActivityWidget'
import { PageHeader } from '../components/layout/PageHeader'
import {
  formatActiveCandidatesCount,
  formatAvgFirstResponseTime,
  formatMessagesSentCount,
  formatResponseRate,
} from '../lib/metricsBarFormat'

const ICON_STROKE = {
  fill: 'none' as const,
  strokeWidth: 1.8 as const,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

/** Demo feed only — replace with API-driven activities (IDs are not guaranteed to exist in DB). */
function buildDemoActivities(): ActivityItem[] {
  const t = (msAgo: number) => new Date(Date.now() - msAgo).toISOString()
  return [
    {
      communicationId: 'demo-comm-priya-1',
      candidateId: 'demo-cand-priya',
      candidateName: 'Priya Sharma',
      jobId: 'demo-job-sse',
      jobTitle: 'Sr. Software Engineer',
      currentStage: 'Interview',
      channel: 'email',
      direction: 'inbound',
      preview: 'Thanks for the update on the interview timeline. I appreciate the quick response.',
      status: 'engaged',
      sentAt: t(12 * 60 * 1000),
    },
    {
      communicationId: 'demo-comm-arjun-1',
      candidateId: 'demo-cand-arjun',
      candidateName: 'Arjun Mehta',
      jobId: 'demo-job-pm',
      jobTitle: 'Product Manager',
      currentStage: 'Offer',
      channel: 'email',
      direction: 'outbound',
      preview: 'Hi Arjun, please find the offer letter attached. Let us know if you have any questions.',
      status: 'pending',
      sentAt: t(2 * 60 * 60 * 1000),
    },
    {
      communicationId: 'demo-comm-sneha-1',
      candidateId: 'demo-cand-sneha',
      candidateName: 'Sneha Rao',
      jobId: 'demo-job-ux',
      jobTitle: 'UX Designer',
      currentStage: 'Screening',
      channel: 'whatsapp',
      direction: 'outbound',
      preview: 'Hi Sneha, following up on your application — are you still interested in the UX Designer role?',
      status: 'unresponsive',
      sentAt: t(5 * 24 * 60 * 60 * 1000),
    },
    {
      communicationId: 'demo-comm-rahul-1',
      candidateId: 'demo-cand-rahul',
      candidateName: 'Rahul Gupta',
      jobId: 'demo-job-da',
      jobTitle: 'Data Analyst',
      currentStage: 'Interview',
      channel: 'meeting',
      direction: 'outbound',
      preview: 'Technical Interview 2 — scheduled for Thursday 3 PM. Calendar invite attached.',
      status: 'pending',
      sentAt: t(26 * 60 * 60 * 1000),
    },
    {
      communicationId: 'demo-comm-ananya-1',
      candidateId: 'demo-cand-ananya',
      candidateName: 'Ananya Iyer',
      jobId: 'demo-job-ml',
      jobTitle: 'ML Engineer',
      currentStage: 'Screening',
      channel: 'sms',
      direction: 'inbound',
      preview: 'Received assessment link, will complete it by Friday EOD.',
      status: 'engaged',
      sentAt: t(4 * 60 * 60 * 1000),
    },
  ]
}

export function CommunicationAnalyticsPage() {
  const metrics: MetricItem[] = useMemo(
    () => [
      {
        label: 'Messages sent',
        value: formatMessagesSentCount(3482),
        icon: <MessageSquareText {...ICON_STROKE} aria-hidden />,
        iconColor: '#E07070',
        haloColor: 'rgba(240,128,128,0.25)',
      },
      {
        label: 'Response rate',
        value: formatResponseRate(41.57),
        icon: <Users {...ICON_STROKE} aria-hidden />,
        iconColor: '#D4A030',
        haloColor: 'rgba(245,195,100,0.3)',
      },
      {
        label: 'Avg first response time',
        value: formatAvgFirstResponseTime(4.2 * 60),
        icon: <Clock {...ICON_STROKE} aria-hidden />,
        iconColor: '#5DADE2',
        haloColor: 'rgba(133,193,233,0.3)',
      },
      {
        label: 'Active candidates',
        value: formatActiveCandidatesCount(847),
        icon: <UserPlus {...ICON_STROKE} aria-hidden />,
        iconColor: '#52BE80',
        haloColor: 'rgba(130,224,170,0.25)',
      },
    ],
    [],
  )

  const demoActivities = useMemo(() => buildDemoActivities(), [])

  return (
    <div className="flex w-full min-w-0 flex-col">
      <PageHeader title="Communication Analytics" />
      <p className="-mt-1 mb-6 text-[length:var(--body-m)] text-[#4d4d4d]">
        Aggregated communication metrics across all job openings under your span
      </p>

      <MetricsBar metrics={metrics} isLoading={false} />

      <div className="mt-6">
        <RecentActivityWidget activities={demoActivities} unresponsiveCount={3} isLoading={false} />
      </div>

      <div className="mt-10 flex flex-col items-center gap-2 px-4 py-8 text-center">
        <BarChart3
          className="h-10 w-10 text-[#aaaaaa]"
          strokeWidth={1.5}
          aria-hidden
          style={{ opacity: 0.4 }}
        />
        <p className="text-sm text-[#4d4d4d]">Additional analytics views coming soon</p>
      </div>
    </div>
  )
}
