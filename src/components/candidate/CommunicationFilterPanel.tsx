import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { CommunicationFilters } from "../../utils/communicationsTimelineFilter";
import { DEFAULT_COMMUNICATION_FILTERS } from "../../utils/communicationsTimelineFilter";
import {
  sdsButtonLink,
  sdsButtonPrimary,
  sdsButtonSecondary,
} from "../../lib/sdsButtonClasses";
import {
  sdsModalBody,
  sdsModalCloseButton,
  sdsModalFooterToolbar,
  sdsModalHeader,
  sdsModalTitle,
  sdsSidePanelBackdropButton,
  sdsSidePanelContainerNarrow,
  sdsSidePanelRoot,
} from "../../lib/sdsModalClasses";
import { sdsLabel, sdsSelectWFull } from "../../lib/sdsFormClasses";

/**
 * Filter payload for the panel (single source of truth: `communicationsTimelineFilter.ts`).
 *
 * ```ts
 * sortBy: 'newest' | 'oldest'
 * direction: 'all' | 'outbound' | 'inbound'
 * deliveryStatus: 'all' | 'sent' | 'delivered' | 'failed' | 'pending' | 'scheduled' | 'cancelled'
 * dateRange: 'all' | '7d' | '30d' | '90d'
 * senderType: 'all' | 'recruiter' | 'hiring_lead' | 'system' | 'candidate'
 * ```
 */
export type { CommunicationFilters };

export interface CommunicationFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: CommunicationFilters;
  onApply: (filters: CommunicationFilters) => void;
  onReset: () => void;
}

function selectChevron() {
  return (
    <span
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#4d4d4d]"
      aria-hidden
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M6 9l6 6 6-6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function CommunicationFilterPanel({
  isOpen,
  onClose,
  filters,
  onApply,
  onReset,
}: CommunicationFilterPanelProps) {
  const [draft, setDraft] = useState<CommunicationFilters>(filters);

  useEffect(() => {
    if (isOpen) setDraft(filters);
  }, [isOpen, filters]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const applyDraft = () => {
    onApply(draft);
    onClose();
  };

  const resetDraftToDefault = () => {
    setDraft({ ...DEFAULT_COMMUNICATION_FILTERS });
    onReset();
  };

  const sectionClass = "mb-6";

  if (!isOpen) return null;

  const panel = (
    <div
      className={sdsSidePanelRoot}
      role="dialog"
      aria-modal="true"
      aria-labelledby="comm-filter-panel-title"
    >
      <button
        type="button"
        className={sdsSidePanelBackdropButton}
        aria-label="Close filters"
        onClick={onClose}
      />
      <div
        className={sdsSidePanelContainerNarrow}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={sdsModalHeader}>
          <h2 id="comm-filter-panel-title" className={sdsModalTitle}>
            Sort and Filters
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={sdsModalCloseButton}
            aria-label="Close"
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

        <div className={sdsModalBody}>
          <div className={sectionClass}>
            <p className={`mb-2 ${sdsLabel}`}>Sort by</p>
            <div className="flex flex-col gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-body-s text-[#131313]">
                <input
                  type="radio"
                  name="comm-sort"
                  checked={draft.sortBy === "newest"}
                  onChange={() => setDraft((d) => ({ ...d, sortBy: "newest" }))}
                  className="h-4 w-4 border-[#e0e0e0] text-[#131313]"
                />
                Latest first
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-body-s text-[#131313]">
                <input
                  type="radio"
                  name="comm-sort"
                  checked={draft.sortBy === "oldest"}
                  onChange={() => setDraft((d) => ({ ...d, sortBy: "oldest" }))}
                  className="h-4 w-4 border-[#e0e0e0] text-[#131313]"
                />
                Oldest first
              </label>
            </div>
          </div>

          <div className={sectionClass}>
            <p className={`mb-2 ${sdsLabel}`}>Direction</p>
            <div className="flex flex-col gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-body-s text-[#131313]">
                <input
                  type="radio"
                  name="comm-direction"
                  checked={draft.direction === "all"}
                  onChange={() =>
                    setDraft((d) => ({ ...d, direction: "all" }))
                  }
                  className="h-4 w-4 border-[#e0e0e0] text-[#131313]"
                />
                All
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-body-s text-[#131313]">
                <input
                  type="radio"
                  name="comm-direction"
                  checked={draft.direction === "outbound"}
                  onChange={() =>
                    setDraft((d) => ({ ...d, direction: "outbound" }))
                  }
                  className="h-4 w-4 border-[#e0e0e0] text-[#131313]"
                />
                Outbound
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-body-s text-[#131313]">
                <input
                  type="radio"
                  name="comm-direction"
                  checked={draft.direction === "inbound"}
                  onChange={() =>
                    setDraft((d) => ({ ...d, direction: "inbound" }))
                  }
                  className="h-4 w-4 border-[#e0e0e0] text-[#131313]"
                />
                Inbound
              </label>
            </div>
          </div>

          <div className={sectionClass}>
            <label
              htmlFor="comm-delivery-status"
              className={`mb-2 block ${sdsLabel}`}
            >
              Delivery Status
            </label>
            <div className="relative">
              <select
                id="comm-delivery-status"
                value={draft.deliveryStatus}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    deliveryStatus: e.target
                      .value as CommunicationFilters["deliveryStatus"],
                  }))
                }
                className={`${sdsSelectWFull} appearance-none pr-10`}
              >
                <option value="all">All</option>
                <option value="sent">Sent</option>
                <option value="delivered">Delivered</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
                <option value="scheduled">Scheduled</option>
                <option value="cancelled">Cancelled</option>
              </select>
              {selectChevron()}
            </div>
          </div>

          <div className={sectionClass}>
            <label
              htmlFor="comm-date-range"
              className={`mb-2 block ${sdsLabel}`}
            >
              Date Range
            </label>
            <div className="relative">
              <select
                id="comm-date-range"
                value={draft.dateRange}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    dateRange: e.target
                      .value as CommunicationFilters["dateRange"],
                  }))
                }
                className={`${sdsSelectWFull} appearance-none pr-10`}
              >
                <option value="all">All time</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              {selectChevron()}
            </div>
          </div>

          <div className={sectionClass}>
            <label
              htmlFor="comm-sender-type"
              className={`mb-2 block ${sdsLabel}`}
            >
              Sender
            </label>
            <div className="relative">
              <select
                id="comm-sender-type"
                value={draft.senderType}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    senderType: e.target
                      .value as CommunicationFilters["senderType"],
                  }))
                }
                className={`${sdsSelectWFull} appearance-none pr-10`}
              >
                <option value="all">All</option>
                <option value="recruiter">Recruiter</option>
                <option value="hiring_lead">Hiring Lead</option>
                <option value="system">System</option>
                <option value="candidate">Candidate</option>
              </select>
              {selectChevron()}
            </div>
          </div>
        </div>

        <footer className={sdsModalFooterToolbar}>
          <button
            type="button"
            onClick={resetDraftToDefault}
            className={`${sdsButtonLink} text-left`}
          >
            Reset to default
          </button>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`${sdsButtonSecondary} px-6`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={applyDraft}
              className={`${sdsButtonPrimary} px-6`}
            >
              Apply
            </button>
          </div>
        </footer>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
