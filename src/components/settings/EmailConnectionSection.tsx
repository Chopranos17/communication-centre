import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2, Mail } from 'lucide-react'

import { usePersona } from '../../context/PersonaContext'
import { PERSONA_TO_USER_ID } from '../../constants/personaUserIds'
import {
  disconnectConnectedEmail,
  fetchEmailConnectionStatus,
  type EmailConnectionStatusResponse,
} from '../../api/candidatesClient'
import { useToast } from '../../contexts/ToastContext'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { sdsButtonSecondary, sdsButtonTheme } from '../../lib/sdsButtonClasses'

const SECTION_CARD =
  'rounded-sds-12 border-[0.5px] border-[#e0e0e0] bg-white p-5 shadow-[var(--elevation-1)]'

function formatRelativeTimeAgo(iso: string | null): string {
  if (!iso) return 'Never synced'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '—'
  const sec = Math.floor((Date.now() - t) / 1000)
  if (sec < 45) return 'just now'
  if (sec < 3600) {
    const min = Math.floor(sec / 60)
    return `${min} minute${min === 1 ? '' : 's'} ago`
  }
  if (sec < 86400) {
    const hr = Math.floor(sec / 3600)
    return `${hr} hour${hr === 1 ? '' : 's'} ago`
  }
  const day = Math.floor(sec / 86400)
  return `${day} day${day === 1 ? '' : 's'} ago`
}

function providerLabel(p: string): string {
  const x = p.trim().toLowerCase()
  if (x === 'google') return 'Gmail'
  if (x === 'microsoft') return 'Outlook'
  return p
}

export function EmailConnectionSection() {
  const { persona, canManageRecruitment } = usePersona()
  const { showToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const userId = useMemo(() => {
    if (!canManageRecruitment) return null
    if (persona === 'recruiter' || persona === 'hiring_lead') {
      return PERSONA_TO_USER_ID[persona]
    }
    return null
  }, [canManageRecruitment, persona])

  const [status, setStatus] = useState<
    | { kind: 'loading' }
    | { kind: 'error'; message: string }
    | { kind: 'ready'; data: EmailConnectionStatusResponse }
  >({ kind: 'loading' })
  const [disconnecting, setDisconnecting] = useState(false)

  const loadStatus = useCallback(async () => {
    if (!userId) return
    setStatus({ kind: 'loading' })
    try {
      const data = await fetchEmailConnectionStatus(userId)
      setStatus({ kind: 'ready', data })
    } catch {
      setStatus({ kind: 'error', message: 'Could not load email connection.' })
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    void loadStatus()
  }, [userId, loadStatus])

  useEffect(() => {
    const ok = searchParams.get('email_oauth')
    const err = searchParams.get('email_oauth_error')
    if (!ok && !err) return

    if (ok === 'success') {
      showToast('success', 'Gmail connected successfully')
    } else if (err) {
      const detail = searchParams.get('email_oauth_message')?.trim()
      showToast(
        'error',
        detail ? `Email connection failed: ${detail}` : 'Email connection failed',
      )
    }

    const next = new URLSearchParams(searchParams)
    next.delete('email_oauth')
    next.delete('email_oauth_error')
    next.delete('email_oauth_message')
    setSearchParams(next, { replace: true })
    void loadStatus()
  }, [searchParams, setSearchParams, showToast, loadStatus])

  const onDisconnect = useCallback(async () => {
    if (status.kind !== 'ready' || !status.data.connected) return
    setDisconnecting(true)
    try {
      await disconnectConnectedEmail(status.data.connectedEmailId)
      showToast('success', 'Email disconnected')
      await loadStatus()
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Disconnect failed')
    } finally {
      setDisconnecting(false)
    }
  }, [status, loadStatus, showToast])

  const connectGoogleUrl = userId
    ? `/api/auth/email/connect/google?userId=${encodeURIComponent(userId)}`
    : ''

  if (!userId) {
    return (
      <section className={SECTION_CARD} aria-labelledby="email-conn-heading">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sds-8 bg-[#F0F7FF] text-[#0183FF]">
            <Mail size={22} strokeWidth={1.8} aria-hidden />
          </div>
          <div className="min-w-0">
            <h2
              id="email-conn-heading"
              className="text-[length:var(--body-l)] font-semibold text-[var(--text-title)]"
            >
              Email connection
            </h2>
            <p className="mt-1 text-[13px] leading-snug text-[#4d4d4d]">
              Switch to the Recruiter or Hiring lead persona to connect your Gmail inbox.
            </p>
          </div>
        </div>
      </section>
    )
  }

  const ready = status.kind === 'ready' ? status.data : null

  return (
    <section className={SECTION_CARD} aria-labelledby="email-conn-heading">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sds-8 bg-[#F0F7FF] text-[#0183FF]">
          <Mail size={22} strokeWidth={1.8} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2
            id="email-conn-heading"
            className="text-[length:var(--body-l)] font-semibold text-[var(--text-title)]"
          >
            Email connection
          </h2>
          <p className="mt-1 text-[13px] leading-snug text-[#4d4d4d]">
            Connect your Gmail account to send candidate emails from your own address instead of
            the system sender. Inbound replies can sync to your inbox when inbox sync is enabled.
          </p>
        </div>
      </div>

      {status.kind === 'loading' ? (
        <div className="flex items-center gap-2 text-[13px] text-[#4d4d4d]">
          <LoadingSpinner size="sm" aria-hidden />
          Checking connection…
        </div>
      ) : status.kind === 'error' ? (
        <p className="text-[13px] text-[#d32f2f]" role="alert">
          {status.message}
        </p>
      ) : ready && !ready.connected ? (
        <div className="space-y-4">
          <p className="text-[13px] leading-relaxed text-[#4d4d4d]">
            You are not connected. Connecting lets you send one-to-one emails from your Gmail
            address and improves deliverability for personal outreach.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={sdsButtonTheme}
              onClick={() => {
                window.location.assign(connectGoogleUrl)
              }}
            >
              Connect Gmail
            </button>
            <button
              type="button"
              className={`${sdsButtonSecondary} cursor-not-allowed opacity-60`}
              disabled
              title="Coming soon"
            >
              Connect Outlook
            </button>
          </div>
        </div>
      ) : ready && ready.connected ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex items-center gap-2 text-[#1D9E75]">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full bg-[#1D9E75]"
                aria-hidden
              />
              <CheckCircle2 className="h-5 w-5 shrink-0" strokeWidth={1.8} aria-hidden />
              <span className="text-[15px] font-semibold text-[#131313]">
                {ready.email}
              </span>
              <span className="rounded-full bg-[#E8F0FE] px-2 py-0.5 text-[11px] font-medium text-[#014F99]">
                {providerLabel(ready.provider)}
              </span>
            </div>
          </div>
          <p className="text-[12px] text-[#888]">
            Last inbox sync: {formatRelativeTimeAgo(ready.lastSyncAt)}
          </p>
          <div>
            <button
              type="button"
              className={sdsButtonSecondary}
              disabled={disconnecting}
              onClick={() => void onDisconnect()}
            >
              {disconnecting ? <LoadingSpinner size="sm" aria-hidden /> : 'Disconnect'}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
