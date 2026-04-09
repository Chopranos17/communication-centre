import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useSearchParams } from 'react-router-dom'
import {
  fetchActivityFeed,
  type ActivityFeedResponse,
  type ActivityListItemDto,
} from '../api/activityCommandCenterClient'
import { fetchJobs, type JobListRow } from '../api/jobsClient'
import { ActivityRecruitmentBreadcrumbs } from '../components/activity-command-center/ActivityRecruitmentBreadcrumbs'
import { ActivityCommunicationListPanel } from '../components/activity-command-center/ActivityCommunicationListPanel'
import {
  ActivityAdvancedFilterPanel,
  type ActivityAdvancedFilters,
} from '../components/activity-command-center/ActivityAdvancedFilterPanel'
import { CommunicationsPanel } from '../components/candidate/CommunicationsPanel'
import { SendChannelMessageModal } from '../components/candidate/SendChannelMessageModal'
import { FilterTabs } from '../components/layout/FilterTabs'
import { usePersona } from '../context/PersonaContext'
import { initials } from '../lib/activityPresentation'
import { sdsButtonSecondaryIcon } from '../lib/sdsButtonClasses'
import {
  sdsSidePanelBackdropButton,
  sdsSidePanelContainerWide,
  sdsSidePanelRoot,
} from '../lib/sdsModalClasses'

const PERIODS = new Set(['quarter', 'month', 'week', 'all'])
const SORTS = new Set(['newest', 'unresponsive_first', 'name_asc'])
const STATUS_IDS = new Set(['engaged', 'pending', 'unresponsive'])
const CHANNEL_IDS = new Set(['email', 'sms', 'whatsapp', 'meeting'])

const ICON_BUTTON_CLASS = `${sdsButtonSecondaryIcon} text-[var(--icon-default)] hover:text-[var(--icon-hover)]`

