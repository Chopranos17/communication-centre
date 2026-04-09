import type { EmailDeliveryStatus } from "../../api/candidatesClient";
import { formatScheduledSendLabel } from "../../utils/communicationTimeline";

type Props = {
  status: EmailDeliveryStatus;
  /** Used when status is `scheduled` (timeline tooltip). */
  scheduledForIso?: string | null;
  className?: string;
  /** Compact size for timeline rows (w-3.5 h-3.5). */
  size?: "sm" | "md";
};

/**
 * Delivery indicators: sent (gray ✓), delivered (blue ✓✓), pending (clock), failed (✕),
 * scheduled (purple clock), cancelled (muted). Task 17 + scheduled send.
 */
export function DeliveryStatusGlyph({
  status,
  scheduledForIso,
  className,
  size = "md",
}: Props) {
  const wrap = `inline-flex shrink-0 items-center justify-center ${className ?? ""}`;
  const sm = size === "sm";

  if (status === "scheduled") {
    const title = scheduledForIso
      ? formatScheduledSendLabel(scheduledForIso)
      : "Scheduled";
    return (
      <span className={wrap} title={title} aria-label={title}>
        <svg
          viewBox="0 0 24 24"
          className={
            sm
              ? "h-3.5 w-3.5 text-[#5B21B6]"
              : "h-3.5 w-3.5 text-[#5B21B6]"
          }
          fill="currentColor"
          aria-hidden
        >
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
        </svg>
      </span>
    );
  }

  if (status === "cancelled") {
    return (
      <span className={wrap} title="Cancelled" aria-label="Cancelled">
        <svg
          viewBox="0 0 24 24"
          className={
            sm ? "h-3.5 w-3.5 text-[#aaaaaa]" : "h-3.5 w-3.5 text-[#aaaaaa]"
          }
          fill="currentColor"
          aria-hidden
        >
          <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
        </svg>
      </span>
    );
  }

  if (status === "delivered") {
    return (
      <span className={wrap} title="Delivered" aria-label="Delivered">
        <svg
          viewBox="0 0 18 14"
          className={sm ? "h-3.5 w-3.5 text-[#0183FF]" : "h-[14px] w-[18px] text-[var(--blue-500)]"}
          aria-hidden
          fill="none"
        >
          <path
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M1 7l4 4 8-9"
          />
          <path
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 7l4 4 8-9"
          />
        </svg>
      </span>
    );
  }
  if (status === "sent") {
    return (
      <span className={wrap} title="Sent" aria-label="Sent">
        <svg
          viewBox="0 0 14 14"
          className={sm ? "h-3.5 w-3.5 text-[#aaaaaa]" : "h-[14px] w-[14px] text-[var(--charcoal-400)]"}
          aria-hidden
          fill="none"
        >
          <path
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M1 7l4 4 8-9"
          />
        </svg>
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className={wrap} title="Failed" aria-label="Failed">
        <svg
          viewBox="0 0 24 24"
          className={sm ? "h-3.5 w-3.5 text-[#d32f2f]" : "h-[14px] w-[14px] text-[var(--red-500)]"}
          aria-hidden
          fill="currentColor"
        >
          <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
        </svg>
      </span>
    );
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-0.5 text-[#aaaaaa] ${sm ? "text-[11px]" : "text-[length:10px] font-semibold uppercase tracking-wide text-[var(--charcoal-400)]"} ${className ?? ""}`}
      title="Pending"
      aria-label="Pending delivery"
    >
      <svg
        viewBox="0 0 24 24"
        className={sm ? "h-3.5 w-3.5" : "h-3 w-3"}
        fill="currentColor"
        aria-hidden
      >
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
      </svg>
      {!sm ? <span className="hidden sm:inline">Pending</span> : null}
    </span>
  );
}
