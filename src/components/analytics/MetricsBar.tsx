/*
 * SQL computation reference (SQLite / Prisma `Communication` model — column names
 * align conceptually; use `job_id` + span filter in app code as needed):
 *
 * -- 1. Messages sent
 * SELECT COUNT(*) FROM communication
 * WHERE direction = 'outbound'
 *   AND job_opening_id IN (user_span_job_ids)
 *   AND sent_at BETWEEN :period_start AND :period_end;
 *
 * -- 2. Response rate (denominator = candidates messaged in selected period only)
 * SELECT
 *   COUNT(DISTINCT CASE WHEN has_reply THEN candidate_id END)::float
 *   / NULLIF(COUNT(DISTINCT candidate_id), 0) * 100
 * FROM communication
 * WHERE direction = 'outbound'
 *   AND job_opening_id IN (user_span_job_ids)
 *   AND sent_at BETWEEN :period_start AND :period_end;
 *
 * -- 3. Avg first response time (excludes no-reply threads — complementary to response rate)
 * SELECT AVG(first_reply_at - last_outbound_at)
 * FROM (
 *   SELECT candidate_id,
 *     MAX(CASE WHEN direction='outbound' THEN sent_at END) AS last_outbound_at,
 *     MIN(CASE WHEN direction='inbound' THEN sent_at END) AS first_reply_at
 *   FROM communication
 *   WHERE job_opening_id IN (user_span_job_ids)
 *     AND sent_at BETWEEN :period_start AND :period_end
 *   GROUP BY candidate_id
 *   HAVING MIN(CASE WHEN direction='inbound' THEN sent_at END) IS NOT NULL
 * ) t;
 *
 * -- 4. Active candidates (any communication event, either direction)
 * SELECT COUNT(DISTINCT candidate_id) FROM communication
 * WHERE job_opening_id IN (user_span_job_ids)
 *   AND sent_at BETWEEN :period_start AND :period_end;
 *
 * Note: The communication table includes all channels (email, sms, whatsapp, meeting,
 * system_notification) via communication.channel. Meeting invites are rows with
 * channel = 'meeting'. No JOIN to the meeting table is needed for aggregate counts.
 */

import type { ReactNode } from 'react'

export interface MetricItem {
  label: string
  value: string
  icon: ReactNode
  iconColor: string
  haloColor: string
}

export interface MetricsBarProps {
  metrics: MetricItem[]
  isLoading?: boolean
}

function isDisplayedValueEmpty(displayed: string): boolean {
  const v = displayed.replace(/,/g, '').trim()
  if (!v || v === '\u2014' || v === '-') return true
  return false
}

function allMetricsEmpty(metrics: MetricItem[]): boolean {
  return metrics.length > 0 && metrics.every((m) => isDisplayedValueEmpty(m.value))
}

export function MetricsBar({ metrics, isLoading = false }: MetricsBarProps) {
  const showEmDash = allMetricsEmpty(metrics)

  return (
    <>
      <style>
        {`
          @keyframes metrics-bar-skeleton-pulse {
            0%, 100% { background-color: var(--charcoal-50, #E9E9E9); }
            50% { background-color: var(--charcoal-20, #F2F2F2); }
          }
          .metrics-bar-skeleton-pulse {
            animation: metrics-bar-skeleton-pulse 1.2s ease-in-out infinite;
          }
        `}
      </style>
      <section
        className="relative w-full overflow-hidden rounded-sds-12 border-[0.5px] border-[#e0e0e0] bg-white px-10 pb-10 pt-8 shadow-[var(--elevation-1)]"
        aria-label="Communication Hub metrics summary"
      >
        <svg
          className="pointer-events-none absolute bottom-0 left-0 h-[80px] w-full"
          viewBox="0 0 1200 80"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="M0 55 C200 30, 350 70, 500 50 S750 20, 900 45 S1050 65, 1200 40 L1200 80 L0 80Z"
            fill="#D6EAF8"
            opacity="0.35"
          />
          <path
            d="M0 62 C150 45, 300 75, 500 58 S700 35, 850 55 S1000 70, 1200 50 L1200 80 L0 80Z"
            fill="#AED6F1"
            opacity="0.25"
          />
          <path
            d="M0 70 C180 58, 400 78, 600 65 S800 50, 1000 68 S1100 75, 1200 60 L1200 80 L0 80Z"
            fill="#85C1E9"
            opacity="0.18"
          />
        </svg>

        <div className="relative z-[1] grid w-full grid-cols-2 gap-0 gap-y-6 sm:grid-cols-4 sm:gap-y-0">
          {metrics.map((metric) => (
            <div key={metric.label} className="px-4">
              <div className="flex items-center gap-0">
                <div className="relative h-[28px] w-[28px] shrink-0">
                  <div
                    className="absolute rounded-[3px]"
                    style={{
                      width: 19,
                      height: 19,
                      top: 7,
                      left: 6,
                      background: metric.haloColor,
                    }}
                    aria-hidden
                  />
                  <div
                    className="absolute left-0 top-0 z-[1] h-6 w-6 [&_svg]:block [&_svg]:h-6 [&_svg]:w-6"
                    style={{ color: metric.iconColor }}
                  >
                    {metric.icon}
                  </div>
                </div>
                <div className="ml-0.5 min-w-0">
                  {isLoading ? (
                    <div
                      className="metrics-bar-skeleton-pulse inline-block h-8 min-w-[4.5rem] max-w-full rounded-sds-4"
                      style={{ width: '5.5rem' }}
                      aria-hidden
                    />
                  ) : (
                    <span className="block text-[28px] font-medium leading-none tracking-[-0.5px] text-[#131313]">
                      {showEmDash ? '\u2014' : metric.value}
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-1 text-[13px] leading-snug text-[#4d4d4d]">{metric.label}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
