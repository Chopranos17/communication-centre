import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { CurrentJobEmailRow } from "../../api/candidatesClient";
import {
  formatEmailDetailDateTime,
  stripHtml,
} from "../../utils/communicationTimeline";

type EmailDetailModalProps = {
  email: CurrentJobEmailRow | null;
  onClose: () => void;
};

function DeliveryStatusIcon({ status }: { status: CurrentJobEmailRow["deliveryStatus"] }) {
  if (status === "delivered") {
    return (
      <span
        className="inline-flex items-center gap-0.5 text-[var(--blue-500)]"
        title="Delivered"
        aria-label="Delivered"
      >
        <span aria-hidden>✓</span>
        <span aria-hidden className="-ml-1.5">
          ✓
        </span>
      </span>
    );
  }
  if (status === "sent") {
    return (
      <span className="text-[var(--charcoal-400)]" title="Sent" aria-label="Sent">
        ✓
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="text-[var(--red-500)]" title="Failed" aria-label="Failed">
        ✕
      </span>
    );
  }
  return (
    <span
      className="text-[length:var(--body-s)] font-medium text-[var(--charcoal-300)]"
      title="Pending"
    >
      Pending
    </span>
  );
}

export function EmailDetailModal({ email, onClose }: EmailDetailModalProps) {
  const open = email != null;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!email) return null;

  const subjectLine = email.subject?.trim() || "(No subject)";
  const bodyDisplay = stripHtml(email.body);

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-detail-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 z-0 bg-[var(--bg-overlay)]"
        aria-label="Close email details"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex h-full w-full max-w-[500px] flex-col bg-[var(--bg-surface)] shadow-[var(--elevation-3)]"
        style={{ minWidth: "min(100%, 450px)" }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
          <h2
            id="email-detail-modal-title"
            className="text-[length:var(--title-xxs)] font-bold text-[var(--text-title)]"
            style={{ fontWeight: "var(--font-weight-bold)" }}
          >
            Email details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded text-[var(--charcoal-400)] hover:bg-[var(--charcoal-10)] hover:text-[var(--text-body)]"
            aria-label="Close"
          >
            <span className="text-xl leading-none" aria-hidden>
              ×
            </span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <dl className="space-y-4 text-[length:var(--body-m)]">
            <div>
              <dt className="mb-1 font-medium text-[var(--text-label)]">From</dt>
              <dd className="break-all font-light text-[var(--text-body)]">
                {email.fromAddress || "—"}
              </dd>
            </div>
            <div>
              <dt className="mb-1 font-medium text-[var(--text-label)]">To</dt>
              <dd className="break-all font-light text-[var(--text-body)]">
                {email.toAddress || "—"}
              </dd>
            </div>
            <div>
              <dt className="mb-1 font-medium text-[var(--text-label)]">Subject</dt>
              <dd className="break-words font-light text-[var(--text-body)]">{subjectLine}</dd>
            </div>
            <div>
              <dt className="mb-1 font-medium text-[var(--text-label)]">Time</dt>
              <dd className="flex flex-wrap items-center gap-2 font-light text-[var(--text-body)]">
                <span>{formatEmailDetailDateTime(email.sentAt)}</span>
                <DeliveryStatusIcon status={email.deliveryStatus} />
              </dd>
            </div>
            <div>
              <dt className="mb-1 font-medium text-[var(--text-label)]">Message</dt>
              <dd className="whitespace-pre-wrap break-words font-light leading-relaxed text-[var(--text-body)]">
                {bodyDisplay || "—"}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
