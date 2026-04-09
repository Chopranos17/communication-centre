/*
 * SQL reference:
 *
 * SELECT channel, COUNT(*) AS msg_count
 * FROM communication
 * WHERE direction = 'outbound'
 *   AND job_opening_id IN (user_span_job_ids)
 *   AND sent_at BETWEEN :period_start AND :period_end
 *   AND channel != 'system_notification'
 * GROUP BY channel;
 */

import { useMemo } from 'react'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { Doughnut } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip)

export interface ChannelMixProps {
  channels: Array<{ channel: string; count: number; color: string }>
  isLoading?: boolean
}

const skeletonPulse = `
  @keyframes channel-mix-skeleton-pulse {
    0%, 100% { background-color: var(--charcoal-50, #E9E9E9); }
    50% { background-color: var(--charcoal-20, #F2F2F2); }
  }
  .channel-mix-skeleton-pulse {
    animation: channel-mix-skeleton-pulse 1.2s ease-in-out infinite;
  }
`

export function ChannelMixWidget({ channels, isLoading = false }: ChannelMixProps) {
  const active = useMemo(
    () => channels.filter((c) => c.count > 0),
    [channels],
  )
  const total = useMemo(
    () => active.reduce((s, c) => s + c.count, 0),
    [active],
  )

  const chartData: ChartData<'doughnut'> = useMemo(() => {
    return {
      labels: active.map((c) => c.channel),
      datasets: [
        {
          data: active.map((c) => c.count),
          backgroundColor: active.map((c) => c.color),
          borderWidth: 0,
        },
      ],
    }
  }, [active])

  const chartOptions: ChartOptions<'doughnut'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const v = ctx.parsed
              const pct =
                total > 0 ? Math.round((Number(v) / total) * 100) : 0
              return ` ${ctx.label}: ${pct}%`
            },
          },
        },
      },
    }),
    [total],
  )

  return (
    <>
      <style>{skeletonPulse}</style>
      <section
        className="w-full rounded-sds-12 border-[0.5px] border-[#e0e0e0] bg-white p-5 shadow-[var(--elevation-1)]"
        aria-labelledby="channel-mix-heading"
      >
        <div className="mb-1">
          <h2
            id="channel-mix-heading"
            className="text-[15px] font-medium leading-tight text-[#131313]"
          >
            Channel mix
          </h2>
          <p className="mt-0.5 text-[12px] leading-snug text-[#4d4d4d]">
            Messages by channel
          </p>
        </div>

        {isLoading ? (
          <div
            className="flex h-[150px] w-full items-center justify-center"
            aria-hidden
          >
            <div className="channel-mix-skeleton-pulse h-[120px] w-[120px] rounded-full" />
          </div>
        ) : total === 0 ? (
          <div className="flex h-[150px] w-full items-center justify-center text-center">
            <p className="text-[length:var(--body-m)] text-[#4d4d4d]">
              No messages in this period.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              {active.map((c) => {
                const pct = Math.round((c.count / total) * 100)
                return (
                  <div
                    key={c.channel}
                    className="flex items-center gap-1.5 text-[11px] text-[#131313]"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-sds-2"
                      style={{ backgroundColor: c.color }}
                      aria-hidden
                    />
                    <span>{c.channel}</span>
                    <span className="text-[#4d4d4d]">{pct}%</span>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 h-[150px] w-full">
              <Doughnut data={chartData} options={chartOptions} />
            </div>
          </>
        )}
      </section>
    </>
  )
}
