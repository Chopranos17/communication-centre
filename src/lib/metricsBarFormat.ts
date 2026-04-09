/** Formatting helpers for Communication Analytics `MetricsBar` values (use from parent / API layer). */

export function formatMessagesSentCount(n: number): string {
  return Math.round(n).toLocaleString()
}

export function formatResponseRate(pct: number): string {
  return `${pct.toFixed(2)}%`
}

/**
 * @param minutesTotal — duration in minutes (e.g. from SQL AVG of interval)
 */
export function formatAvgFirstResponseTime(minutesTotal: number): string {
  const mins = minutesTotal
  if (mins < 60) {
    return `${Math.round(mins)}m`
  }
  const hrs = mins / 60
  if (hrs <= 48) {
    return `${hrs.toFixed(1)}h`
  }
  return `${Math.round(hrs / 24)}d`
}

export function formatActiveCandidatesCount(n: number): string {
  return Math.round(n).toLocaleString()
}
