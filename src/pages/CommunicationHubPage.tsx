import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Clock, MessageSquareText, UserPlus, Users } from 'lucide-react'
import { ChannelMixWidget } from '../components/analytics/ChannelMixWidget'
import { MetricsBar, type MetricItem } from '../components/analytics/MetricsBar'
import {
  RecentActivityWidget,
  type ActivityItem,
} from '../components/analytics/RecentActivityWidget'
import { ScheduledMessagesAllPanel } from '../components/analytics/ScheduledMessagesAllPanel'
import { ScheduledMessagesWidget } from '../components/analytics/ScheduledMessagesWidget'
import { EditScheduledEmailModal } from '../components/candidate/EditScheduledEmailModal'
import { CommunicationsPanel } from '../components/candidate/CommunicationsPanel'
import { FollowUpEmailModal } from '../components/candidate/FollowUpEmailModal'
import { ReplyThreadModal } from '../components/candidate/ReplyThreadModal'
import { SendChannelMessageModal } from '../components/candidate/SendChannelMessageModal'
import { PageHeader } from '../components/layout/PageHeader'
import {
  fetchCandidateCurrentJobEmails,
  type CurrentJobEmailRow,
} from '../api/candidatesClient'
import { fetchJobs, type JobListRow } from '../api/jobsClient'
import type {
  CommsHubDashboardDto,
  ScheduledMessageDto,
} from '../api/commsHubDashboardClient'
import { useToast } from '../contexts/ToastContext'
import { usePersona } from '../context/PersonaContext'
import { useDashboardAnalytics } from '../hooks/useDashboardAnalytics'
import {
  CHANNEL_META,
  channelKeyFromApi,
  initials,
  type ActivityChannelKey,
} from '../lib/activityPresentation'
import {
  sdsSidePanelBackdropButton,
  sdsSidePanelContainerWide,
  sdsSidePanelRoot,
} from '../lib/sdsModalClasses'
import {
  formatActiveCandidatesCount,
  formatMessagesSentCount,
  formatResponseTime,
} from '../lib/metricsBarFormat'
import { buildTimelineThreadGroups } from '../utils/communicationTimeline'
import type { ActivityPrimaryActionType } from '../utils/communicationTimeline'

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
  const { canManageRecruitment } = usePersona()
  const { showToast } = useToast()
  const [period, setPeriod] = useState<
    'week' | 'month' | 'quarter' | 'all'
  >('quarter')
  const [jobOpeningId, setJobOpeningId] = useState<string | undefined>(
    undefined,
  )
  const [jobs, setJobs] = useState<JobListRow[]>([])
  const [panelItem, setPanelItem] = useState<ActivityItem | null>(null)
  const [panelFocusCommunicationId, setPanelFocusCommunicationId] = useState<
    string | null
  >(null)
  const [panelEntered, setPanelEntered] = useState(false)
  const [communicationsRefresh, setCommunicationsRefresh] = useState(0)
  const [smsModalOpen, setSmsModalOpen] = useState(false)
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false)
  const [channelModalContext, setChannelModalContext] =
    useState<ActivityItem | null>(null)
  const [replyRows, setReplyRows] = useState<CurrentJobEmailRow[] | null>(null)
  const [followUpRows, setFollowUpRows] = useState<CurrentJobEmailRow[] | null>(
    null,
  )
  const [composeJob, setComposeJob] = useState<{
    id: string
    title: string
  } | null>(null)
  const [composeContext, setComposeContext] = useState<ActivityItem | null>(
    null,
  )
  const [primaryActionLoadingId, setPrimaryActionLoadingId] = useState<
    string | null
  >(null)
  /** True when panel was opened with “View this message” — closing detail should close the whole hub panel. */
  const exitOuterPanelAfterDetailCloseRef = useRef(false)
  const [scheduledPanelOpen, setScheduledPanelOpen] = useState(false)
  const [scheduledPanelEntered, setScheduledPanelEntered] = useState(false)
  const [hubScheduledEdit, setHubScheduledEdit] = useState<{
    row: CurrentJobEmailRow
    candidateName: string
  } | null>(null)

  const { data, isLoading, error, refetch } = useDashboardAnalytics({
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
        candidateEmail: a.candidateEmail,
        candidatePhone: a.candidatePhone,
        candidateWhatsapp: a.candidateWhatsapp,
        jobId: a.jobId,
        jobTitle: a.jobTitle,
        jobCode: a.jobCode,
        currentStage: a.currentStage,
        channel: channelKeyFromApi(a.channel) as ActivityChannelKey,
        direction: a.direction === 'inbound' ? 'inbound' : 'outbound',
        preview: a.preview,
        status: a.status,
        sentAt: a.sentAt,
        primaryAction: (a.primaryAction ?? 'view') as ActivityPrimaryActionType,
        smsNumber: a.smsNumber ?? null,
      }),
    )
  }, [data])

  const closeCommunicationsPanel = useCallback(() => {
    setPanelItem(null)
    setPanelFocusCommunicationId(null)
    exitOuterPanelAfterDetailCloseRef.current = false
  }, [])

  const openCommunicationsPanel = useCallback(
    (item: ActivityItem, focusMessageId?: string | null) => {
      setPanelItem(item)
      setPanelFocusCommunicationId(focusMessageId ?? null)
      exitOuterPanelAfterDetailCloseRef.current = false
    },
    [],
  )

  const markOpenedMessageDetailFromFocus = useCallback(() => {
    exitOuterPanelAfterDetailCloseRef.current = true
  }, [])

  const handleHubMessageDetailClosed = useCallback(() => {
    if (!exitOuterPanelAfterDetailCloseRef.current) return
    exitOuterPanelAfterDetailCloseRef.current = false
    closeCommunicationsPanel()
  }, [closeCommunicationsPanel])

  const clearPanelFocusCommunication = useCallback(() => {
    setPanelFocusCommunicationId(null)
  }, [])

  useEffect(() => {
    if (!panelItem) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCommunicationsPanel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [panelItem, closeCommunicationsPanel])

  useEffect(() => {
    if (!panelItem) {
      setPanelEntered(false)
      return
    }
    setPanelEntered(false)
    const id = requestAnimationFrame(() => {
      setPanelEntered(true)
    })
    return () => cancelAnimationFrame(id)
  }, [panelItem])

  const panelJob = panelItem
    ? {
        id: panelItem.jobId,
        title: panelItem.jobTitle,
        jobCode: panelItem.jobCode,
      }
    : null

  const hasPhone = Boolean(panelItem?.candidatePhone?.trim())
  const hasWhatsAppTarget = Boolean(
    panelItem?.candidateWhatsapp?.trim() || panelItem?.candidatePhone?.trim(),
  )
  const smsCtx = smsModalOpen ? (channelModalContext ?? panelItem) : null
  const whatsappCtx = whatsappModalOpen
    ? (channelModalContext ?? panelItem)
    : null
  const smsToDisplay = smsCtx
    ? `${smsCtx.candidateName} · ${smsCtx.candidatePhone?.trim() || '—'}`
    : ''
  const whatsappToDisplay = whatsappCtx
    ? `${whatsappCtx.candidateName} · ${whatsappCtx.candidateWhatsapp?.trim() || whatsappCtx.candidatePhone?.trim() || '—'}`
    : ''

  const bumpCommunications = useCallback(() => {
    setCommunicationsRefresh((n) => n + 1)
    void refetch()
  }, [refetch])

  const refreshScheduledDashboard = useCallback(() => {
    refetch()
  }, [refetch])

  useEffect(() => {
    if (!scheduledPanelOpen) {
      setScheduledPanelEntered(false)
      return
    }
    setScheduledPanelEntered(false)
    const id = requestAnimationFrame(() => {
      setScheduledPanelEntered(true)
    })
    return () => cancelAnimationFrame(id)
  }, [scheduledPanelOpen])

  const handleEditScheduledEmail = useCallback(
    async (item: ScheduledMessageDto) => {
      if (!canManageRecruitment) return
      try {
        const data = await fetchCandidateCurrentJobEmails(
          item.candidateId,
          item.jobId,
        )
        const row =
          data.emails.find((r) => r.id === item.communicationId) ??
          data.otherJobEmailSections
            .flatMap((s) => s.emails)
            .find((r) => r.id === item.communicationId)
        if (!row) {
          showToast('error', 'Could not load this scheduled message.')
          return
        }
        setHubScheduledEdit({ row, candidateName: item.candidateName })
      } catch {
        showToast('error', 'Failed to load communications.')
      }
    },
    [canManageRecruitment, showToast],
  )

  const closeEmailCompose = useCallback(() => {
    setReplyRows(null)
    setFollowUpRows(null)
    setComposeJob(null)
    setComposeContext(null)
  }, [])

  const handleRecentPrimaryAction = useCallback(
    async (item: ActivityItem) => {
      if (item.primaryAction === 'view') {
        openCommunicationsPanel(item)
        return
      }
      if (item.channel === 'sms' || item.channel === 'whatsapp') {
        if (!canManageRecruitment) {
          openCommunicationsPanel(item)
          return
        }
        setChannelModalContext(item)
        if (item.channel === 'sms') setSmsModalOpen(true)
        else setWhatsappModalOpen(true)
        return
      }
      if (
        item.channel === 'email' &&
        (item.primaryAction === 'reply' || item.primaryAction === 'followup')
      ) {
        if (!canManageRecruitment) {
          openCommunicationsPanel(item)
          return
        }
        setPrimaryActionLoadingId(item.communicationId)
        try {
          const data = await fetchCandidateCurrentJobEmails(
            item.candidateId,
            item.jobId,
          )
          const groups = buildTimelineThreadGroups(data.emails)
          const group = groups.find((g) =>
            g.rows.some((r) => r.id === item.communicationId),
          )
          const rows =
            group?.rows ??
            data.emails.filter((r) => r.id === item.communicationId)
          if (rows.length === 0) {
            showToast('error', 'Could not load this thread.')
            return
          }
          setComposeContext(item)
          setComposeJob({ id: item.jobId, title: item.jobTitle })
          if (item.primaryAction === 'reply') {
            setFollowUpRows(null)
            setReplyRows(rows)
          } else {
            setReplyRows(null)
            setFollowUpRows(rows)
          }
        } catch {
          showToast('error', 'Failed to load communications.')
        } finally {
          setPrimaryActionLoadingId(null)
        }
      }
    },
    [canManageRecruitment, showToast, openCommunicationsPanel],
  )

  const scheduled = data?.scheduled ?? []

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
              onOpenCommunicationsPanel={(item) => openCommunicationsPanel(item)}
              onViewThisMessage={(item) =>
                openCommunicationsPanel(item, item.communicationId)
              }
              onPrimaryAction={handleRecentPrimaryAction}
              primaryActionLoadingId={primaryActionLoadingId}
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
              onViewAll={() => setScheduledPanelOpen(true)}
              onEditEmail={handleEditScheduledEmail}
              onScheduledMutated={refreshScheduledDashboard}
              canManageRecruitment={canManageRecruitment}
            />
          </div>
        </div>
      </div>

      {panelItem && panelJob
        ? createPortal(
            <div className={sdsSidePanelRoot} role="dialog" aria-modal="true">
              <button
                type="button"
                className={sdsSidePanelBackdropButton}
                aria-label="Close panel"
                onClick={() => closeCommunicationsPanel()}
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
                    {initials(panelItem.candidateName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-[var(--text-title)]">
                      {panelItem.candidateName}
                    </p>
                    <Link
                      to={`/recruitment/candidates/${encodeURIComponent(panelItem.candidateId)}?tab=communications`}
                      className="text-[12px] font-medium text-[var(--text-link)] hover:underline"
                    >
                      View full profile
                    </Link>
                  </div>
                  <button
                    type="button"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sds-4 text-[#4d4d4d] transition-colors hover:bg-[#f5f5f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0183FF] focus-visible:ring-offset-1"
                    aria-label="Close"
                    onClick={() => closeCommunicationsPanel()}
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
                    candidateId={panelItem.candidateId}
                    candidateName={panelItem.candidateName}
                    candidateEmail={panelItem.candidateEmail}
                    currentJob={panelJob}
                    jobApplicationCount={1}
                    timelineJobId={panelItem.jobId}
                    refreshSignal={communicationsRefresh}
                    focusCommunicationId={panelFocusCommunicationId}
                    onFocusCommunicationConsumed={clearPanelFocusCommunication}
                    onMessageDetailClosed={handleHubMessageDetailClosed}
                    onOpenedMessageDetailFromFocus={markOpenedMessageDetailFromFocus}
                    onSendSms={
                      canManageRecruitment
                        ? () => {
                            setChannelModalContext(null)
                            setSmsModalOpen(true)
                          }
                        : undefined
                    }
                    onSendWhatsApp={
                      canManageRecruitment
                        ? () => {
                            setChannelModalContext(null)
                            setWhatsappModalOpen(true)
                          }
                        : undefined
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

      {canManageRecruitment && smsModalOpen && smsCtx ? (
        <SendChannelMessageModal
          open
          onClose={() => {
            setSmsModalOpen(false)
            setChannelModalContext(null)
          }}
          variant="sms"
          candidateId={smsCtx.candidateId}
          candidateName={smsCtx.candidateName}
          jobId={smsCtx.jobId}
          toDisplay={smsToDisplay}
          onSent={bumpCommunications}
        />
      ) : null}

      {canManageRecruitment && whatsappModalOpen && whatsappCtx ? (
        <SendChannelMessageModal
          open
          onClose={() => {
            setWhatsappModalOpen(false)
            setChannelModalContext(null)
          }}
          variant="whatsapp"
          candidateId={whatsappCtx.candidateId}
          candidateName={whatsappCtx.candidateName}
          jobId={whatsappCtx.jobId}
          toDisplay={whatsappToDisplay}
          onSent={bumpCommunications}
        />
      ) : null}

      {canManageRecruitment &&
      composeJob &&
      composeContext &&
      replyRows ? (
        <ReplyThreadModal
          open
          onClose={closeEmailCompose}
          candidateId={composeContext.candidateId}
          candidateName={composeContext.candidateName}
          candidateEmail={composeContext.candidateEmail}
          jobId={composeJob.id}
          jobTitle={composeJob.title}
          threadRows={replyRows}
          onSent={() => {
            bumpCommunications()
            closeEmailCompose()
          }}
        />
      ) : null}

      <ScheduledMessagesAllPanel
        open={scheduledPanelOpen}
        onClose={() => setScheduledPanelOpen(false)}
        period={period}
        jobOpeningId={jobOpeningId}
        totalQueued={data?.scheduledQueuedTotal ?? 0}
        onEditEmail={handleEditScheduledEmail}
        onMutated={refreshScheduledDashboard}
        panelEntered={scheduledPanelEntered}
        canManageRecruitment={canManageRecruitment}
      />

      {canManageRecruitment ? (
        <EditScheduledEmailModal
          open={hubScheduledEdit != null}
          onClose={() => setHubScheduledEdit(null)}
          candidateName={hubScheduledEdit?.candidateName ?? ''}
          email={hubScheduledEdit?.row ?? null}
          onUpdated={() => {
            refreshScheduledDashboard()
            setHubScheduledEdit(null)
          }}
        />
      ) : null}

      {canManageRecruitment &&
      composeJob &&
      composeContext &&
      followUpRows ? (
        <FollowUpEmailModal
          open
          onClose={closeEmailCompose}
          candidateId={composeContext.candidateId}
          candidateName={composeContext.candidateName}
          candidateEmail={composeContext.candidateEmail}
          jobId={composeJob.id}
          jobTitle={composeJob.title}
          threadRows={followUpRows}
          onSent={() => {
            bumpCommunications()
            closeEmailCompose()
          }}
        />
      ) : null}
    </>
  )
}
