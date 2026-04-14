import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  fetchCandidateDetail,
  fetchSmsEligibility,
  type CandidateDetail,
  type SmsEligibilityResponse,
} from '../api/candidatesClient'
import { PERSONA_TO_USER_ID } from '../constants/personaUserIds'
import { CandidateDetailHeader } from '../components/candidate/CandidateDetailHeader'
import { CandidateDetailSidebar } from '../components/candidate/CandidateDetailSidebar'
import {
  CandidateDetailTabs,
  type CandidateMainTabId,
} from '../components/candidate/CandidateDetailTabs'
import { CommunicationsPanel } from '../components/candidate/CommunicationsPanel'
import { SendChannelMessageModal } from '../components/candidate/SendChannelMessageModal'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { usePersona } from '../context/PersonaContext'
import { HiringFlowPlaceholder } from '../components/candidate/HiringFlowPlaceholder'
import { FilterTabs } from '../components/layout/FilterTabs'
import {
  sdsButtonIconTertiaryMini,
  sdsButtonSecondarySm,
} from '../lib/sdsButtonClasses'

const TAB_QUERY_TO_MAIN: Record<string, CandidateMainTabId> = {
  overview: 'overview',
  application: 'application',
  activity: 'activity',
  communications: 'communications',
  'other-apps': 'other-apps',
}

const APP_DETAIL_PILLS = [
  { id: 'snapshot', label: 'Application Snapshot' },
  { id: 'resume', label: 'Resume' },
  { id: 'bio', label: 'Biographical' },
  { id: 'contact', label: 'Contact' },
  { id: 'docs', label: 'Personal Documents' },
  { id: 'work', label: 'Work Experience' },
  { id: 'edu', label: 'Education' },
  { id: 'misc', label: 'Misc' },
]

function TabPanelPlaceholder({ title }: { title: string }) {
  return (
    <div className="rounded-sds-8 border border-dashed border-[var(--border-card)] bg-[var(--bg-surface)] p-8 text-center text-[length:var(--body-m)] text-[var(--text-label)]">
      {title} content will be available in a future iteration.
    </div>
  )
}

