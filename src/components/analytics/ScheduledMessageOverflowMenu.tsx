import { useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  cancelScheduledCommunication,
  cancelScheduledMeeting,
  sendScheduledEmailNow,
} from '../../api/candidatesClient'
import type { ScheduledMessageDto } from '../../api/commsHubDashboardClient'
import { useToast } from '../../contexts/ToastContext'

const linkFocusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-[#0183FF] focus-visible:ring-offset-1'

const overflowBtnClass = [
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-none',
  'border-0 bg-transparent text-[#797979] transition-colors',
  'text-[18px] font-bold leading-none tracking-tight',
  'hover:bg-[var(--color-background-secondary)] hover:text-[#131313]',
  linkFocusRing,
].join(' ')

const menuClass =
  'absolute right-0 top-full z-[60] mt-0.5 min-w-[200px] rounded-none border-[0.5px] border-[var(--border-tertiary)] bg-white py-1 shadow-[var(--elevation-2)]'

const menuItemClass =
  'flex w-full items-center px-[14px] py-2 text-left text-[12px] text-[#131313] transition-colors hover:bg-[var(--color-background-secondary)]'

type Props = {
  item: ScheduledMessageDto
  onEditEmail: (item: ScheduledMessageDto) => void | Promise<void>
  onMutated: () => void | Promise<void>
  disabled?: boolean
}

export function ScheduledMessageOverflowMenu({
  item,
  onEditEmail,
  onMutated,
  disabled = false,
}: Props) {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const menuId = useId()
  const menuRootId = `scheduled-msg-menu-${item.communicationId}`

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const root = document.querySelector(`[data-scheduled-overflow="${menuRootId}"]`)
      if (root && !root.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open, menuRootId])

  const isEmail = item.channel === 'email'
  const isMeetingRow = item.meetingId != null

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    try {
      await fn()
      setOpen(false)
      await onMutated()
    } finally {
      setBusy(false)
    }
  }

  const handleEdit = () => {
    setOpen(false)
    if (isEmail) {
      void onEditEmail(item)
      return
    }
    navigate(
      `/recruitment/candidates/${encodeURIComponent(item.candidateId)}?tab=communications`,
    )
  }

  const handleSendNow = () => {
    void run(async () => {
      const r = await sendScheduledEmailNow(item.communicationId)
      if (!r.ok) {
        showToast('error', r.error ?? 'Could not send')
        return
      }
      if (r.deliveryStatus === 'failed') {
        showToast('error', 'Email failed to send')
        return
      }
      showToast('success', 'Email sent')
    })
  }

  const handleCancel = () => {
    void run(async () => {
      if (isMeetingRow && item.meetingId) {
        const r = await cancelScheduledMeeting(item.meetingId)
        if (!r.ok) {
          showToast('error', r.error ?? 'Could not cancel')
          return
        }
        showToast('success', 'Meeting cancelled')
        return
      }
      const r = await cancelScheduledCommunication(item.communicationId)
      if (!r.ok) {
        showToast('error', r.error ?? 'Could not cancel')
        return
      }
      showToast('success', 'Scheduled send cancelled')
    })
  }

  return (
    <div className="relative shrink-0" data-scheduled-overflow={menuRootId}>
      <button
        type="button"
        className={overflowBtnClass}
        disabled={disabled || busy}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        aria-label="Scheduled message actions"
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden className="block translate-y-[-1px]">
          ⋮
        </span>
      </button>
      {open ? (
        <div id={menuId} className={menuClass} role="menu">
          <button
            type="button"
            role="menuitem"
            className={`${menuItemClass} ${linkFocusRing} rounded-none`}
            disabled={busy}
            onClick={handleEdit}
          >
            Edit and reschedule
          </button>
          {isEmail ? (
            <button
              type="button"
              role="menuitem"
              className={`${menuItemClass} ${linkFocusRing} rounded-none`}
              disabled={busy}
              onClick={handleSendNow}
            >
              Send now
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className={`${menuItemClass} ${linkFocusRing} rounded-none`}
            disabled={busy}
            onClick={handleCancel}
          >
            Cancel
          </button>
        </div>
      ) : null}
    </div>
  )
}
