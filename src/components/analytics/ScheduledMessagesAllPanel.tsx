import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  fetchScheduledMessagesPage,
  type ScheduledMessageDto,
} from '../../api/commsHubDashboardClient'
import { sdsButtonSecondarySm } from '../../lib/sdsButtonClasses'
import {
  sdsSidePanelBackdropButton,
  sdsSidePanelRoot,
} from '../../lib/sdsModalClasses'
import { ScheduledMessageOverflowMenu } from './ScheduledMessageOverflowMenu'
import { ScheduledMessageRowView } from './ScheduledMessageRowView'

const shell460 =
  'relative z-10 flex h-full min-h-0 w-full max-w-[min(100vw,460px)] flex-col overflow-hidden border-l border-[#e0e0e0] bg-white shadow-sds-3'

type Props = {
  open: boolean
  onClose: () => void
  period: string
  jobOpeningId?: string
  totalQueued: number
  onEditEmail: (item: ScheduledMessageDto) => void | Promise<void>
  onMutated: () => void | Promise<void>
  panelEntered: boolean
  canManageRecruitment?: boolean
}

const PAGE_SIZE = 20

export function ScheduledMessagesAllPanel({
  open,
  onClose,
  period,
  jobOpeningId,
  totalQueued,
  onEditEmail,
  onMutated,
  panelEntered,
  canManageRecruitment = false,
}: Props) {
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<ScheduledMessageDto[]>([])
  const [total, setTotal] = useState(0)
  const [queuedLabel, setQueuedLabel] = useState(totalQueued)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchScheduledMessagesPage({
        period,
        jobOpeningId,
        page,
        limit: PAGE_SIZE,
      })
      setItems(data.items)
      setTotal(data.total)
      setQueuedLabel(data.total)
    } catch (e) {
      setItems([])
      setTotal(0)
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [period, jobOpeningId, page])

  useEffect(() => {
    if (!open) return
    void load()
  }, [open, load])

  useEffect(() => {
    if (open) setPage(1)
  }, [open, period, jobOpeningId])

  useEffect(() => {
    if (!open) {
      setQueuedLabel(totalQueued)
      return
    }
    setQueuedLabel(totalQueued)
  }, [open, totalQueued])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const canPrev = page > 1
  const canNext = page < totalPages

  const handleMutated = async () => {
    await onMutated()
    await load()
  }

  if (!open) return null

  return createPortal(
    <div className={sdsSidePanelRoot} role="dialog" aria-modal="true" aria-labelledby="scheduled-all-title">
      <button
        type="button"
        className={sdsSidePanelBackdropButton}
        aria-label="Close panel"
        onClick={onClose}
      />
      <div
        className={[
          shell460,
          'transition-transform duration-200 ease-out',
          panelEntered ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shrink-0 border-b border-[#e0e0e0] px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 id="scheduled-all-title" className="text-[14px] font-medium leading-tight text-[#131313]">
                Scheduled messages
              </h2>
              <p className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#185FA5]">
                <span
                  className="h-[5px] w-[5px] shrink-0 rounded-full bg-[#378ADD]"
                  aria-hidden
                />
                {queuedLabel} queued
              </p>
            </div>
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sds-4 text-[#4d4d4d] transition-colors hover:bg-[#f5f5f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0183FF] focus-visible:ring-offset-1"
              aria-label="Close"
              onClick={onClose}
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
          </div>
        </header>
        <div className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto px-4">
          {error ? (
            <p className="py-8 text-center text-[length:var(--body-m)] text-[#d32f2f]" role="alert">
              {error}
            </p>
          ) : loading ? (
            <ul className="mt-0 list-none p-0">
              {Array.from({ length: 6 }, (_, i) => (
                <li
                  key={i}
                  className="border-b-[0.5px] border-[#e0e0e0] last:border-b-0"
                >
                  <div className="flex animate-pulse items-center gap-2.5 py-3">
                    <div className="h-8 w-[54px] shrink-0 rounded-sds-2 bg-[var(--charcoal-50)]" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-3 w-[40%] rounded-sds-2 bg-[var(--charcoal-50)]" />
                      <div className="h-3 w-[70%] rounded-sds-2 bg-[var(--charcoal-50)]" />
                    </div>
                    <div className="h-6 w-14 shrink-0 rounded-full bg-[var(--charcoal-50)]" />
                    <div className="h-8 w-8 shrink-0 bg-[var(--charcoal-50)]" />
                  </div>
                </li>
              ))}
            </ul>
          ) : items.length === 0 ? (
            <p className="py-12 text-center text-[length:var(--body-m)] text-[#4d4d4d]">
              No scheduled messages.
            </p>
          ) : (
            <ul className="mt-0 list-none p-0">
              {items.map((item) => (
                <li
                  key={`${item.communicationId}-${item.scheduledAt}`}
                  className="border-b-[0.5px] border-[#e0e0e0] last:border-b-0"
                >
                  <ScheduledMessageRowView
                    item={item}
                    trailing={
                      canManageRecruitment ? (
                        <ScheduledMessageOverflowMenu
                          item={item}
                          onEditEmail={onEditEmail}
                          onMutated={handleMutated}
                        />
                      ) : null
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
        {!loading && !error && total > PAGE_SIZE ? (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[#e0e0e0] px-4 py-3">
            <p className="text-[12px] text-[#4d4d4d]">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={sdsButtonSecondarySm}
                disabled={!canPrev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <button
                type="button"
                className={sdsButtonSecondarySm}
                disabled={!canNext}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