export function CandidateDetailPage() {
  const { candidateId } = useParams<{ candidateId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [detail, setDetail] = useState<CandidateDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [mainTab, setMainTab] = useState<CandidateMainTabId>('overview')
  const [appPill, setAppPill] = useState('snapshot')
  const [smsModalOpen, setSmsModalOpen] = useState(false)
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false)
  const [communicationsRefresh, setCommunicationsRefresh] = useState(0)
  const [smsEligibility, setSmsEligibility] =
    useState<SmsEligibilityResponse | null>(null)
  const [smsEligibilityLoading, setSmsEligibilityLoading] = useState(false)
  const { canManageRecruitment, persona } = usePersona()

  const bumpCommunications = useCallback(() => {
    setCommunicationsRefresh((n) => n + 1)
  }, [])

  const load = useCallback(async () => {
    if (!candidateId) return
    setLoading(true)
    setError(null)
    try {
      const d = await fetchCandidateDetail(candidateId)
      setDetail(d)
    } catch (e) {
      if (e instanceof Error && e.message === 'NOT_FOUND') {
        setError('notfound')
      } else {
        setError('load')
      }
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [candidateId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!candidateId || !canManageRecruitment) {
      setSmsEligibility(null)
      setSmsEligibilityLoading(false)
      return
    }
    if (persona !== 'recruiter' && persona !== 'hiring_lead') {
      setSmsEligibility(null)
      setSmsEligibilityLoading(false)
      return
    }
    const senderUserId = PERSONA_TO_USER_ID[persona]
    let cancelled = false
    setSmsEligibilityLoading(true)
    setSmsEligibility(null)
    void fetchSmsEligibility(candidateId, senderUserId)
      .then((e) => {
        if (!cancelled) setSmsEligibility(e)
      })
      .catch(() => {
        if (!cancelled) setSmsEligibility(null)
      })
      .finally(() => {
        if (!cancelled) setSmsEligibilityLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [candidateId, canManageRecruitment, persona])

  useEffect(() => {
    const raw = searchParams.get('tab')
    if (raw && TAB_QUERY_TO_MAIN[raw]) {
      setMainTab(TAB_QUERY_TO_MAIN[raw])
    } else {
      setMainTab('overview')
    }
  }, [candidateId, searchParams])

  const smsToDisplay = useMemo(() => {
    if (!detail) return ''
    const num = detail.phone?.trim() || '—'
    return `${detail.name} · ${num}`
  }, [detail])

  const whatsappToDisplay = useMemo(() => {
    if (!detail) return ''
    const num =
      detail.whatsappNumber?.trim() || detail.phone?.trim() || '—'
    return `${detail.name} · ${num}`
  }, [detail])

  const communicationsThreadFocus = useMemo(() => {
    if (mainTab !== 'communications') return null
    return searchParams.get('thread')?.trim() || null
  }, [mainTab, searchParams])

  const clearCommunicationsThreadParam = useCallback(() => {
    const p = new URLSearchParams(searchParams)
    p.delete('thread')
    setSearchParams(p, { replace: true })
  }, [searchParams, setSearchParams])

  if (!candidateId) {
    return (
      <div className="text-[length:var(--body-m)] text-[var(--text-label)]">Invalid candidate.</div>
    )
  }

  if (loading) {
    return (
      <div
        className="flex items-center gap-2 text-[length:var(--body-m)] text-[var(--text-body)]"
        role="status"
      >
        <LoadingSpinner size="sm" aria-hidden />
        <span>Loading candidate…</span>
      </div>
    )
  }

  if (error === 'load') {
    return (
      <div className="space-y-3">
        <p className="text-[length:var(--body-m)] text-[var(--text-error)]">
          Could not load candidate. Is the API running?
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className={sdsButtonSecondarySm}
        >
          Retry
        </button>
      </div>
    )
  }

  if (error === 'notfound' || !detail) {
    return (
      <div className="space-y-3">
        <p className="text-[length:var(--body-m)] text-[var(--text-body)]">Candidate not found.</p>
        <Link
          to="/recruitment/candidates"
          className="text-[length:var(--body-m)] font-medium text-[var(--text-link)] hover:underline"
        >
          Back to All Candidates
        </Link>
      </div>
    )
  }

  const jobApplicationCount =
    (detail.currentJob ? 1 : 0) + detail.otherJobs.length

  const currentJobId = detail.currentJob?.id ?? ''
  const hasPhone = Boolean(detail.phone?.trim())
  const hasWhatsAppTarget = Boolean(
    detail.whatsappNumber?.trim() || detail.phone?.trim(),
  )

  const smsOptedOut =
    canManageRecruitment && smsEligibility?.reason === 'SMS_OPTED_OUT'

  const smsBlockedByEligibility =
    canManageRecruitment &&
    !smsEligibilityLoading &&
    smsEligibility !== null &&
    !smsEligibility.eligible

  const smsDisabledForEligibility =
    smsEligibilityLoading || smsBlockedByEligibility

  const smsDisabledTitleForEligibility = smsEligibilityLoading
    ? 'Checking SMS eligibility…'
    : smsEligibility && !smsEligibility.eligible
      ? smsEligibility.message
      : undefined

  const noJobTitle = 'No current job is linked — open a role first.'

  return (
    <div className="mx-auto w-full max-w-screen-xl px-6 pb-6 pt-6">
      <div className="mb-4">
        <Link
          to="/recruitment/candidates"
          className="text-[length:var(--body-m)] font-medium text-[var(--text-link)] hover:text-[var(--text-link-hover)] hover:underline"
        >
          ← All Candidates
        </Link>
      </div>

      <div className="overflow-hidden rounded-sds-8 border border-[var(--border-card)] shadow-[var(--elevation-1)]">
        <CandidateDetailHeader
          detail={detail}
          showCommunicationActions={canManageRecruitment}
          onSendSms={
            canManageRecruitment ? () => setSmsModalOpen(true) : undefined
          }
          onSendWhatsApp={
            canManageRecruitment ? () => setWhatsappModalOpen(true) : undefined
          }
          smsOptedOut={smsOptedOut}
          smsDisabled={
            !detail.currentJob || !hasPhone || smsDisabledForEligibility
          }
          whatsappDisabled={!detail.currentJob || !hasWhatsAppTarget}
          smsDisabledTitle={
            !detail.currentJob
              ? noJobTitle
              : !hasPhone
                ? 'Candidate has no phone number.'
                : smsDisabledTitleForEligibility
          }
          whatsappDisabledTitle={
            !detail.currentJob
              ? noJobTitle
              : !hasWhatsAppTarget
                ? 'Candidate has no phone or WhatsApp number.'
                : undefined
          }
        />

        {detail.currentJob && canManageRecruitment ? (
          <>
            <SendChannelMessageModal
              open={smsModalOpen}
              onClose={() => setSmsModalOpen(false)}
              variant="sms"
              candidateId={detail.id}
              candidateName={detail.name}
              jobId={currentJobId}
              toDisplay={smsToDisplay}
              onSent={bumpCommunications}
            />
            <SendChannelMessageModal
              open={whatsappModalOpen}
              onClose={() => setWhatsappModalOpen(false)}
              variant="whatsapp"
              candidateId={detail.id}
              candidateName={detail.name}
              jobId={currentJobId}
              toDisplay={whatsappToDisplay}
              onSent={bumpCommunications}
            />
          </>
        ) : null}

        <div className="bg-[var(--bg-surface)] px-5 pb-0 pt-4 sm:px-6">
          <CandidateDetailTabs active={mainTab} onChange={setMainTab} />
        </div>

        <div className="flex flex-col gap-6 bg-[var(--bg-page)] p-5 sm:flex-row sm:px-6 sm:pb-6">
          <div className="min-w-0 flex-1 space-y-4">
            {mainTab === 'overview' ? (
              <HiringFlowPlaceholder currentStage={detail.currentStage} />
            ) : null}

            {mainTab === 'application' ? (
              <>
                <div className="overflow-x-auto pb-1">
                  <FilterTabs tabs={APP_DETAIL_PILLS} activeId={appPill} onChange={setAppPill} />
                </div>
                {appPill === 'snapshot' ? (
                  <div className="space-y-4">
                    <div className="rounded-sds-8 border border-[var(--border-card)] bg-[var(--bg-surface)] p-4 shadow-[var(--elevation-1)]">
                      <h3
                        className="mb-4 text-[length:var(--body-m)] font-bold text-[var(--text-title)]"
                        style={{ fontWeight: 'var(--font-weight-bold)' }}
                      >
                        Application Snapshot
                      </h3>
                      <dl className="grid gap-3 text-[length:var(--body-m)] sm:grid-cols-1">
                        <div className="flex justify-between gap-4 border-b border-[var(--border-subtle)] pb-2">
                          <dt className="text-[var(--text-label)]">Experience</dt>
                          <dd className="text-[var(--text-body)]">Not Available</dd>
                        </div>
                        <div className="flex justify-between gap-4 border-b border-[var(--border-subtle)] pb-2">
                          <dt className="text-[var(--text-label)]">Education</dt>
                          <dd className="text-[var(--text-body)]">Not Available</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-[var(--text-label)]">Skills</dt>
                          <dd className="text-[var(--text-body)]">Not Available</dd>
                        </div>
                      </dl>
                    </div>
                    <div className="rounded-sds-8 border border-[var(--border-card)] bg-[var(--bg-surface)] p-4 shadow-[var(--elevation-1)]">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <h3
                          className="text-[length:var(--body-m)] font-bold text-[var(--text-title)]"
                          style={{ fontWeight: 'var(--font-weight-bold)' }}
                        >
                          Resume
                        </h3>
                        <button
                          type="button"
                          className={`${sdsButtonIconTertiaryMini} text-[var(--icon-active)] hover:text-[#0169CC]`}
                          aria-label="Edit resume"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-[length:var(--body-m)] text-[var(--text-label)]">
                        Resume and cover letter placeholders.
                      </p>
                    </div>
                  </div>
                ) : (
                  <TabPanelPlaceholder title={APP_DETAIL_PILLS.find((p) => p.id === appPill)?.label ?? 'This section'} />
                )}
              </>
            ) : null}

            {mainTab === 'activity' ? <TabPanelPlaceholder title="Activity Log" /> : null}

            {mainTab === 'communications' ? (
              <CommunicationsPanel
                variant="card"
                candidateId={detail.id}
                candidateName={detail.name}
                candidateEmail={detail.email}
                currentJob={detail.currentJob}
                jobApplicationCount={jobApplicationCount}
                profileCommunicationCount={detail.communicationCount}
                refreshSignal={communicationsRefresh}
                focusCommunicationId={communicationsThreadFocus}
                onFocusCommunicationConsumed={clearCommunicationsThreadParam}
                onSendSms={
                  canManageRecruitment ? () => setSmsModalOpen(true) : undefined
                }
                onSendWhatsApp={
                  canManageRecruitment
                    ? () => setWhatsappModalOpen(true)
                    : undefined
                }
                smsDisabled={
                  !detail.currentJob || !hasPhone || smsDisabledForEligibility
                }
                smsOptedOut={smsOptedOut}
                whatsappDisabled={!detail.currentJob || !hasWhatsAppTarget}
                smsDisabledTitle={
                  !detail.currentJob
                    ? noJobTitle
                    : !hasPhone
                      ? 'Candidate has no phone number.'
                      : smsDisabledTitleForEligibility
                }
                whatsappDisabledTitle={
                  !detail.currentJob
                    ? noJobTitle
                    : !hasWhatsAppTarget
                      ? 'Candidate has no phone or WhatsApp number.'
                      : undefined
                }
              />
            ) : null}

            {mainTab === 'other-apps' ? <TabPanelPlaceholder title="Other Apps" /> : null}
          </div>

          <CandidateDetailSidebar
            detail={detail}
            communicationsLayout={mainTab === 'communications'}
          />
        </div>
      </div>
    </div>
  )
}
