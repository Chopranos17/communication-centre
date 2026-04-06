import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchCandidateDetail, type CandidateDetail } from '../api/candidatesClient'
import { CandidateDetailHeader } from '../components/candidate/CandidateDetailHeader'
import { CandidateDetailSidebar } from '../components/candidate/CandidateDetailSidebar'
import {
  CandidateDetailTabs,
  type CandidateMainTabId,
} from '../components/candidate/CandidateDetailTabs'
import { CommunicationsCurrentJobSection } from '../components/candidate/CommunicationsCurrentJobSection'
import { HiringFlowPlaceholder } from '../components/candidate/HiringFlowPlaceholder'
import { FilterTabs } from '../components/layout/FilterTabs'

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
    <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center text-[length:var(--body-m)] text-[var(--text-label)]">
      {title} content will be available in a future iteration.
    </div>
  )
}

export function CandidateDetailPage() {
  const { candidateId } = useParams<{ candidateId: string }>()
  const [detail, setDetail] = useState<CandidateDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [mainTab, setMainTab] = useState<CandidateMainTabId>('overview')
  const [appPill, setAppPill] = useState('snapshot')

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

  if (!candidateId) {
    return (
      <div className="text-[length:var(--body-m)] text-[var(--text-label)]">Invalid candidate.</div>
    )
  }

  if (loading) {
    return (
      <div className="text-[length:var(--body-m)] text-[var(--text-body)]" role="status">
        Loading candidate…
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
          className="rounded border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1.5 text-[length:var(--body-m)] text-[var(--text-body)] hover:bg-[var(--bg-surface-hover)]"
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

  return (
    <div>
      <div className="mb-4">
        <Link
          to="/recruitment/candidates"
          className="text-[length:var(--body-m)] font-medium text-[var(--text-link)] hover:text-[var(--text-link-hover)] hover:underline"
        >
          ← All Candidates
        </Link>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-default)] shadow-[var(--elevation-1)]">
        <CandidateDetailHeader detail={detail} />

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
                    <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 shadow-[var(--elevation-1)]">
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
                    <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 shadow-[var(--elevation-1)]">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <h3
                          className="text-[length:var(--body-m)] font-bold text-[var(--text-title)]"
                          style={{ fontWeight: 'var(--font-weight-bold)' }}
                        >
                          Resume
                        </h3>
                        <button
                          type="button"
                          className="text-[var(--icon-active)] hover:text-[var(--blue-700)]"
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
              <div className="space-y-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2
                    className="text-[length:var(--title-xs)] font-bold text-[var(--text-title)]"
                    style={{ fontWeight: 'var(--font-weight-bold)' }}
                  >
                    Communications
                  </h2>
                  <span className="text-[length:var(--body-s)] text-[var(--text-label)]">
                    {detail.communicationCount} total touchpoints (all channels)
                  </span>
                </div>
                <CommunicationsCurrentJobSection candidateId={detail.id} />
              </div>
            ) : null}

            {mainTab === 'other-apps' ? <TabPanelPlaceholder title="Other Apps" /> : null}
          </div>

          <CandidateDetailSidebar detail={detail} />
        </div>
      </div>
    </div>
  )
}
