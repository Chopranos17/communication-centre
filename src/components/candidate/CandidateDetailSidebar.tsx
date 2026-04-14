import { useEffect, useRef, useState } from 'react'
import type { CandidateDetail, SmsConsentStatus } from '../../api/candidatesClient'
import { sdsButtonIconTertiary, sdsMenuItemBtn } from '../../lib/sdsButtonClasses'

type Props = {
  detail: CandidateDetail
  /** When true (Communications tab), hide Tags/Skills/Feedback; Consent + Other Applied Jobs only. */
  communicationsLayout?: boolean
  /** Recruiter / hiring lead: show consent overflow actions. */
  showConsentActions?: boolean
  onSmsConsentChange?: (status: SmsConsentStatus) => void | Promise<void>
  smsConsentUpdating?: boolean
}

function smsConsentBadgeClass(status: SmsConsentStatus): string {
  if (status === 'granted') {
    return 'border border-[#A5D6A7] bg-[#E8F5E9] text-[#2E7D32]'
  }
  if (status === 'revoked') {
    return 'border border-[#E53935] bg-[#FFEBEE] text-[#C62828]'
  }
  return 'border border-[#FFE082] bg-[#FFF8E1] text-[#F57F17]'
}

function smsConsentBadgeLabel(status: SmsConsentStatus): string {
  if (status === 'granted') return 'Granted'
  if (status === 'revoked') return 'Opted out'
  return 'Pending'
}

function ConsentWidget({
  smsConsentStatus,
  showConsentActions,
  onSmsConsentChange,
  smsConsentUpdating,
}: {
  smsConsentStatus: SmsConsentStatus
  showConsentActions: boolean
  onSmsConsentChange?: (status: SmsConsentStatus) => void | Promise<void>
  smsConsentUpdating: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  const runChange = (status: SmsConsentStatus) => {
    if (smsConsentUpdating || !onSmsConsentChange) return
    void Promise.resolve(onSmsConsentChange(status)).then(() =>
      setMenuOpen(false),
    )
  }

  return (
    <section className="border border-[#e0e0e0] bg-white">
      <div className="border-b border-[#e0e0e0] px-4 py-3">
        <h2 className="text-title-xs font-medium text-[#131313]">Consent</h2>
      </div>
      <div className="px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <p className="shrink-0 text-body-s font-medium text-[#4d4d4d]">SMS</p>
          <span
            className={`inline-flex shrink-0 rounded-sds-4 px-2 py-0.5 text-body-s font-medium ${smsConsentBadgeClass(smsConsentStatus)}`}
            role="status"
          >
            {smsConsentBadgeLabel(smsConsentStatus)}
          </span>
          {showConsentActions && onSmsConsentChange ? (
            <div className="relative ml-auto shrink-0" ref={wrapRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className={`${sdsButtonIconTertiary} text-[#0183FF] hover:bg-[#E6F3FF]`}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label="SMS consent actions"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
              </button>
              {menuOpen ? (
                <div
                  className="absolute right-0 top-full z-50 mt-1 min-w-[11rem] rounded-sds-8 border border-[var(--border-card)] bg-[var(--bg-surface)] py-1 shadow-[var(--elevation-2)]"
                  role="menu"
                >
                  <button
                    type="button"
                    role="menuitem"
                    disabled={
                      smsConsentUpdating || smsConsentStatus === 'granted'
                    }
                    onClick={() => runChange('granted')}
                    className={`${sdsMenuItemBtn} ${smsConsentStatus === 'granted' ? 'text-[#aaaaaa]' : ''}`}
                  >
                    Set SMS consent: Granted
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={
                      smsConsentUpdating || smsConsentStatus === 'pending'
                    }
                    onClick={() => runChange('pending')}
                    className={`${sdsMenuItemBtn} ${smsConsentStatus === 'pending' ? 'text-[#aaaaaa]' : ''}`}
                  >
                    Set SMS consent: Pending
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={
                      smsConsentUpdating || smsConsentStatus === 'revoked'
                    }
                    onClick={() => runChange('revoked')}
                    className={`${sdsMenuItemBtn} ${smsConsentStatus === 'revoked' ? 'text-[#aaaaaa]' : ''}`}
                  >
                    Set SMS consent: Revoked
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export function CandidateDetailSidebar({
  detail,
  communicationsLayout = false,
  showConsentActions = false,
  onSmsConsentChange,
  smsConsentUpdating = false,
}: Props) {
  const otherCount = detail.otherJobs.length
  const smsStatus = detail.sms_consent_status

  return (
    <aside className="w-full shrink-0 space-y-4 lg:w-[300px]">
      {!communicationsLayout ? (
        <>
          <section className="border border-[#e0e0e0] bg-white">
            <h2 className="px-4 py-3 text-title-xs font-medium text-[#131313]">Tags</h2>
            <div className="px-4 py-3 text-body-m text-[#4d4d4d]">
              <p>No tags added yet.</p>
            </div>
          </section>

          <section className="border border-[#e0e0e0] bg-white">
            <h2 className="px-4 py-3 text-title-xs font-medium text-[#131313]">Skills</h2>
            <div className="px-4 py-3 text-body-m text-[#4d4d4d]">
              <p>Not specified</p>
            </div>
          </section>

          <section className="border border-[#e0e0e0] bg-white">
            <h2 className="px-4 py-3 text-title-xs font-medium text-[#131313]">Feedback</h2>
            <div className="px-4 py-3 text-body-m text-[#4d4d4d]">
              <p>No feedback recorded.</p>
            </div>
          </section>
        </>
      ) : null}

      <ConsentWidget
        smsConsentStatus={smsStatus}
        showConsentActions={showConsentActions}
        onSmsConsentChange={onSmsConsentChange}
        smsConsentUpdating={smsConsentUpdating}
      />

      <section className="border border-[#e0e0e0] bg-white">
        <h2 className="px-4 py-3 text-title-xs font-medium text-[#131313]">
          Other Applied Jobs ({otherCount})
        </h2>
        {otherCount === 0 ? (
          <p className="px-4 py-3 text-body-m text-[#4d4d4d]">No other applications.</p>
        ) : (
          <ul className="divide-y divide-[#e0e0e0]">
            {detail.otherJobs.map((j) => (
              <li key={j.id} className="px-4 py-3 text-body-m text-[#4d4d4d]">
                <div>{j.title} ( {j.jobCode} )</div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-sds-4 bg-[var(--yellow-50)] px-2 py-0.5 text-body-s font-medium text-[var(--charcoal-600)]">
                    {j.statusLabel}
                  </span>
                  <span className="text-body-s text-[#4d4d4d]">Applied On {j.appliedOn}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  )
}
