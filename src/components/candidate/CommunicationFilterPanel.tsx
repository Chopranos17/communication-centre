import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { CommunicationFilters } from "../../utils/communicationsTimelineFilter";
import { DEFAULT_COMMUNICATION_FILTERS } from "../../utils/communicationsTimelineFilter";

/**
 * Filter payload for the panel (single source of truth: `communicationsTimelineFilter.ts`).
 *
 * ```ts
 * sortBy: 'newest' | 'oldest'
 * direction: 'all' | 'outbound' | 'inbound'
 * deliveryStatus: 'all' | 'sent' | 'delivered' | 'failed' | 'pending'
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
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
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

  const panel = (
    <>
      <div
        className={[
          "fixed inset-0 z-[100] bg-black/30 transition-opacity duration-300 ease-in-out",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        aria-hidden={!isOpen}
        onClick={onClose}
      />
      <aside
        className={[
          "fixed inset-y-0 right-0 z-[101] flex w-full max-w-[420px] flex-col border-l border-gray-200/60 bg-white shadow-[var(--elevation-2)] transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "pointer-events-none translate-x-full",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="comm-filter-panel-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-gray-200/60 px-6 py-4">
          <h2
            id="comm-filter-panel-title"
            className="text-lg font-semibold text-gray-900"
          >
            Sort and Filters
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
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

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className={sectionClass}>
            <p className="mb-2 text-sm font-medium text-gray-700">Sort by</p>
            <div className="flex flex-col gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
                <input
                  type="radio"
                  name="comm-sort"
                  checked={draft.sortBy === "newest"}
                  onChange={() => setDraft((d) => ({ ...d, sortBy: "newest" }))}
                  className="h-4 w-4 border-gray-300 text-gray-900"
                />
                Latest first
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
                <input
                  type="radio"
                  name="comm-sort"
                  checked={draft.sortBy === "oldest"}
                  onChange={() => setDraft((d) => ({ ...d, sortBy: "oldest" }))}
                  className="h-4 w-4 border-gray-300 text-gray-900"
                />
                Oldest first
              </label>
            </div>
          </div>

          <div className={sectionClass}>
            <p className="mb-2 text-sm font-medium text-gray-700">Direction</p>
            <div className="flex flex-col gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
                <input
                  type="radio"
                  name="comm-direction"
                  checked={draft.direction === "all"}
                  onChange={() =>
                    setDraft((d) => ({ ...d, direction: "all" }))
                  }
                  className="h-4 w-4 border-gray-300 text-gray-900"
                />
                All
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
                <input
                  type="radio"
                  name="comm-direction"
                  checked={draft.direction === "outbound"}
                  onChange={() =>
                    setDraft((d) => ({ ...d, direction: "outbound" }))
                  }
                  className="h-4 w-4 border-gray-300 text-gray-900"
                />
                Outbound
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
                <input
                  type="radio"
                  name="comm-direction"
                  checked={draft.direction === "inbound"}
                  onChange={() =>
                    setDraft((d) => ({ ...d, direction: "inbound" }))
                  }
                  className="h-4 w-4 border-gray-300 text-gray-900"
                />
                Inbound
              </label>
            </div>
          </div>

          <div className={sectionClass}>
            <label
              htmlFor="comm-delivery-status"
              className="mb-2 block text-sm font-medium text-gray-700"
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
                className="w-full appearance-none rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm text-gray-900"
              >
                <option value="all">All</option>
                <option value="sent">Sent</option>
                <option value="delivered">Delivered</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
              {selectChevron()}
            </div>
          </div>

          <div className={sectionClass}>
            <label
              htmlFor="comm-date-range"
              className="mb-2 block text-sm font-medium text-gray-700"
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
                className="w-full appearance-none rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm text-gray-900"
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
              className="mb-2 block text-sm font-medium text-gray-700"
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
                className="w-full appearance-none rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm text-gray-900"
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

        <footer className="shrink-0 border-t border-gray-200/60 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pt-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={resetDraftToDefault}
              className="cursor-pointer text-left text-sm text-gray-500 hover:underline"
            >
              Reset to default
            </button>
            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyDraft}
                className="rounded-md bg-gray-900 px-6 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Apply
              </button>
            </div>
          </div>
        </footer>
      </aside>
    </>
  );

  return createPortal(panel, document.body);
}
