import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  CheckCircle2,
  Clock,
  MessageSquareText,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
  UserX,
  Webhook,
  X,
} from 'lucide-react'
import { MetricsBar, type MetricItem } from '../components/analytics/MetricsBar'
import { PageHeader } from '../components/layout/PageHeader'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { useToast } from '../contexts/ToastContext'
import {
  deactivateAdminSmsNumber,
  fetchAdminSmsNumbers,
  fetchAssignableSmsUsers,
  fetchSmsAdminConfig,
  fetchSmsOptOutSummary,
  patchSmsNumberAssign,
  provisionSmsNumber,
  searchAvailableSmsNumbers,
  syncSmsNumbersFromTwilio,
  type AssignableSmsUser,
  type AvailableSmsNumberHit,
  type SmsAdminConfig,
  type SmsNumberAdminRow,
  type SmsOptOutSummary,
} from '../api/smsAdminClient'
import {
  sdsButtonIconTertiarySm,
  sdsButtonPrimary,
  sdsButtonSecondary,
  sdsButtonTheme,
  sdsMenuItemBtn,
  sdsPillMdSelected,
  sdsPillMdUnselected,
} from '../lib/sdsButtonClasses'
import { sdsInput, sdsLabel, sdsSelectWFull } from '../lib/sdsFormClasses'
import {
  sdsModalBackdrop,
  sdsModalBody,
  sdsModalCloseButton,
  sdsModalContainer,
  sdsModalDismissLayer,
  sdsModalFooter,
  sdsModalHeader,
  sdsModalTitle,
} from '../lib/sdsModalClasses'
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

function portalEl(): HTMLElement | null {
  return document.getElementById('root')
}

