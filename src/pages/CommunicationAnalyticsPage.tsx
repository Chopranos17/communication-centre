import { useMemo } from 'react'
import { BarChart3, Clock, MessageSquareText, UserPlus, Users } from 'lucide-react'
import { MetricsBar, type MetricItem } from '../components/analytics/MetricsBar'
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

  return (
    <div className="flex w-full min-w-0 flex-col">
      <PageHeader title="Communication Analytics" />
      <p className="-mt-1 mb-6 text-[length:var(--body-m)] text-[#4d4d4d]">
        Aggregated communication metrics across all job openings under your span
      </p>

      <MetricsBar metrics={metrics} isLoading={false} />

      <div className="mt-10 flex min-h-[min(320px,calc(100vh-22rem))] flex-col items-center justify-center gap-3 px-4 py-8 text-center">
        <BarChart3
          className="h-12 w-12 text-[#aaaaaa]"
          strokeWidth={1.5}
          aria-hidden
          style={{ opacity: 0.4 }}
        />
        <p className="text-[length:var(--body-m)] font-medium text-[#131313]">
          Analytics dashboard coming soon
        </p>
        <p className="max-w-md text-sm text-[#4d4d4d]">
          Communication insights and metrics will appear here
        </p>
      </div>
    </div>
  )
}
