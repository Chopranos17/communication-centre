import { useEffect, useRef, useState } from 'react'
import type { CandidateDetail } from '../../api/candidatesClient'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

type Props = {
  detail: CandidateDetail
  onSendSms?: () => void
  onSendWhatsApp?: () => void
  smsDisabled?: boolean
  whatsappDisabled?: boolean
  smsDisabledTitle?: string
  whatsappDisabledTitle?: string
  /** When false, hides SMS/WhatsApp actions (e.g. Candidate persona read-only). */
  showCommunicationActions?: boolean
}

export function CandidateDetailHeader({
  detail,
  onSendSms,
  onSendWhatsApp,
  smsDisabled = false,
  whatsappDisabled = false,
  smsDisabledTitle,
  whatsappDisabledTitle,
  showCommunicationActions = true,
}: Props) {
  const [actionsOpen, setActionsOpen] = useState(false)
  const actionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!actionsOpen) return
    const close = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setActionsOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [actionsOpen])
  const jobLine =
    detail.currentJob != null
      ? `${detail.currentJob.title} (Job Code : ${detail.currentJob.jobCode}) | Job Match Score: ${detail.jobMatchScore}`
      : `No current job | Job Match Score: ${detail.jobMatchScore}`

  return (
    <>
      <div
        className="rounded-t-[var(--radius-md)] px-5 py-5 sm:px-6"
        style={{ background: 'var(--header-banner-bg)' }}
      >
        <div className="flex flex-wrap items-start gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--white)] text-[length:var(--title-xs)] font-bold text-[var(--charcoal-700)]"
            style={{ fontWeight: 'var(--font-weight-bold)' }}
            aria-hidden
          >
            {initials(detail.name)}
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 gap-y-1">
                <h1
                  className="text-[length:var(--title-m)] leading-10 text-[var(--text-negative)]"
                  style={{ fontWeight: 'var(--font-weight-bold)' }}
                >
                  {detail.name}
                </h1>
                <span className="inline-flex rounded-md bg-[var(--yellow-50)] px-2 py-0.5 text-[length:var(--body-s)] font-medium text-[var(--charcoal-600)]">
                  {detail.statusLabel}
                </span>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-1 text-[length:var(--body-m)] leading-6 text-[var(--text-negative)] opacity-95">
                <span>{jobLine}</span>
                <button
                  type="button"
                  className="inline-flex h-5 w-5 items-center justify-center rounded text-[var(--blue-100)] hover:bg-[var(--blue-600)]"
                  aria-label="Job match score information"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                  </svg>
                </button>
              </p>
            </div>
            {showCommunicationActions ? (
              <div className="relative shrink-0" ref={actionsRef}>
                <button
                  type="button"
                  onClick={() => setActionsOpen((o) => !o)}
                  className="flex h-9 w-9 items-center justify-center rounded text-[var(--blue-100)] hover:bg-[var(--blue-600)]"
                  aria-expanded={actionsOpen}
                  aria-haspopup="menu"
                  aria-label="Candidate actions"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                  </svg>
                </button>
                {actionsOpen ? (
                  <div
                    className="absolute right-0 z-20 mt-1 min-w-[11rem] rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)] py-1 shadow-[var(--elevation-2)]"
                    role="menu"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      disabled={smsDisabled || !onSendSms}
                      title={smsDisabled ? smsDisabledTitle : undefined}
                      onClick={() => {
                        if (!smsDisabled && onSendSms) {
                          onSendSms()
                          setActionsOpen(false)
                        }
                      }}
                      className="block w-full px-4 py-2 text-left text-[length:var(--body-m)] text-[var(--text-body)] hover:bg-[var(--charcoal-10)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Send SMS
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      disabled={whatsappDisabled || !onSendWhatsApp}
                      title={whatsappDisabled ? whatsappDisabledTitle : undefined}
                      onClick={() => {
                        if (!whatsappDisabled && onSendWhatsApp) {
                          onSendWhatsApp()
                          setActionsOpen(false)
                        }
                      }}
                      className="block w-full px-4 py-2 text-left text-[length:var(--body-m)] text-[var(--text-body)] hover:bg-[var(--charcoal-10)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Send WhatsApp
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border border-t-0 border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-3 text-[length:var(--body-m)] sm:px-6">
        <span className="inline-flex items-center gap-1.5 text-[var(--text-body)]">
          <svg
            className="shrink-0 text-[var(--icon-default)]"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
          >
            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.21z" />
          </svg>
          {detail.phone || '—'}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[var(--text-body)]">
          <svg
            className="shrink-0 text-[var(--icon-default)]"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
          >
            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
          </svg>
          {detail.email}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[var(--text-body)]">
          <svg
            className="shrink-0 text-[var(--icon-default)]"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
          >
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
          </svg>
          {detail.appliedDateDisplay}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[var(--text-body)]">
          <svg
            className="shrink-0 text-[var(--icon-default)]"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
          >
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
          </svg>
          {detail.sourceLabel}
        </span>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[length:var(--body-m)] font-medium text-[var(--text-link)] hover:text-[var(--text-link-hover)] hover:underline"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
          </svg>
          ({detail.name.split(/\s+/).slice(0, 2).join(' ')})
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[length:var(--body-m)] font-medium text-[var(--text-link)] hover:text-[var(--text-link-hover)] hover:underline"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          Add Tags
        </button>
      </div>
    </>
  )
}