export function SmsSettingsPage() {
  const { showToast } = useToast()
  const [numbers, setNumbers] = useState<SmsNumberAdminRow[]>([])
  const [summary, setSummary] = useState<SmsOptOutSummary | null>(null)
  const [config, setConfig] = useState<SmsAdminConfig | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [assignableUsers, setAssignableUsers] = useState<AssignableSmsUser[]>([])

  const [menuRowId, setMenuRowId] = useState<string | null>(null)
  const [assignRowId, setAssignRowId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const [rowSavingId, setRowSavingId] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addStep, setAddStep] = useState<'search' | 'configure'>('search')
  const [areaCodeInput, setAreaCodeInput] = useState('415')
  const [searching, setSearching] = useState(false)
  const [availableHits, setAvailableHits] = useState<AvailableSmsNumberHit[]>([])
  const [pickedHit, setPickedHit] = useState<AvailableSmsNumberHit | null>(null)
  const [provLabel, setProvLabel] = useState('')
  const [provAssignId, setProvAssignId] = useState('')
  const [provType, setProvType] = useState<'dedicated' | 'shared'>('dedicated')
  const [provisioning, setProvisioning] = useState(false)

  const [labelModalRow, setLabelModalRow] = useState<SmsNumberAdminRow | null>(null)
  const [labelDraft, setLabelDraft] = useState('')
  const [labelSaving, setLabelSaving] = useState(false)

  const [deactivateRow, setDeactivateRow] = useState<SmsNumberAdminRow | null>(null)
  const [deactivateSaving, setDeactivateSaving] = useState(false)

  const [assignDraftUserId, setAssignDraftUserId] = useState('')

  const load = useCallback(async () => {
    setLoadError(null)
    setLoading(true)
    try {
      const [n, s, c, u] = await Promise.all([
        fetchAdminSmsNumbers(),
        fetchSmsOptOutSummary(),
        fetchSmsAdminConfig(),
        fetchAssignableSmsUsers().catch(() => [] as AssignableSmsUser[]),
      ])
      setNumbers(n)
      setSummary(s)
      setConfig(c)
      setAssignableUsers(u)
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

  useEffect(() => {
    if (!assignRowId) {
      setAssignDraftUserId('')
      return
    }
    const row = numbers.find((r) => r.id === assignRowId)
    setAssignDraftUserId(row?.assigned_to_id?.trim() ?? '')
  }, [assignRowId, numbers])

  useEffect(() => {
    if (!menuRowId) return
    const onDoc = (ev: MouseEvent) => {
      const el = menuRef.current
      if (el && !el.contains(ev.target as Node)) setMenuRowId(null)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuRowId])

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

  const refreshRow = useCallback((updated: SmsNumberAdminRow) => {
    setNumbers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
  }, [])

  const handleTypeToggle = useCallback(
    async (row: SmsNumberAdminRow, next: 'dedicated' | 'shared') => {
      if (!row.is_active) return
      const cur = row.number_type.toLowerCase()
      if (cur === next) return
      setRowSavingId(row.id)
      try {
        const body =
          next === 'shared'
            ? { numberType: 'shared' as const }
            : {
                numberType: 'dedicated' as const,
                assignedToId: row.assigned_to_id,
                assignedToName: row.assigned_to_name,
              }
        const updated = await patchSmsNumberAssign(row.id, body)
        refreshRow(updated)
        showToast('success', next === 'shared' ? 'Line set to shared' : 'Line set to dedicated')
      } catch (e) {
        showToast('error', e instanceof Error ? e.message : 'Could not update type')
      } finally {
        setRowSavingId(null)
      }
    },
    [refreshRow, showToast],
  )

  const openAddModal = useCallback(() => {
    setAddModalOpen(true)
    setAddStep('search')
    setPickedHit(null)
    setAvailableHits([])
    setProvLabel('')
    setProvAssignId('')
    setProvType('dedicated')
  }, [])

  const closeAddModal = useCallback(() => {
    setAddModalOpen(false)
    setSearching(false)
    setProvisioning(false)
  }, [])

  const runSearch = useCallback(async () => {
    setSearching(true)
    try {
      const hits = await searchAvailableSmsNumbers({
        country: 'US',
        areaCode: areaCodeInput.trim() || undefined,
        limit: 20,
      })
      setAvailableHits(hits)
      if (hits.length === 0) {
        showToast('neutral', 'No numbers found for that search.')
      }
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }, [areaCodeInput, showToast])

  const runProvision = useCallback(async () => {
    if (!pickedHit) return
    const label = provLabel.trim() || pickedHit.phoneNumber
    const user = assignableUsers.find((u) => u.id === provAssignId)
    setProvisioning(true)
    try {
      const updated = await provisionSmsNumber({
        phoneNumber: pickedHit.phoneNumber,
        displayLabel: label,
        numberType: provType,
        assignedToId: provType === 'shared' ? null : user?.id ?? null,
        assignedToName: provType === 'shared' ? null : user?.name ?? null,
      })
      setNumbers((prev) => [...prev, updated])
      showToast('success', 'Number provisioned')
      closeAddModal()
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Provision failed')
    } finally {
      setProvisioning(false)
    }
  }, [
    assignableUsers,
    closeAddModal,
    pickedHit,
    provAssignId,
    provLabel,
    provType,
    showToast,
  ])

  const runSync = useCallback(async () => {
    setSyncing(true)
    try {
      const { imported, updatedSid } = await syncSmsNumbersFromTwilio()
      await load()
      if (imported > 0) {
        showToast('success', `Imported ${imported} new numbers`)
      } else if (updatedSid > 0) {
        showToast('success', `Linked ${updatedSid} existing line(s) to Twilio`)
      } else {
        showToast('neutral', 'All numbers already synced')
      }
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }, [load, showToast])

  const saveLabel = useCallback(async () => {
    if (!labelModalRow) return
    setLabelSaving(true)
    try {
      const updated = await patchSmsNumberAssign(labelModalRow.id, {
        displayLabel: labelDraft.trim() || null,
      })
      refreshRow(updated)
      showToast('success', 'Label updated')
      setLabelModalRow(null)
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Could not save label')
    } finally {
      setLabelSaving(false)
    }
  }, [labelDraft, labelModalRow, refreshRow, showToast])

  const confirmDeactivate = useCallback(async () => {
    if (!deactivateRow) return
    setDeactivateSaving(true)
    try {
      const updated = await deactivateAdminSmsNumber(deactivateRow.id)
      refreshRow(updated)
      showToast('success', 'Number deactivated')
      setDeactivateRow(null)
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Could not deactivate')
    } finally {
      setDeactivateSaving(false)
    }
  }, [deactivateRow, refreshRow, showToast])

  const saveAssign = useCallback(
    async (row: SmsNumberAdminRow) => {
      const u = assignableUsers.find((x) => x.id === assignDraftUserId.trim())
      if (!u) {
        showToast('error', 'Choose a user')
        return
      }
      setRowSavingId(row.id)
      try {
        const updated = await patchSmsNumberAssign(row.id, {
          assignedToId: u.id,
          assignedToName: u.name,
        })
        refreshRow(updated)
        showToast('success', 'Assignment saved')
        setAssignRowId(null)
      } catch (e) {
        showToast('error', e instanceof Error ? e.message : 'Could not assign')
      } finally {
        setRowSavingId(null)
      }
    },
    [assignDraftUserId, assignableUsers, refreshRow, showToast],
  )

  const modalRoot = portalEl()

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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
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
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={`${sdsButtonSecondary} inline-flex items-center gap-2`}
                onClick={() => void runSync()}
                disabled={syncing || loading}
              >
                {syncing ? (
                  <LoadingSpinner size="sm" aria-hidden />
                ) : (
                  <RefreshCw size={16} strokeWidth={1.8} aria-hidden />
                )}
                Sync from Twilio
              </button>
              <button
                type="button"
                className={`${sdsButtonTheme} inline-flex items-center gap-2`}
                onClick={openAddModal}
                disabled={loading}
              >
                <Plus size={16} strokeWidth={1.8} aria-hidden />
                Add number
              </button>
            </div>
          </div>
          <div className={sdsDataTableShell}>
            <table className={`${sdsDataTable} min-w-[860px]`}>
              <thead>
                <tr className={sdsDataTableHeadRow}>
                  <th className={sdsDataTableTh}>Number</th>
                  <th className={sdsDataTableTh}>Label</th>
                  <th className={`${sdsDataTableTh} w-[200px]`}>Type</th>
                  <th className={sdsDataTableTh}>Assigned to</th>
                  <th className={`${sdsDataTableTh} w-[100px]`}>Status</th>
                  <th className={`${sdsDataTableTh} w-[140px]`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {numbers.map((row) => (
                  <Fragment key={row.id}>
                    <tr className={sdsDataTableRow}>
                      <td className={`min-w-0 font-mono text-[13px] ${sdsDataTableTd}`}>
                        {row.phone_number}
                      </td>
                      <td className={`min-w-0 ${sdsDataTableTd}`}>
                        {row.display_label?.trim() || '—'}
                      </td>
                      <td className={`align-top ${sdsDataTableTd}`}>
                        {row.is_active ? (
                          <div className="flex flex-wrap items-center gap-1">
                            <button
                              type="button"
                              className={
                                row.number_type.toLowerCase() === 'dedicated'
                                  ? sdsPillMdSelected
                                  : sdsPillMdUnselected
                              }
                              disabled={rowSavingId === row.id}
                              onClick={() => void handleTypeToggle(row, 'dedicated')}
                            >
                              Dedicated
                            </button>
                            <button
                              type="button"
                              className={
                                row.number_type.toLowerCase() === 'shared'
                                  ? sdsPillMdSelected
                                  : sdsPillMdUnselected
                              }
                              disabled={rowSavingId === row.id}
                              onClick={() => void handleTypeToggle(row, 'shared')}
                            >
                              Shared
                            </button>
                            {rowSavingId === row.id ? (
                              <LoadingSpinner className="ml-1" size="sm" aria-hidden />
                            ) : null}
                          </div>
                        ) : (
                          <TypeBadge type={row.number_type} />
                        )}
                      </td>
                      <td className={`min-w-0 ${sdsDataTableTd}`}>
                        {row.assigned_to_name?.trim() ||
                          row.assigned_to_id?.trim() ||
                          '—'}
                      </td>
                      <td className={`align-top ${sdsDataTableTd}`}>
                        <ActiveBadge active={row.is_active} />
                      </td>
                      <td className={`relative align-top ${sdsDataTableTd}`}>
                        {row.is_active ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className={sdsButtonIconTertiarySm}
                              aria-label={`Assign number ${row.phone_number}`}
                              title="Assign"
                              onClick={() => {
                                setMenuRowId(null)
                                setAssignRowId((id) => (id === row.id ? null : row.id))
                              }}
                            >
                              <Pencil size={16} strokeWidth={1.8} aria-hidden />
                            </button>
                            <div className="relative" ref={menuRowId === row.id ? menuRef : undefined}>
                              <button
                                type="button"
                                className={sdsButtonIconTertiarySm}
                                aria-haspopup="menu"
                                aria-expanded={menuRowId === row.id}
                                aria-label="More actions"
                                onClick={() => {
                                  setAssignRowId(null)
                                  setMenuRowId((id) => (id === row.id ? null : row.id))
                                }}
                              >
                                <MoreVertical size={16} strokeWidth={1.8} aria-hidden />
                              </button>
                              {menuRowId === row.id ? (
                                <div
                                  className="absolute right-0 top-full z-30 mt-1 min-w-[180px] rounded-sds-8 border-[0.5px] border-[#e0e0e0] bg-white py-1 shadow-[var(--elevation-2)]"
                                  role="menu"
                                >
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className={sdsMenuItemBtn}
                                    onClick={() => {
                                      setMenuRowId(null)
                                      setLabelDraft(row.display_label?.trim() ?? '')
                                      setLabelModalRow(row)
                                    }}
                                  >
                                    Edit label
                                  </button>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className={sdsMenuItemBtn}
                                    onClick={() => {
                                      setMenuRowId(null)
                                      setDeactivateRow(row)
                                    }}
                                  >
                                    Deactivate
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[#aaaaaa]">—</span>
                        )}
                      </td>
                    </tr>
                    {assignRowId === row.id && row.is_active ? (
                      <tr className="bg-[#fafafa]">
                        <td colSpan={6} className="border-b border-[#e8e8e8] px-4 py-3">
                          <div className="flex flex-wrap items-end gap-3">
                            <div className="min-w-[220px] flex-1">
                              <label className={sdsLabel} htmlFor={`assign-${row.id}`}>
                                Assign to
                              </label>
                              <select
                                id={`assign-${row.id}`}
                                className={`${sdsSelectWFull} mt-1`}
                                value={assignDraftUserId}
                                onChange={(ev) => setAssignDraftUserId(ev.target.value)}
                              >
                                <option value="">Select user…</option>
                                {assignableUsers.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.name} ({u.role === 'hiring_lead' ? 'Hiring lead' : 'Recruiter'})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <button
                              type="button"
                              className={sdsButtonTheme}
                              disabled={rowSavingId === row.id}
                              onClick={() => void saveAssign(row)}
                            >
                              {rowSavingId === row.id ? (
                                <LoadingSpinner size="sm" aria-hidden />
                              ) : (
                                'Save'
                              )}
                            </button>
                            <button
                              type="button"
                              className={sdsButtonSecondary}
                              onClick={() => setAssignRowId(null)}
                            >
                              Close
                            </button>
                          </div>
                          <p className="mt-2 text-[12px] text-[#4d4d4d]">
                            Select a user and save to update this line.
                          </p>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
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

      {addModalOpen && modalRoot
        ? createPortal(
            <div className={sdsModalBackdrop} role="presentation">
              <button
                type="button"
                className={sdsModalDismissLayer}
                aria-label="Close"
                onClick={closeAddModal}
              />
              <div className={`${sdsModalContainer} max-w-lg`}>
                <div className={sdsModalHeader}>
                  <h2 className={sdsModalTitle}>
                    {addStep === 'search' ? 'Add SMS number' : 'Provision number'}
                  </h2>
                  <button
                    type="button"
                    className={sdsModalCloseButton}
                    aria-label="Close"
                    onClick={closeAddModal}
                  >
                    <X size={18} aria-hidden />
                  </button>
                </div>
                <div className={sdsModalBody}>
                  {addStep === 'search' ? (
                    <div className="space-y-4">
                      <div>
                        <label className={sdsLabel} htmlFor="ac-search">
                          Area code (US)
                        </label>
                        <div className="mt-1 flex gap-2">
                          <input
                            id="ac-search"
                            className={`${sdsInput} w-32`}
                            value={areaCodeInput}
                            onChange={(e) => setAreaCodeInput(e.target.value)}
                            placeholder="415"
                            maxLength={6}
                          />
                          <button
                            type="button"
                            className={sdsButtonTheme}
                            disabled={searching}
                            onClick={() => void runSearch()}
                          >
                            {searching ? <LoadingSpinner size="sm" aria-hidden /> : 'Search'}
                          </button>
                        </div>
                      </div>
                      <div className="max-h-[280px] space-y-2 overflow-y-auto rounded-sds-8 border border-[#e8e8e8]">
                        {availableHits.length === 0 ? (
                          <p className="p-4 text-[13px] text-[#4d4d4d]">
                            Search Twilio for available local numbers to buy.
                          </p>
                        ) : (
                          availableHits.map((h) => (
                            <div
                              key={h.phoneNumber}
                              className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0f0f0] px-3 py-2 last:border-0"
                            >
                              <div className="min-w-0">
                                <p className="font-mono text-[13px] text-[#131313]">
                                  {h.phoneNumber}
                                </p>
                                <p className="text-[12px] text-[#4d4d4d]">
                                  {[h.locality, h.region].filter(Boolean).join(', ') || '—'}
                                </p>
                              </div>
                              <button
                                type="button"
                                className={sdsButtonSecondary}
                                onClick={() => {
                                  setPickedHit(h)
                                  setProvLabel(h.friendlyName?.trim() || '')
                                  setAddStep('configure')
                                }}
                              >
                                Buy
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="font-mono text-[13px] text-[#131313]">
                        {pickedHit?.phoneNumber}
                      </p>
                      <div>
                        <label className={sdsLabel} htmlFor="prov-label">
                          Display label
                        </label>
                        <input
                          id="prov-label"
                          className={`${sdsInput} mt-1 w-full`}
                          value={provLabel}
                          onChange={(e) => setProvLabel(e.target.value)}
                          placeholder="Line label"
                        />
                      </div>
                      <div>
                        <span className={sdsLabel}>Line type</span>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#131313]">
                            <input
                              type="radio"
                              name="prov-type"
                              checked={provType === 'dedicated'}
                              onChange={() => setProvType('dedicated')}
                            />
                            Dedicated
                          </label>
                          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#131313]">
                            <input
                              type="radio"
                              name="prov-type"
                              checked={provType === 'shared'}
                              onChange={() => setProvType('shared')}
                            />
                            Shared
                          </label>
                        </div>
                      </div>
                      {provType === 'dedicated' ? (
                        <div>
                          <label className={sdsLabel} htmlFor="prov-assign">
                            Assign to
                          </label>
                          <select
                            id="prov-assign"
                            className={`${sdsSelectWFull} mt-1`}
                            value={provAssignId}
                            onChange={(e) => setProvAssignId(e.target.value)}
                          >
                            <option value="">Select user…</option>
                            {assignableUsers.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
                <div className={sdsModalFooter}>
                  {addStep === 'configure' ? (
                    <button
                      type="button"
                      className={sdsButtonSecondary}
                      onClick={() => {
                        setAddStep('search')
                        setPickedHit(null)
                      }}
                    >
                      Back
                    </button>
                  ) : (
                    <button type="button" className={sdsButtonSecondary} onClick={closeAddModal}>
                      Cancel
                    </button>
                  )}
                  {addStep === 'configure' ? (
                    <button
                      type="button"
                      className={sdsButtonPrimary}
                      disabled={
                        provisioning ||
                        (provType === 'dedicated' && !provAssignId.trim())
                      }
                      onClick={() => void runProvision()}
                    >
                      {provisioning ? <LoadingSpinner size="sm" aria-hidden /> : 'Provision'}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>,
            modalRoot,
          )
        : null}

      {labelModalRow && modalRoot
        ? createPortal(
            <div className={sdsModalBackdrop} role="presentation">
              <button
                type="button"
                className={sdsModalDismissLayer}
                aria-label="Close"
                onClick={() => setLabelModalRow(null)}
              />
              <div className={`${sdsModalContainer} max-w-md`}>
                <div className={sdsModalHeader}>
                  <h2 className={sdsModalTitle}>Edit label</h2>
                  <button
                    type="button"
                    className={sdsModalCloseButton}
                    aria-label="Close"
                    onClick={() => setLabelModalRow(null)}
                  >
                    <X size={18} aria-hidden />
                  </button>
                </div>
                <div className={sdsModalBody}>
                  <label className={sdsLabel} htmlFor="edit-label-field">
                    Label
                  </label>
                  <input
                    id="edit-label-field"
                    className={`${sdsInput} mt-1 w-full`}
                    value={labelDraft}
                    onChange={(e) => setLabelDraft(e.target.value)}
                  />
                </div>
                <div className={sdsModalFooter}>
                  <button
                    type="button"
                    className={sdsButtonSecondary}
                    onClick={() => setLabelModalRow(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={sdsButtonPrimary}
                    disabled={labelSaving}
                    onClick={() => void saveLabel()}
                  >
                    {labelSaving ? <LoadingSpinner size="sm" aria-hidden /> : 'Save'}
                  </button>
                </div>
              </div>
            </div>,
            modalRoot,
          )
        : null}

      {deactivateRow && modalRoot
        ? createPortal(
            <div className={sdsModalBackdrop} role="presentation">
              <button
                type="button"
                className={sdsModalDismissLayer}
                aria-label="Close"
                onClick={() => setDeactivateRow(null)}
              />
              <div className={`${sdsModalContainer} max-w-md`}>
                <div className={sdsModalHeader}>
                  <h2 className={sdsModalTitle}>Deactivate number</h2>
                  <button
                    type="button"
                    className={sdsModalCloseButton}
                    aria-label="Close"
                    onClick={() => setDeactivateRow(null)}
                  >
                    <X size={18} aria-hidden />
                  </button>
                </div>
                <div className={sdsModalBody}>
                  <p className="text-[#131313]">
                    Deactivate{' '}
                    <span className="font-mono">{deactivateRow.phone_number}</span>? It will no
                    longer be used for outbound SMS routing.
                  </p>
                </div>
                <div className={sdsModalFooter}>
                  <button
                    type="button"
                    className={sdsButtonSecondary}
                    onClick={() => setDeactivateRow(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={sdsButtonPrimary}
                    disabled={deactivateSaving}
                    onClick={() => void confirmDeactivate()}
                  >
                    {deactivateSaving ? <LoadingSpinner size="sm" aria-hidden /> : 'Deactivate'}
                  </button>
                </div>
              </div>
            </div>,
            modalRoot,
          )
        : null}
    </>
  )
}
