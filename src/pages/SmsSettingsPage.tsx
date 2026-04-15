import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Clock,
  MessageSquareText,
  Server,
  ShieldCheck,
  UserX,
  Webhook,
} from 'lucide-react'
import { MetricsBar, type MetricItem } from '../components/analytics/MetricsBar'
import { PageHeader } from '../components/layout/PageHeader'
import {
  fetchAdminSmsNumbers,
  fetchSmsAdminConfig,
  fetchSmsOptOutSummary,
  type SmsAdminConfig,
  type SmsNumberAdminRow,
  type SmsOptOutSummary,
} from '../api/smsAdminClient'
import {
  sdsDataTable,
  sdsDataTableHeadRow,
  sdsDataTableRow,
  sdsDataTableShell,
  sdsDataTableTd,
  sdsDataTableTh,
} from '../lib/sdsTableClasses'

const ICON_STROKE = {
  fill: 'none' as const,
  strokeWidth: 1.8 as const,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const cardClass =
  'rounded-sds-12 border-[0.5px] border-[#e0e0e0] bg-white p-5 shadow-[var(--elevation-1)]'

function formatTypeLabel(type: string): string {
  const t = type.toLowerCase()
  if (t === 'dedicated') return 'Dedicated'
  if (t === 'shared') return 'Shared'
  return type
}

function TypeBadge({ type }: { type: string }) {
  const t = type.toLowerCase()
  const isDedicated = t === 'dedicated'
  return (
    <span
      className={[
        'inline-flex rounded-full px-2 py-0.5 text-[12px] font-medium',
        isDedicated
          ? 'bg-[#E8F6F0] text-[#1D9E75]'
          : 'bg-[#E8F0FE] text-[#014F99]',
      ].join(' ')}
    >
      {formatTypeLabel(type)}
    </span>
  )
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={[
        'inline-flex rounded-full px-2 py-0.5 text-[12px] font-medium',
        active ? 'bg-[#E8F6F0] text-[#1D9E75]' : 'bg-[#F5F5F5] text-[#666]',
      ].join(' ')}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

function ComplianceStatusPill({ label, variant }: { label: string; variant: 'ok' | 'neutral' }) {
  return (
    <span
      className={[
        'inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium',
        variant === 'ok' ? 'bg-[#E8F6F0] text-[#1D9E75]' : 'bg-[#F5F5F5] text-[#4d4d4d]',
      ].join(' ')}
    >
      {label}
    </span>
  )
}

export function SmsSettingsPage() {
  const [numbers, setNumbers] = useState<SmsNumberAdminRow[]>([])
  const [summary, setSummary] = useState<SmsOptOutSummary | null>(null)
  const [config, setConfig] = useState<SmsAdminConfig | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoadError(null)
    setLoading(true)
    try {
      const [n, s, c] = await Promise.all([
        fetchAdminSmsNumbers(),
        fetchSmsOptOutSummary(),
        fetchSmsAdminConfig(),
      ])
      setNumbers(n)
      setSummary(s)
      setConfig(c)
    } catch {
      setLoadError('Could not load SMS settings.')
      setNumbers([])
      setSummary(null)
      setConfig(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const metrics: MetricItem[] = useMemo(() => {
    const s = summary
    return [
      {
        label: 'Consent granted',
        value: s ? String(s.granted) : '\u2014',
        icon: <CheckCircle2 {...ICON_STROKE} aria-hidden />,
        iconColor: '#1D9E75',
        haloColor: 'rgba(29,158,117,0.22)',
      },
      {
        label: 'Consent pending',
        value: s ? String(s.pending) : '\u2014',
        icon: <Clock {...ICON_STROKE} aria-hidden />,
        iconColor: '#D4A030',
        haloColor: 'rgba(245,195,100,0.3)',
      },
      {
        label: 'Opted out',
        value: s ? String(s.optedOut) : '\u2014',
        icon: <UserX {...ICON_STROKE} aria-hidden />,
        iconColor: '#888888',
        haloColor: 'rgba(136,136,136,0.2)',
      },
    ]
  }, [summary])

  return (
    <>
      <header className="w-full shrink-0 border-b-[0.5px] border-[#e0e0e0] bg-white">
        <PageHeader
          variant="strip"
          className="mx-auto w-full max-w-screen-xl px-6 py-3"
          title="SMS Settings"
          titleSizeClassName="text-[length:calc(var(--title-s)-2px)] leading-[29px]"
          marginBottom={false}
        />
      </header>

      <div className="mx-auto flex w-full min-w-0 max-w-screen-xl flex-col gap-4 px-6 pb-8 pt-6">
        {loadError ? (
          <p className="text-[length:var(--body-m)] text-[#d32f2f]" role="alert">
            {loadError}
          </p>
        ) : null}

        <section aria-label="SMS consent overview">
          <MetricsBar metrics={metrics} isLoading={loading} />
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className={cardClass} aria-labelledby="a2p-heading">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sds-8 bg-[#E8F0FE] text-[#014F99]">
                <ShieldCheck size={22} strokeWidth={1.8} aria-hidden />
              </div>
              <div className="min-w-0">
                <h2
                  id="a2p-heading"
                  className="text-[length:var(--body-l)] font-semibold text-[var(--text-title)]"
                >
                  A2P 10DLC compliance
                </h2>
                <p className="mt-1 text-[13px] leading-snug text-[#4d4d4d]">
                  Mock registration status for demo. Replace with live Twilio Trust Hub data in
                  production.
                </p>
              </div>
            </div>
            <dl className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-sds-8 border-[0.5px] border-[#e8e8e8] bg-[#fafafa] px-3 py-3">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-[#888]">
                  Brand
                </dt>
                <dd className="mt-2">
                  <ComplianceStatusPill label="Verified" variant="ok" />
                </dd>
              </div>
              <div className="rounded-sds-8 border-[0.5px] border-[#e8e8e8] bg-[#fafafa] px-3 py-3">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-[#888]">
                  Campaign
                </dt>
                <dd className="mt-2">
                  <ComplianceStatusPill label="Approved" variant="ok" />
                </dd>
              </div>
              <div className="rounded-sds-8 border-[0.5px] border-[#e8e8e8] bg-[#fafafa] px-3 py-3">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-[#888]">
                  Trust score
                </dt>
                <dd className="mt-2 text-[22px] font-semibold tabular-nums text-[#131313]">
                  {loading ? '\u2014' : String(config?.compliance.trustScore ?? 82)}
                </dd>
              </div>
            </dl>
          </section>

          <section className={cardClass} aria-labelledby="delivery-heading">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sds-8 bg-[#F0F7FF] text-[#0183FF]">
                {config?.smsInboundMode === 'webhook' ? (
                  <Webhook size={22} strokeWidth={1.8} aria-hidden />
                ) : (
                  <Server size={22} strokeWidth={1.8} aria-hidden />
                )}
              </div>
              <div className="min-w-0">
                <h2
                  id="delivery-heading"
                  className="text-[length:var(--body-l)] font-semibold text-[var(--text-title)]"
                >
                  Delivery configuration
                </h2>
                <p className="mt-1 text-[13px] leading-snug text-[#4d4d4d]">
                  Inbound SMS ingestion mode and status callback base URL.
                </p>
              </div>
            </div>
            <dl className="space-y-3 text-[13px]">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#f0f0f0] pb-3">
                <dt className="text-[#4d4d4d]">Inbound mode</dt>
                <dd className="font-medium text-[#131313]">
                  {loading
                    ? '\u2014'
                    : config?.smsInboundMode === 'webhook'
                      ? 'Webhook (Twilio POST)'
                      : 'Polling (Twilio API)'}
                </dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <dt className="text-[#4d4d4d]">Webhook base URL</dt>
                <dd className="max-w-full break-all font-mono text-[12px] text-[#131313]">
                  {loading
                    ? '\u2014'
                    : config?.webhookBaseUrl?.trim()
                      ? config.webhookBaseUrl
                      : 'Not set'}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <section className={cardClass} aria-labelledby="numbers-heading">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sds-8 bg-[#E8F6F0] text-[#1D9E75]">
              <MessageSquareText size={22} strokeWidth={1.8} aria-hidden />
            </div>
            <h2
              id="numbers-heading"
              className="text-[length:var(--body-l)] font-semibold text-[var(--text-title)]"
            >
              Phone numbers
            </h2>
          </div>
          <div className={sdsDataTableShell}>
            <table className={`${sdsDataTable} min-w-[640px]`}>
              <thead>
                <tr className={sdsDataTableHeadRow}>
                  <th className={sdsDataTableTh}>Number</th>
                  <th className={sdsDataTableTh}>Label</th>
                  <th className={`${sdsDataTableTh} w-[120px]`}>Type</th>
                  <th className={sdsDataTableTh}>Assigned to</th>
                  <th className={`${sdsDataTableTh} w-[100px]`}>Status</th>
                </tr>
              </thead>
              <tbody>
                {numbers.map((row) => (
                  <tr key={row.id} className={sdsDataTableRow}>
                    <td className={`min-w-0 font-mono text-[13px] ${sdsDataTableTd}`}>
                      {row.phone_number}
                    </td>
                    <td className={`min-w-0 ${sdsDataTableTd}`}>
                      {row.display_label?.trim() || '—'}
                    </td>
                    <td className={`align-top ${sdsDataTableTd}`}>
                      <TypeBadge type={row.number_type} />
                    </td>
                    <td className={`min-w-0 ${sdsDataTableTd}`}>
                      {row.assigned_to_name?.trim() ||
                        row.assigned_to_id?.trim() ||
                        '—'}
                    </td>
                    <td className={`align-top ${sdsDataTableTd}`}>
                      <ActiveBadge active={row.is_active} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && numbers.length === 0 && !loadError ? (
              <p className="p-6 text-center text-[length:var(--body-m)] text-[var(--text-label)]">
                No SMS numbers configured.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </>
  )
}