function IconSearchOutline({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M16.5 16.5L20 20"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconFilterFunnelOutline({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M3 5.25h18l-6.75 8.46V18.5l-2.25 1.25v-6.29L3 5.25z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

function rowKey(row: ActivityListItemDto): string {
  return `${row.candidateId}:${row.jobId}`
}

function parseStatusChip(param: string | null): string {
  const s = (param ?? '').trim().toLowerCase()
  if (STATUS_IDS.has(s)) return s
  return 'all'
}

/** First valid channel segment from URL, or '' for all. */
function channelFromSearchParams(sp: URLSearchParams): string {
  const raw = (sp.get('channel') ?? '').trim().toLowerCase()
  const first = raw.split(',')[0]?.trim() ?? ''
  if (!first || first === 'all') return ''
  if (CHANNEL_IDS.has(first)) return first
  return ''
}

function advancedFromSearchParams(sp: URLSearchParams): ActivityAdvancedFilters {
  const periodRaw = sp.get('period') ?? 'quarter'
  const period = PERIODS.has(periodRaw) ? periodRaw : 'quarter'
  const sortRaw = sp.get('sort') ?? 'newest'
  const sort = SORTS.has(sortRaw) ? sortRaw : 'newest'
  return {
    period,
    sort,
    jobId: sp.get('job_id')?.trim() ?? '',
    channel: channelFromSearchParams(sp),
  }
}

export function ActivityCommandCenterPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { canManageRecruitment } = usePersona()
  const [jobs, setJobs] = useState<JobListRow[]>([])
  const [feed, setFeed] = useState<ActivityFeedResponse | null>(null)
  const [feedLoading, setFeedLoading] = useState(true)
  const [feedError, setFeedError] = useState<string | null>(null)
  const [selectedRow, setSelectedRow] = useState<ActivityListItemDto | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [searchExpanded, setSearchExpanded] = useState(() =>
    Boolean(searchParams.get('q')?.trim()),
  )
  const [searchInput, setSearchInput] = useState(() => searchParams.get('q')?.trim() ?? '')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [smsModalOpen, setSmsModalOpen] = useState(false)
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false)
  const [communicationsRefresh, setCommunicationsRefresh] = useState(0)
  const [panelEntered, setPanelEntered] = useState(false)

  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1)
  const limit = Math.min(
    50,
    Math.max(1, Number.parseInt(searchParams.get('limit') ?? '10', 10) || 10),
  )

  const statusChip = useMemo(
    () => parseStatusChip(searchParams.get('status')),
    [searchParams],
  )

  const advanced = useMemo(
    () => advancedFromSearchParams(searchParams),
    [searchParams],
  )

  const qFromUrl = searchParams.get('q')?.trim() ?? ''

  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = searchInput.trim()
      if (next === qFromUrl) return
      const p = new URLSearchParams(searchParams)
      if (next) p.set('q', next)
      else p.delete('q')
      p.set('page', '1')
      setSearchParams(p, { replace: true })
    }, 300)
    return () => window.clearTimeout(t)
  }, [searchInput, qFromUrl, searchParams, setSearchParams])

  const activityQuery = useMemo(
    () => ({
      period: advanced.period,
      status: statusChip === 'all' ? '' : statusChip,
      jobId: advanced.jobId,
      sort: advanced.sort,
      page,
      limit,
      q: qFromUrl,
      channel: advanced.channel,
    }),
    [advanced, statusChip, page, limit, qFromUrl],
  )

  const loadJobs = useCallback(async () => {
    try {
      const list = await fetchJobs()
      setJobs(list)
    } catch {
      setJobs([])
    }
  }, [])

  const loadFeed = useCallback(async () => {
    setFeedLoading(true)
    setFeedError(null)
    try {
      const data = await fetchActivityFeed(activityQuery)
      setFeed(data)
    } catch (e) {
      setFeed(null)
      setFeedError(e instanceof Error ? e.message : 'Failed to load activity')
    } finally {
      setFeedLoading(false)
    }
  }, [activityQuery])

  useEffect(() => {
    void loadJobs()
  }, [loadJobs])

  useEffect(() => {
    void loadFeed()
  }, [loadFeed])

  useEffect(() => {
    if (!feed || !selectedRow) return
    const k = rowKey(selectedRow)
    const fresh = feed.items.find((r) => rowKey(r) === k)
    if (!fresh) return
    if (
      fresh.communicationId !== selectedRow.communicationId ||
      fresh.sentAt !== selectedRow.sentAt ||
      fresh.status !== selectedRow.status ||
      fresh.preview !== selectedRow.preview
    ) {
      setSelectedRow(fresh)
    }
  }, [feed, selectedRow])

  useEffect(() => {
    if (!selectedRow) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedRow(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [selectedRow])

  useEffect(() => {
    if (!selectedRow) {
      setPanelEntered(false)
      return
    }
    setPanelEntered(false)
    const id = requestAnimationFrame(() => {
      setPanelEntered(true)
    })
    return () => cancelAnimationFrame(id)
  }, [selectedRow])

  const statusTabs = useMemo(() => {
    const s = feed?.summary
    return [
      { id: 'all', label: 'All', count: s?.total ?? 0 },
      { id: 'engaged', label: 'Engaged', count: s?.engaged ?? 0 },
      { id: 'pending', label: 'Pending', count: s?.pending ?? 0 },
      { id: 'unresponsive', label: 'Unresponsive', count: s?.unresponsive ?? 0 },
    ]
  }, [feed?.summary])

  const pushStatus = useCallback(
    (id: string) => {
      const p = new URLSearchParams(searchParams)
      if (id === 'all') p.delete('status')
      else p.set('status', id)
      p.set('page', '1')
      setSearchParams(p, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const onAdvancedApply = useCallback(
    (next: ActivityAdvancedFilters) => {
      const p = new URLSearchParams(searchParams)
      p.set('period', next.period)
      p.set('sort', next.sort)
      if (next.jobId.trim()) p.set('job_id', next.jobId.trim())
      else p.delete('job_id')
      if (next.channel.trim()) p.set('channel', next.channel.trim())
      else p.delete('channel')
      p.set('page', '1')
      setSearchParams(p, { replace: true })
      setSelectedRow(null)
    },
    [searchParams, setSearchParams],
  )

  const onPageChange = useCallback(
    (newPage: number) => {
      const p = new URLSearchParams(searchParams)
      p.set('page', String(newPage))
      setSearchParams(p, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const selectedKey = selectedRow ? rowKey(selectedRow) : null

  const bumpCommunications = useCallback(() => {
    setCommunicationsRefresh((n) => n + 1)
    void loadFeed()
  }, [loadFeed])

  const listSummaryText = useMemo(() => {
    const n = feed?.items.length ?? 0
    const t = feed?.total ?? 0
    return `Showing ${n} of ${t} messages`
  }, [feed?.items.length, feed?.total])

  const panelJob = selectedRow
    ? {
        id: selectedRow.jobId,
        title: selectedRow.jobTitle,
        jobCode: selectedRow.jobCode,
      }
    : null

  const hasPhone = Boolean(selectedRow?.candidatePhone?.trim())
  const hasWhatsAppTarget = Boolean(
    selectedRow?.candidateWhatsapp?.trim() || selectedRow?.candidatePhone?.trim(),
  )
  const smsToDisplay = selectedRow
    ? `${selectedRow.candidateName} · ${selectedRow.candidatePhone?.trim() || '—'}`
    : ''
  const whatsappToDisplay = selectedRow
    ? `${selectedRow.candidateName} · ${selectedRow.candidateWhatsapp?.trim() || selectedRow.candidatePhone?.trim() || '—'}`
    : ''

  const openSearch = useCallback(() => {
    setSearchExpanded(true)
    queueMicrotask(() => searchInputRef.current?.focus())
  }, [])

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 pb-6">
      <ActivityRecruitmentBreadcrumbs />

      <div>
        <h1 className="text-[18px] font-medium text-[var(--text-title)]">
          Activity command center
        </h1>
        <p className="mt-1 text-[length:var(--body-m)] text-[var(--text-label)]">
          All communications across your job openings
        </p>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2">
        <div className="min-w-0 flex-[1_1_0%] overflow-x-auto pb-0.5">
          <FilterTabs
            tabs={statusTabs}
            activeId={statusChip}
            onChange={pushStatus}
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {searchExpanded ? (
            <div className="relative w-[min(100%,20rem)] min-w-[10.5rem] sm:min-w-[12rem]">
              <input
                ref={searchInputRef}
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onBlur={() => {
                  window.setTimeout(() => {
                    if (!searchInputRef.current?.value.trim()) {
                      setSearchExpanded(false)
                    }
                  }, 0)
                }}
                placeholder="Search…"
                className="h-9 w-full rounded-sds-8 border border-[#e0e0e0] bg-white pl-3 pr-10 text-[13px] outline-none focus-visible:border-[#0183FF]"
                aria-label="Search activity"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--icon-default)]">
                <IconSearchOutline />
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={openSearch}
              className={ICON_BUTTON_CLASS}
              aria-label="Open search"
            >
              <IconSearchOutline />
            </button>
          )}
          <button
            type="button"
            onClick={() => setAdvancedOpen(true)}
            className={ICON_BUTTON_CLASS}
            aria-label="Filters"
          >
            <IconFilterFunnelOutline />
          </button>
        </div>
      </div>

      <ActivityCommunicationListPanel
        items={feed?.items ?? []}
        total={feed?.total ?? 0}
        page={feed?.page ?? page}
        limit={feed?.limit ?? limit}
        selectedKey={selectedKey}
        onSelect={(row) => setSelectedRow(row)}
        onPageChange={onPageChange}
        isLoading={feedLoading}
        error={feedError}
        listSummaryText={listSummaryText}
      />

      <ActivityAdvancedFilterPanel
        isOpen={advancedOpen}
        onClose={() => setAdvancedOpen(false)}
        jobs={jobs}
        values={advanced}
        onApply={onAdvancedApply}
      />

      {selectedRow && panelJob
        ? createPortal(
            <div className={sdsSidePanelRoot} role="dialog" aria-modal="true">
              <button
                type="button"
                className={sdsSidePanelBackdropButton}
                aria-label="Close panel"
                onClick={() => setSelectedRow(null)}
              />
              <div
                className={[
                  sdsSidePanelContainerWide,
                  'transition-transform duration-200 ease-out',
                  panelEntered ? 'translate-x-0' : 'translate-x-full',
                ].join(' ')}
                onClick={(e) => e.stopPropagation()}
              >
                <header className="flex shrink-0 items-center gap-3 border-b border-[#e0e0e0] px-4 py-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E6F3FF] text-[11px] font-medium text-[#014F99]"
                    aria-hidden
                  >
                    {initials(selectedRow.candidateName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-[var(--text-title)]">
                      {selectedRow.candidateName}
                    </p>
                    <Link
                      to={`/recruitment/candidates/${encodeURIComponent(selectedRow.candidateId)}?tab=communications`}
                      className="text-[12px] font-medium text-[var(--text-link)] hover:underline"
                    >
                      View full profile
                    </Link>
                  </div>
                  <button
                    type="button"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sds-4 text-[#4d4d4d] transition-colors hover:bg-[#f5f5f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0183FF] focus-visible:ring-offset-1"
                    aria-label="Close"
                    onClick={() => setSelectedRow(null)}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M18 6L6 18M6 6l12 12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </header>
                <div className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto px-4 py-4">
                  <CommunicationsPanel
                    variant="plain"
                    candidateId={selectedRow.candidateId}
                    candidateName={selectedRow.candidateName}
                    candidateEmail={selectedRow.candidateEmail}
                    currentJob={panelJob}
                    jobApplicationCount={1}
                    timelineJobId={selectedRow.jobId}
                    refreshSignal={communicationsRefresh}
                    onSendSms={
                      canManageRecruitment ? () => setSmsModalOpen(true) : undefined
                    }
                    onSendWhatsApp={
                      canManageRecruitment ? () => setWhatsappModalOpen(true) : undefined
                    }
                    smsDisabled={!hasPhone}
                    whatsappDisabled={!hasWhatsAppTarget}
                    smsDisabledTitle={
                      !hasPhone ? 'Candidate has no phone number.' : undefined
                    }
                    whatsappDisabledTitle={
                      !hasWhatsAppTarget
                        ? 'Candidate has no phone or WhatsApp number.'
                        : undefined
                    }
                  />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {selectedRow && panelJob && canManageRecruitment ? (
        <>
          <SendChannelMessageModal
            open={smsModalOpen}
            onClose={() => setSmsModalOpen(false)}
            variant="sms"
            candidateId={selectedRow.candidateId}
            candidateName={selectedRow.candidateName}
            jobId={selectedRow.jobId}
            toDisplay={smsToDisplay}
            onSent={bumpCommunications}
          />
          <SendChannelMessageModal
            open={whatsappModalOpen}
            onClose={() => setWhatsappModalOpen(false)}
            variant="whatsapp"
            candidateId={selectedRow.candidateId}
            candidateName={selectedRow.candidateName}
            jobId={selectedRow.jobId}
            toDisplay={whatsappToDisplay}
            onSent={bumpCommunications}
          />
        </>
      ) : null}
    </div>
  )
}
